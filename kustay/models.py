from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser



class User(AbstractUser):
    """Custom User model extending Django's AbstractUser"""
    USER_TYPE_CHOICES = [
        ('KU_Student', 'KU Student'),
        ('External_Student', 'External Student'),
    ]
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, blank=True, null=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


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
    ROOM_TYPE_CHOICES = [
        ("private", "Private Room"),
        ("shared", "Shared Room"),
        ("entire_place", "Entire Place"),
    ]
    STUDY_HABITS_CHOICES = [
        ("quiet", "Quiet"),
        ("moderate", "Moderate"),
        ("social", "Social"),
    ]

    profile_id = models.AutoField(primary_key=True)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

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
    room_type_preference = models.CharField(
        max_length=20,
        choices=ROOM_TYPE_CHOICES,
        default="private",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True)
    faculty = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preferred_neighborhoods = models.JSONField(default=list, blank=True)
    move_in_date = models.DateField(null=True, blank=True)
    smoker = models.BooleanField(default=False)
    pets = models.BooleanField(default=False)
    lifestyle_notes = models.TextField(blank=True)
    profile_photo_url = models.URLField(blank=True)

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


class Review(models.Model):
    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    review_id = models.BigAutoField(primary_key=True)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )
    reviewed_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )
    listing = models.ForeignKey(
        "Listing",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.IntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=20,
        choices=ModerationStatus.choices,
        default=ModerationStatus.PENDING,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review #{self.review_id} by {self.reviewer}"

class ListingImage(models.Model):
    image_id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(
        "Listing",
        on_delete=models.CASCADE,
        related_name="images",
    )
    image_url = models.URLField()
    is_primary = models.BooleanField(default=False)
    upload_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "-upload_date"]

    def __str__(self):
        return f"Image for {self.listing.title}"

class Conversation(models.Model):
    conversation_id = models.BigAutoField(primary_key=True)
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_user1",
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_user2",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user1", "user2")
        ordering = ["-last_message_at"]

    def __str__(self):
        return f"Conversation between {self.user1} and {self.user2}"

class Message(models.Model):
    message_id = models.BigAutoField(primary_key=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_sent",
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_received",
    )
    conversation = models.ForeignKey(
        "Conversation",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    listing = models.ForeignKey(
        "Listing",
        on_delete=models.SET_NULL,
        related_name="messages",
        null=True,
        blank=True,
    )
    message_text = models.TextField()
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Message from {self.sender} to {self.receiver}"
        
class BlockReview(models.Model):
    block_review_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="block_reviews",
    )
    block_name = models.CharField(max_length=255)
    neighborhood = models.CharField(max_length=255)
    noise_rating = models.IntegerField()
    management_rating = models.IntegerField()
    safety_rating = models.IntegerField()
    transport_rating = models.IntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Block Review: {self.block_name} by {self.user}"
    
class Report(models.Model):
    class ReportType(models.TextChoices):
        USER = "user", "User"
        LISTING = "listing", "Listing"
        MESSAGE = "message", "Message"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_REVIEW = "in_review", "In Review"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    report_id = models.BigAutoField(primary_key=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_filed",
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_received",
    )
    reported_listing = models.ForeignKey(
        "Listing",
        on_delete=models.CASCADE,
        related_name="reports",
        null=True,
        blank=True,
    )
    reported_message = models.ForeignKey(
        "Message",
        on_delete=models.CASCADE,
        related_name="reports",
        null=True,
        blank=True,
    )
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        default=ReportType.USER,
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reports_resolved",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report #{self.report_id} on {self.report_type}"

class BlockedUser(models.Model):
    block_id = models.BigAutoField(primary_key=True)
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocked_users",
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocked_by_users",
    )
    blocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")
        ordering = ["-blocked_at"]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"
    
class MatchCompatibility(models.Model):
    match_id = models.BigAutoField(primary_key=True)
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="match_compatibilities_initiated",
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="match_compatibilities_received",
    )
    compatibility_score = models.DecimalField(max_digits=5, decimal_places=2)
    matching_criteria = models.JSONField(default=dict, blank=True)
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user1", "user2")
        ordering = ["-calculated_at"]

    def __str__(self):
        return f"Match {self.user1} ↔ {self.user2} ({self.compatibility_score}%)"

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        MESSAGE = "message", "New Message"
        MATCH = "match", "New Match"
        REVIEW = "review", "New Review"
        LISTING = "listing", "Listing Update"
        SYSTEM = "system", "System"

    notification_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
    )
    content = models.TextField()
    related_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.user}: {self.notification_type}"
    