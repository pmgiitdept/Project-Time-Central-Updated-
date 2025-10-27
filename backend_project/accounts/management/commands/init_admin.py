# accounts/management/commands/init_admin.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create an initial admin superuser if none exists."

    def handle(self, *args, **options):
        User = get_user_model()

        # You can modify these defaults or move them to environment variables later.
        default_username = "admin"
        default_email = "admin@example.com"
        default_password = "AdminPass123!"

        existing_admin = User.objects.filter(username=default_username).first()

        if existing_admin:
            self.stdout.write(self.style.WARNING(f"Admin user '{default_username}' already exists."))
            return

        user = User.objects.create_superuser(
            username=default_username,
            email=default_email,
            password=default_password
        )

        if hasattr(user, "role"):
            user.role = User.Roles.ADMIN if hasattr(User, "Roles") else "admin"
            user.save(update_fields=["role"])

        self.stdout.write(self.style.SUCCESS(f"✅ Superuser '{default_username}' created successfully."))
