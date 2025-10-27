import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from backend_project.asgi import application
from accounts.models import User
from chat.models import Room
from chat.consumers import ChatConsumer

# ✅ Middleware to inject a test user into the scope
class ForceAuthMiddleware:
    def __init__(self, inner, user):
        self.inner = inner
        self.user = user

    async def __call__(self, scope, receive, send):
        scope["user"] = self.user or AnonymousUser()
        return await self.inner(scope, receive, send)

@pytest.mark.asyncio
@pytest.mark.django_db
async def test_chat_consumer_connect():
    user, _ = await sync_to_async(User.objects.get_or_create)(
        username="tester", defaults={"password": "1234"}
    )
    room, _ = await sync_to_async(Room.objects.get_or_create)(
        name="testroom", defaults={"created_by": user}
    )

    # Instantiate communicator
    communicator = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/testroom/")

    # Inject the user and url_route AFTER creation
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_name": "testroom"}}

    connected, _ = await communicator.connect()
    print("🔹 Incoming connection:", communicator.scope.get("user"))
    assert connected