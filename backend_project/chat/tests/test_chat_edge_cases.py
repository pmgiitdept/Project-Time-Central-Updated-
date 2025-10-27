# chat/tests/test_chat_edge_cases.py

import pytest
import uuid
from types import SimpleNamespace
from datetime import timedelta
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from chat.middleware import JWTAuthMiddleware, get_user_from_token
from chat.serializers import RoomSerializer, ChatMessageSerializer
from chat.models import Room
from accounts.tests.conftest import user_factory


# =========================
# JWT / Middleware Tests
# =========================

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_get_user_from_expired_token(user_factory):
    # Generate a unique username
    username = f"expired_user_{uuid.uuid4().hex[:8]}"
    user = await database_sync_to_async(user_factory)(username=username)
    
    # Create an already expired token
    token = AccessToken.for_user(user)
    token.set_exp(lifetime=timedelta(seconds=-10))
    
    retrieved_user = await get_user_from_token(str(token))
    assert retrieved_user is None


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_jwt_auth_middleware_expired_token(user_factory):
    # Generate a unique username for every test run
    username = f"expired_ws_user_{uuid.uuid4().hex[:8]}"
    user = await database_sync_to_async(user_factory)(username=username)

    token = AccessToken.for_user(user)
    token.set_exp(lifetime=timedelta(seconds=-10))

    async def dummy_inner(scope, receive, send):
        return None

    scope = {"type": "websocket", "query_string": f"token={token}".encode()}
    receive = send = lambda x: None
    middleware = JWTAuthMiddleware(dummy_inner)

    await middleware(scope, receive, send)

    # Expired token should result in AnonymousUser
    assert isinstance(scope["user"], AnonymousUser)

# =========================
# Room Serializer / Participation
# =========================

@pytest.mark.django_db
def test_room_is_joined(user_factory):
    # Create users
    creator = user_factory(username="creator")
    participant = user_factory(username="participant")
    outsider = user_factory(username="outsider")

    # Create room and add participants
    room = Room.objects.create(name="multi_participant", created_by=creator)
    room.participants.add(creator)      # make sure creator is included
    room.participants.add(participant)

    # Serialize with different users
    serializer_creator = RoomSerializer(
        room, context={"request": SimpleNamespace(user=creator)}
    )
    serializer_participant = RoomSerializer(
        room, context={"request": SimpleNamespace(user=participant)}
    )
    serializer_outsider = RoomSerializer(
        room, context={"request": SimpleNamespace(user=outsider)}
    )

    # Check is_joined property
    assert serializer_creator.data["is_joined"] is True
    assert serializer_participant.data["is_joined"] is True
    assert serializer_outsider.data["is_joined"] is False


# =========================
# ChatMessage Serializer Validation
# =========================

@pytest.mark.django_db
def test_chat_message_serializer_validation(user_factory):
    sender = user_factory(username="msg_sender")
    room = Room.objects.create(name="validation_room", created_by=sender)
    
    data = {"message": "", "room": room.id}  # invalid message
    serializer = ChatMessageSerializer(data=data, context={"request": SimpleNamespace(user=sender)})
    
    assert not serializer.is_valid()
    assert "message" in serializer.errors
