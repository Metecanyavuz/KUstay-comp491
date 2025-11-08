from django.apps import AppConfig


class KustayConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "kustay"

    def ready(self):
        # Import signal handlers when the app is ready.
        from . import signals  # noqa: F401
