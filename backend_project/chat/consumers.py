# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatMessage, Room
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            print("❌ WS Auth failed:", self.user)
            await self.close(code=4001)
            return

        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Ensure room exists and the user is a participant
        await self.ensure_room_participation()

        # Add user to WebSocket group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"✅ {self.user.username} connected to {self.room_name}")

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        user = self.scope.get("user")
        room = getattr(self, "room_name", "unknown")
        print(f"{getattr(user, 'username', 'Anonymous')} disconnected from {room}")

    async def receive(self, text_data):
        """Receive a message from WebSocket."""
        data = json.loads(text_data)
        message = data.get("message", "").strip()
        if not message:
            return

        # Save message to DB
        chat_message = await self.save_message(message)

        # Broadcast to all participants in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": chat_message.id,
                "message": chat_message.message,
                "sender": self.user.username,
                "timestamp": chat_message.timestamp.isoformat(),
            }
        )

    async def chat_message(self, event):
        """Send a message to WebSocket clients."""
        await self.send(text_data=json.dumps({
            "id": event["id"],
            "sender": event["sender"],
            "message": event["message"],
            "timestamp": event["timestamp"],
        }))

    @database_sync_to_async
    def ensure_room_participation(self):
        """
        Ensure the room exists and the current user (and counterpart) are participants.
        Handles private rooms (room_<id1>_<id2>) and normal rooms.
        """
        if self.room_name.startswith("room_"):
            parts = self.room_name.split("_")
            if len(parts) == 3:
                user_ids = sorted([int(parts[1]), int(parts[2])])
                room, _ = Room.objects.get_or_create(
                    name=f"room_{user_ids[0]}_{user_ids[1]}",
                    defaults={"created_by": User.objects.get(id=user_ids[0])}
                )
                # Always ensure both users are participants
                for u in User.objects.filter(id__in=user_ids):
                    if not room.participants.filter(id=u.id).exists():
                        room.participants.add(u)
        else:
            room, _ = Room.objects.get_or_create(
                name=self.room_name,
                defaults={"created_by": self.user}
            )
            if not room.participants.filter(id=self.user.id).exists():
                room.participants.add(self.user)


    @database_sync_to_async
    def save_message(self, message):
        """Persist message to database."""
        # Determine room
        if self.room_name.startswith("room_"):
            parts = self.room_name.split("_")
            if len(parts) == 3:
                user_ids = sorted([int(parts[1]), int(parts[2])])
                room, created = Room.objects.get_or_create(
                    name=f"room_{user_ids[0]}_{user_ids[1]}",
                    defaults={"created_by": User.objects.get(id=user_ids[0])}
                )
                if created:
                    for u in User.objects.filter(id__in=user_ids):
                        room.participants.add(u)
        else:
            room = Room.objects.filter(name=self.room_name).first()
            if not room:
                raise ValueError(f"Room {self.room_name} does not exist")

        return ChatMessage.objects.create(room=room, sender=self.user, message=message)


class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("rooms", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("rooms", self.channel_name)

    async def room_created(self, event):
        await self.send_json({
            "type": "room_created",
            "room": event["room"],
        })
