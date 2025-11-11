from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Profile, Listing, ListingImage, Conversation, Message,
    Review, BlockReview, Report, BlockedUser, MatchCompatibility, Notification
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "user_type", "is_verified", "is_staff", "created_at")
    list_filter = ("user_type", "is_verified", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-created_at",)
    
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name")}),
        ("User Type", {"fields": ("user_type", "is_verified", "verification_token")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "user_type", "password1", "password2"),
        }),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "first_name", "last_name", "department", "budget_min", "budget_max", "move_in_date")
    search_fields = ("user__email", "user__username", "first_name", "last_name", "department")
    list_filter = ("smoker", "pets", "sleep_schedule", "cleanliness_level", "room_type_preference")
    readonly_fields = ("updated_at",)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "listing_id",
        "title",
        "user",
        "listing_type",
        "room_type",
        "rent_amount",
        "neighborhood",
        "is_active",
        "created_at",
    )
    list_filter = ("listing_type", "room_type", "is_active", "created_at")
    search_fields = ("title", "address", "neighborhood", "user__email", "user__username")
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_active",)


@admin.register(ListingImage)
class ListingImageAdmin(admin.ModelAdmin):
    list_display = ("image_id", "listing", "is_primary", "upload_date")
    list_filter = ("is_primary", "upload_date")
    search_fields = ("listing__title",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("conversation_id", "user1", "user2", "last_message_at", "created_at")
    search_fields = ("user1__email", "user2__email", "user1__username", "user2__username")
    readonly_fields = ("created_at",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("message_id", "sender", "receiver", "conversation", "is_read", "sent_at")
    list_filter = ("is_read", "sent_at")
    search_fields = ("sender__email", "receiver__email", "message_text")
    readonly_fields = ("sent_at", "read_at")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("review_id", "reviewer", "reviewed_user", "listing", "rating", "is_approved", "moderation_status", "created_at")
    list_filter = ("moderation_status", "rating", "is_approved", "created_at")
    search_fields = ("reviewer__email", "reviewed_user__email", "comment")
    list_editable = ("moderation_status", "is_approved")  # Now both are in list_display
    readonly_fields = ("created_at",)

@admin.register(BlockReview)
class BlockReviewAdmin(admin.ModelAdmin):
    list_display = ("block_review_id", "user", "block_name", "neighborhood", "noise_rating", "safety_rating", "created_at")
    list_filter = ("noise_rating", "management_rating", "safety_rating", "transport_rating")
    search_fields = ("user__email", "block_name", "neighborhood", "comment")
    readonly_fields = ("created_at",)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("report_id", "reporter", "reported_user", "report_type", "status", "created_at", "resolved_at")
    list_filter = ("report_type", "status", "created_at")
    search_fields = ("reporter__email", "reported_user__email", "description")
    list_editable = ("status",)
    readonly_fields = ("created_at",)


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ("block_id", "blocker", "blocked", "blocked_at")
    search_fields = ("blocker__email", "blocked__email", "blocker__username", "blocked__username")
    readonly_fields = ("blocked_at",)


@admin.register(MatchCompatibility)
class MatchCompatibilityAdmin(admin.ModelAdmin):
    list_display = ("match_id", "user1", "user2", "compatibility_score", "calculated_at")
    search_fields = ("user1__email", "user2__email", "user1__username", "user2__username")
    readonly_fields = ("calculated_at",)
    list_filter = ("compatibility_score",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("notification_id", "user", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("user__email", "user__username", "content")
    list_editable = ("is_read",)
    readonly_fields = ("created_at",)