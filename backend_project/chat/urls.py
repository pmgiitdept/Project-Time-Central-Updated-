# chat/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatMessageListView, get_messages, RoomViewSet

# Router for RoomViewSet (handles CRUD operations on rooms)
router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")

urlpatterns = [
    # Two message endpoints (likely for backward compatibility)
    path("messages/<str:room_name>/", ChatMessageListView.as_view(), name="chat-messages"),
    path("messages-alt/<str:room_name>/", get_messages, name="chat-messages-alt"),

    # Include all ViewSet routes (rooms/)
    path("", include(router.urls)),
]
