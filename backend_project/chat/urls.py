# chat/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatMessageListView, get_messages, RoomViewSet

router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")

urlpatterns = [
    path("messages/<str:room_name>/", ChatMessageListView.as_view(), name="chat-messages"),
    path("messages-alt/<str:room_name>/", get_messages, name="chat-messages-alt"),
    path("", include(router.urls)),
]