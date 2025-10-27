# accounts/management/commands/disable_inactive_users.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from accounts.models import User
from files.models import SystemSettings


class Command(BaseCommand):
    help = "Disable users who have been inactive beyond the configured number of days."

    def handle(self, *args, **options):
        settings = SystemSettings.objects.first()

        if not settings:
            self.stdout.write(self.style.WARNING("No SystemSettings found. Skipping task."))
            return

        if not settings.auto_disable_inactive:
            self.stdout.write("Auto-disable inactive users is turned off.")
            return

        cutoff_date = timezone.now() - timedelta(days=settings.auto_disable_inactive)

        # Find users who are active but haven't logged in since cutoff (or never logged in)
        inactive_users = User.objects.filter(
            is_active=True
        ).filter(
            Q(last_login__lt=cutoff_date) | Q(last_login__isnull=True)
        )

        count = inactive_users.count()
        inactive_users.update(is_active=False)

        if count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Disabled {count} inactive user(s)."))
        else:
            self.stdout.write("No inactive users found to disable.")
