from django.conf import settings
from django.db import models


class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username


class Profile(models.Model):
    CLEANLINESS_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]
    SLEEP_SCHEDULE_CHOICES = [
        ("early_bird", "Early Bird"),
        ("night_owl", "Night Owl"),
        ("flexible", "Flexible"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    move_in_date = models.DateField(null=True, blank=True)
    smoker = models.BooleanField(default=False)
    pets = models.BooleanField(default=False)
    sleep_schedule = models.CharField(
        max_length=20,
        choices=SLEEP_SCHEDULE_CHOICES,
        default="flexible",
    )
    cleanliness_level = models.CharField(
        max_length=10,
        choices=CLEANLINESS_CHOICES,
        default="medium",
    )
    lifestyle_notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"
