from django.test import TestCase
from accounts.models import User

class UserModelTests(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(username="testuser", password="pass1234")
        self.assertEqual(user.username, "testuser")
        self.assertTrue(user.check_password("pass1234"))
        self.assertTrue(user.is_active)
