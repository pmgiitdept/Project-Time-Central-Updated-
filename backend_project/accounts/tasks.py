# accounts/tasks.py
from django.core.management import call_command

def disable_inactive_users_task():
    """
    Former Celery task — now a normal synchronous function.
    Can be called manually or via a cron job using manage.py.
    """
    call_command("disable_inactive_users")