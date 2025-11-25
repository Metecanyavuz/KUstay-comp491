from rest_framework import serializers

from .models import Conversation, Listing, ListingImage, Message, Profile


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


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "message_id",
            "message_text",
            "sent_at",
            "read_at",
            "is_read",
            "sender",
            "is_own",
        ]
        read_only_fields = [
            "message_id",
            "sent_at",
            "read_at",
            "is_read",
            "sender",
            "is_own",
        ]

    def get_sender(self, obj):
        return {
            "id": obj.sender.pk,
            "username": obj.sender.username,
            "first_name": getattr(obj.sender.profile, "first_name", obj.sender.first_name),
            "last_name": getattr(obj.sender.profile, "last_name", obj.sender.last_name),
        }

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            return obj.sender_id == request.user.pk
        return False


class ConversationSerializer(serializers.ModelSerializer):
    partner = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "conversation_id",
            "partner",
            "last_message",
            "created_at",
            "last_message_at",
        ]

    def _get_partner(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        partner = obj.user2 if user and obj.user1_id == user.pk else obj.user1
        profile = getattr(partner, "profile", None)
        return {
            "id": partner.pk,
            "username": partner.username,
            "first_name": getattr(profile, "first_name", partner.first_name),
            "last_name": getattr(profile, "last_name", partner.last_name),
            "profile_photo_url": getattr(profile, "profile_photo_url", ""),
        }

    def get_partner(self, obj):
        return self._get_partner(obj)

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by("-sent_at").first()
        if not last_msg:
            return None
        return MessageSerializer(last_msg, context=self.context).data


class ConversationDetailSerializer(ConversationSerializer):
    messages = serializers.SerializerMethodField()

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]

    def get_messages(self, obj):
        qs = obj.messages.select_related("sender").order_by("sent_at")
        return MessageSerializer(qs, many=True, context=self.context).data
