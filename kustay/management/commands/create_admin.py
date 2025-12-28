"""
Management command to create a superuser with environment variables.
Usage: python manage.py create_admin
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a superuser from environment variables if one does not exist'

    def handle(self, *args, **options):
        # Get credentials from environment or use defaults
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@kustay.com')
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')

        # Ensure there is a superuser with the requested email; update/create idempotently
        qs = User.objects.filter(email=email)
        if qs.exists():
            user = qs.first()
            user.username = username or user.username
            user.is_staff = True
            user.is_superuser = True
            if password:
                user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated superuser: {email}'))
            return

        # Create superuser
        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser created successfully: {email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating superuser: {str(e)}'))
