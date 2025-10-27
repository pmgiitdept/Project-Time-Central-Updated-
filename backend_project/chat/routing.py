# chat/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebSocket for individual chat rooms
    re_path(r"^ws/chat/(?P<room_name>\w+)/$", consumers.ChatConsumer.as_asgi()),

    # WebSocket for room list updates (optional, used by RoomConsumer)
    re_path(r"^ws/rooms/$", consumers.RoomConsumer.as_asgi()),
]
