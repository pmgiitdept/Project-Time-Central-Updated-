import pytest
from accounts.serializers import UserSerializer, RegisterSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_user_serializer():
    user = User.objects.create_user(username="tester1", password="1234")
    serializer = UserSerializer(user)
    data = serializer.data
    assert data["username"] == "tester1"

@pytest.mark.django_db
def test_register_serializer_success():
    data = {
        "username": "newuser1",
        "email": "new1@example.com",
        "password": "StrongPass123!",
        "password2": "StrongPass123!",
        "role": "viewer",
        "phone_number": "+639123456789"
    }
    serializer = RegisterSerializer(data=data)
    assert serializer.is_valid(), serializer.errors
    user = serializer.save()
    assert user.username == "newuser1"

@pytest.mark.django_db
def test_register_serializer_password_mismatch():
    data = {
        "username": "newuser2",
        "email": "new2@example.com",
        "password": "pass1",
        "password2": "pass2",
        "role": "viewer"
    }
    serializer = RegisterSerializer(data=data)
    assert not serializer.is_valid()
    assert "password" in serializer.errors

@pytest.mark.django_db
def test_register_serializer_phone_number_invalid():
    data = {
        "username": "newuser3",
        "email": "new3@example.com",
        "password": "StrongPass123!",
        "password2": "StrongPass123!",
        "role": "viewer",
        "phone_number": "09123456789"  # missing '+'
    }
    serializer = RegisterSerializer(data=data)
    assert not serializer.is_valid()
    assert "phone_number" in serializer.errors
