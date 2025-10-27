from django.test import TestCase
from chat.models import Room, ChatMessage
from accounts.models import User

class ChatModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="chatter", password="1234")
        Room.objects.filter(name="testroom").delete()
        self.room, _ = Room.objects.get_or_create(
            name="testroom",
            defaults={"created_by": self.user}
        )

    def test_room_created(self):
        self.assertEqual(self.room.name, "testroom")
        self.assertEqual(self.room.created_by, self.user)
        self.assertTrue(self.room.passkey)

    def test_message_creation(self):
        msg = ChatMessage.objects.create(room=self.room, sender=self.user, message="hello world")
        self.assertEqual(msg.room, self.room)
        self.assertEqual(msg.sender, self.user)
        self.assertEqual(msg.message, "hello world")
