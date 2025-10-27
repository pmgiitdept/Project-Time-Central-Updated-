# accounts/tasks.py

from django.core.management import call_command

try:
    from celery import shared_task
except ImportError:
    shared_task = lambda f: f  # fallback if Celery is not installed


@shared_task
def disable_inactive_users_task():
    """
    Disable inactive users — callable via Celery or manually.
    Example: python manage.py shell -c "from accounts.tasks import disable_inactive_users_task; disable_inactive_users_task()"
    """
    call_command("disable_inactive_users")
