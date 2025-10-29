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


class Listing(models.Model):
    class ListingType(models.TextChoices):
        APARTMENT = "apartment", "Apartment"
        HOUSE = "house", "House"
        ROOM = "room", "Room"

    class RoomType(models.TextChoices):
        PRIVATE = "private", "Private Room"
        SHARED = "shared", "Shared Room"
        ENTIRE_PLACE = "entire_place", "Entire Place"

    listing_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    listing_type = models.CharField(
        max_length=20,
        choices=ListingType.choices,
        default=ListingType.APARTMENT,
    )
    address = models.CharField(max_length=255)
    neighborhood = models.CharField(max_length=120, blank=True)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    available_from = models.DateField(null=True, blank=True)
    room_type = models.CharField(
        max_length=20,
        choices=RoomType.choices,
        default=RoomType.PRIVATE,
    )
    total_rooms = models.PositiveSmallIntegerField(default=1)
    available_rooms = models.PositiveSmallIntegerField(default=1)
    amenities = models.JSONField(default=list, blank=True)
    house_rules = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} (#{self.listing_id})"
