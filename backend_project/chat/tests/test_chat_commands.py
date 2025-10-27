from django.core.management import call_command
from django.test import TestCase
from accounts.models import User

class CommandsTest(TestCase):
    def test_init_admin_creates_superuser(self):
        call_command("init_admin")
        self.assertTrue(User.objects.filter(username="admin").exists())
