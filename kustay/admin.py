from django.contrib import admin

from .models import Listing, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "first_name", "last_name", "created_at")
    search_fields = ("username", "email", "first_name", "last_name")


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "listing_id",
        "title",
        "user",
        "listing_type",
        "room_type",
        "rent_amount",
        "is_active",
        "created_at",
    )
    list_filter = ("listing_type", "room_type", "is_active")
    search_fields = ("title", "address", "neighborhood", "user__username")
