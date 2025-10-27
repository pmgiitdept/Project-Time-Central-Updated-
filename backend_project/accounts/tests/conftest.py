# accounts/tests/conftest.py
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user_factory(db):
    """
    Factory fixture to create users with unique usernames.
    Usage:
        user = user_factory(username="tester")
        user2 = user_factory()
    """
    counter = 0

    def create_user(**kwargs):
        nonlocal counter
        counter += 1
        username = kwargs.get("username", f"user{counter}")
        password = kwargs.get("password", "password123")
        role = kwargs.get("role", "viewer")
        email = kwargs.get("email", f"{username}@example.com")
        is_online = kwargs.get("is_online", False)
        user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            email=email,
            is_online=is_online,
        )
        return user

    return create_user
