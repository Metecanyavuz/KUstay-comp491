from rest_framework import serializers

from .models import Listing, ListingImage, Profile


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ["image_id", "image_url", "is_primary", "upload_date"]


class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "listing_id",
            "user",
            "title",
            "description",
            "listing_type",
            "address",
            "neighborhood",
            "latitude",
            "longitude",
            "rent_amount",
            "available_from",
            "room_type",
            "total_rooms",
            "available_rooms",
            "amenities",
            "house_rules",
            "is_active",
            "image",
            "created_at",
            "updated_at",
            "images",
        ]
        read_only_fields = ["listing_id", "created_at", "updated_at"]


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'profile_id',
            'first_name',
            'last_name',
            'phone_number',
            'department',
            'faculty',
            'budget_min',
            'budget_max',
            'preferred_neighborhoods',
            'move_in_date',
            'smoker',
            'pets',
            'sleep_schedule',
            'cleanliness_level',
            'room_type_preference',
            'lifestyle_notes',
            'profile_photo_url',
            'updated_at',
        ]
        read_only_fields = ['profile_id', 'updated_at']