from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from accounts.models import User
from chat.models import Room

class ChatViewsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test", password="1234")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.room = Room.objects.create(name="room1", created_by=self.user)

    def test_get_messages_empty(self):
        url = reverse("chat-messages", kwargs={"room_name": self.room.name})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])


    def test_join_room(self):
        url = reverse("room-join", kwargs={"pk": self.room.id})
        response = self.client.post(url, {"passkey": self.room.passkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
