# accounts/tests/test_tasks.py
import pytest
from unittest.mock import patch
from accounts.tasks import disable_inactive_users_task

@pytest.mark.django_db
def test_disable_inactive_users_task_calls_command():
    with patch("accounts.tasks.call_command") as mock_call:
        disable_inactive_users_task()
        mock_call.assert_called_once_with("disable_inactive_users")
