# accounts/tests/test_signals.py
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils import timezone
from accounts.signals import mark_online, mark_offline

User = get_user_model()

@pytest.mark.django_db
def test_mark_online_signal(user_factory):
    user = user_factory(username="online_user")
    mark_online(sender=None, user=user, request=None)
    user.refresh_from_db()
    assert user.is_online is True
    assert user.last_seen <= timezone.now()

@pytest.mark.django_db
def test_mark_offline_signal(user_factory):
    user = user_factory(username="offline_user", is_online=True)
    mark_offline(sender=None, user=user, request=None)
    user.refresh_from_db()
    assert user.is_online is False
    assert user.last_seen <= timezone.now()