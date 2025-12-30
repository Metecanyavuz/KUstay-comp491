from rest_framework import serializers

from .models import BlockReview, Conversation, Listing, ListingImage, Message, Profile, Review, Faculty, Department


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'faculty', 'faculty_name']


class FacultySerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Faculty
        fields = ['id', 'name', 'departments']



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


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "review_id",
            "rating",
            "comment",
            "created_at",
            "reviewer",
            "moderation_status",
            "is_approved",
        ]
        read_only_fields = [
            "review_id",
            "created_at",
            "reviewer",
            "moderation_status",
            "is_approved",
        ]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def get_reviewer(self, obj):
        user = obj.reviewer
        profile = getattr(user, "profile", None)
        return {
            "id": user.pk,
            "email": user.email,
            "first_name": getattr(profile, "first_name", user.first_name),
            "last_name": getattr(profile, "last_name", user.last_name),
            "profile_photo_url": getattr(profile, "profile_photo_url", ""),
        }


class BlockReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.SerializerMethodField()
    overall_rating = serializers.SerializerMethodField()

    class Meta:
        model = BlockReview
        fields = [
            "block_review_id",
            "block_name",
            "neighborhood",
            "unit_details",
            "noise_rating",
            "management_rating",
            "safety_rating",
            "transport_rating",
            "overall_rating",
            "comment",
            "created_at",
            "reviewer",
            "moderation_status",
            "is_approved",
        ]
        read_only_fields = [
            "block_review_id",
            "created_at",
            "reviewer",
            "overall_rating",
            "moderation_status",
            "is_approved",
        ]

    def validate_noise_rating(self, value):
        return self._validate_rating(value)

    def validate_management_rating(self, value):
        return self._validate_rating(value)

    def validate_safety_rating(self, value):
        return self._validate_rating(value)

    def validate_transport_rating(self, value):
        return self._validate_rating(value)

    def _validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def get_overall_rating(self, obj):
        values = [
            obj.noise_rating,
            obj.management_rating,
            obj.safety_rating,
            obj.transport_rating,
        ]
        return round(sum(values) / len(values), 2)

    def get_reviewer(self, obj):
        user = obj.user
        profile = getattr(user, "profile", None)
        return {
            "id": user.pk,
            "email": user.email,
            "first_name": getattr(profile, "first_name", user.first_name),
            "last_name": getattr(profile, "last_name", user.last_name),
            "profile_photo_url": getattr(profile, "profile_photo_url", ""),
        }


class ProfileSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    department_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Department.objects.all(), source='departments'
    )

    class Meta:
        model = Profile
        fields = [
            'profile_id',
            'first_name',
            'last_name',
            'phone_number',
            'departments',
            'department_ids',
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

    def to_internal_value(self, data):
        # Handle multipart/form-data where JSON fields are strings
        
        # If data is a QueryDict (from multipart request), converting to dict()
        # destroys lists (takes only the last value).
        # We need to preserve 'department_ids' as a list.
        is_querydict = hasattr(data, 'getlist')
        
        # Convert to plain dict to avoid QueryDict treating list values as multiple parameters
        if hasattr(data, 'dict'):
             internal_data = data.dict()
        elif hasattr(data, 'copy'):
             internal_data = data.copy()
        else:
             internal_data = {}

        # Restore list fields if it was a QueryDict
        if is_querydict:
            if 'department_ids' in data:
                internal_data['department_ids'] = data.getlist('department_ids')
            elif 'department_ids[]' in data: # Handle potential array notation
                internal_data['department_ids'] = data.getlist('department_ids[]')

        if 'preferred_neighborhoods' in internal_data and isinstance(internal_data['preferred_neighborhoods'], str):
            try:
                import json
                internal_data['preferred_neighborhoods'] = json.loads(internal_data['preferred_neighborhoods'])
            except (ValueError, TypeError):
                # If parsing fails, let standard validation handle the error
                pass
                
        return super().to_internal_value(internal_data)



class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

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
            "attachment_type",
            "attachment_name",
            "attachment_url",
            "has_attachment",
        ]
        read_only_fields = [
            "message_id",
            "sent_at",
            "read_at",
            "is_read",
            "sender",
            "is_own",
            "attachment_type",
            "attachment_name",
            "attachment_url",
            "has_attachment",
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

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return ""
        request = self.context.get("request")
        url = obj.attachment.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_attachment_name(self, obj):
        if obj.attachment_original_name:
            return obj.attachment_original_name
        if obj.attachment:
            return obj.attachment.name.split("/")[-1]
        return ""

    def get_has_attachment(self, obj):
        return bool(obj.attachment)


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
            "is_verified": partner.is_verified,
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
