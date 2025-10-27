# chat/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    """Return a User instance from JWT token or None."""
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        print(f"✅ JWTAuthMiddleware: Token decoded successfully. user_id={user_id}")
        return User.objects.get(id=user_id)
    except TokenError as e:
        print(f"❌ JWTAuthMiddleware: Token error - {e}")
        return None
    except User.DoesNotExist:
        print(f"❌ JWTAuthMiddleware: No user found for token.")
        return None
    except Exception as e:
        print(f"❌ JWTAuthMiddleware: Unexpected error - {e}")
        return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        print("🔹 Incoming WebSocket connection")
        print(f"🔹 Query string: {query_string}")
        print(f"🔹 Extracted token: {token[:20]}..." if token else "⚠️ No token provided")

        user = None
        if token:
            user = await get_user_from_token(token)

        if user:
            print(f"✅ Authenticated WebSocket user: {user.username}")
        else:
            print("❌ Authentication failed — using AnonymousUser")

        scope["user"] = user or AnonymousUser()
        return await super().__call__(scope, receive, send)
