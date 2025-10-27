import pytest
from django.utils import timezone
from chat.serializers import ChatMessageSerializer, RoomSerializer
from chat.models import Room, ChatMessage
from accounts.tests.conftest import user_factory


@pytest.mark.django_db
def test_chat_message_serializer(user_factory):
    user = user_factory(username="sender")
    room = Room.objects.create(name="testroom1", created_by=user)
    message = ChatMessage.objects.create(sender=user, room=room, message="Hello!")

    serializer = ChatMessageSerializer(message)
    data = serializer.data

    assert data["sender"] == "sender"
    assert data["message"] == "Hello!"
    assert "timestamp" in data
    assert data["room"] == room.id


@pytest.mark.django_db
def test_room_serializer_create_and_methods(user_factory, rf):
    user = user_factory(username="creator")
    request = rf.post("/")  # fake request
    request.user = user

    serializer_context = {"request": request}
    serializer = RoomSerializer(
        data={"name": "New Room"}, context=serializer_context
    )
    assert serializer.is_valid()
    room = serializer.save()

    # Room is created correctly
    assert room.name == "New Room"
    assert room.created_by == user
    assert user in room.participants.all()

    # Check read-only fields via serializer
    serialized = RoomSerializer(room, context=serializer_context).data
    assert serialized["created_by_username"] == "creator"
    assert serialized["is_joined"] is True
    assert serialized["passkey"] is not None  # creator can see passkey

    # Simulate another user
    other_user = user_factory(username="other")
    serializer_context_other = {"request": type("Req", (), {"user": other_user})()}
    serialized_other = RoomSerializer(room, context=serializer_context_other).data
    assert serialized_other["is_joined"] is False
    assert serialized_other["passkey"] is None
