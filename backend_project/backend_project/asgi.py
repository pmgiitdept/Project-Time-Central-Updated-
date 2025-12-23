# backend_project/asgi.py
"""
ASGI config for backend_project project.
Provides ASGI application for Django + Channels (WebSockets).
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.getenv("DJANGO_SETTINGS_MODULE", "backend_project.settings.prod")
)

django.setup()

from chat.middleware import JWTAuthMiddleware  # after django.setup()
from chat.routing import websocket_urlpatterns

# Define ASGI protocol router
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
