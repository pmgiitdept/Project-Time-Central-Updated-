from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from accounts.models import User

class AccountsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="john", password="pass123")
        self.login_url = reverse("token_obtain_pair")

    def test_login_success(self):
        response = self.client.post(self.login_url, {"username": "john", "password": "pass123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
