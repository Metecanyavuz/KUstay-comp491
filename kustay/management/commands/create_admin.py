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

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address for the superuser',
        )
        parser.add_argument(
            '--fix-existing',
            action='store_true',
            help='Fix existing admin users by granting staff/superuser permissions',
        )

    def handle(self, *args, **options):
        # Handle fixing existing admin users
        if options.get('fix_existing'):
            self._fix_existing_admins()
            return

        # Get credentials from environment or command line or use defaults
        email = options.get('email') or os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@kustay.com')
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')

        # Ensure there is a superuser with the requested email; update/create idempotently
        qs = User.objects.filter(email=email)
        if qs.exists():
            user = qs.first()
            user.username = username or user.username
            user.is_staff = True
            user.is_superuser = True
            user.is_verified = True
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
            user.is_verified = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser created successfully: {email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating superuser: {str(e)}'))

    def _fix_existing_admins(self):
        """Fix existing admin users that might not have proper permissions"""
        # Find users with admin-like emails
        admin_emails = [
            'admin@ku.edu.tr',
            'admin@kustay.com',
            'myavuz20@ku.edu.tr',
        ]

        fixed_count = 0
        for email in admin_emails:
            try:
                user = User.objects.get(email=email)
                updated = False

                if not user.is_staff:
                    user.is_staff = True
                    updated = True

                if not user.is_superuser:
                    user.is_superuser = True
                    updated = True

                if not user.is_verified:
                    user.is_verified = True
                    updated = True

                if updated:
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f'✓ Fixed permissions for: {email}'))
                    fixed_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f'⚠ {email} already has correct permissions'))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'⚠ User not found: {email}'))

        if fixed_count > 0:
            self.stdout.write(self.style.SUCCESS(f'\n✓ Fixed {fixed_count} admin user(s)'))
        else:
            self.stdout.write(self.style.WARNING('\nNo users needed fixing'))
