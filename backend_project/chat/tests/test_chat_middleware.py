import pytest
import uuid
from chat.middleware import JWTAuthMiddleware, get_user_from_token
from accounts.tests.conftest import user_factory
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_get_user_from_token_valid(user_factory):
    import uuid
    username = f"user_{uuid.uuid4().hex}"
    user = await database_sync_to_async(user_factory)(username=username)
    token = str(AccessToken.for_user(user))
    retrieved_user = await get_user_from_token(token)
    assert retrieved_user == user

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_get_user_from_token_invalid():
    retrieved_user = await get_user_from_token("invalidtoken")
    assert retrieved_user is None

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_jwt_auth_middleware_sets_user(user_factory):
    import uuid
    username = f"user_{uuid.uuid4().hex}"
    user = await database_sync_to_async(user_factory)(username=username)
    token = str(AccessToken.for_user(user))

    scope = {"type": "websocket", "query_string": f"token={token}".encode()}
    receive = send = lambda x: None

    async def dummy_app(scope, receive, send):
        return None

    middleware = JWTAuthMiddleware(dummy_app)
    await middleware(scope, receive, send)

    assert scope["user"] == user


@pytest.mark.asyncio
async def test_jwt_auth_middleware_anonymous():
    scope = {"type": "websocket", "query_string": b""}
    receive = send = lambda x: None

    async def dummy_app(scope, receive, send):
        return None

    middleware = JWTAuthMiddleware(dummy_app)
    await middleware(scope, receive, send)

    assert isinstance(scope["user"], AnonymousUser)
