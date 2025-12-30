import json
import os
import uuid
from decimal import Decimal, InvalidOperation
import logging

from django.conf import settings
from django.db import connection
from django.db.models import Avg, Count, ExpressionWrapper, FloatField, F, OuterRef, Q, Subquery
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.core.files.storage import default_storage
from datetime import timedelta
import resend

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import BlockReview, Conversation, Listing, ListingImage, Message, Profile, Review, User
from .serializers import (
    ConversationDetailSerializer,
    ConversationSerializer,
    ListingSerializer,
    MessageSerializer,
    ProfileSerializer,
    ReviewSerializer,
    BlockReviewSerializer,
)
import re

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
logger = logging.getLogger(__name__)


class IsListingOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and obj.user_id == request.user.user_id


class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().select_related("user")
    serializer_class = ListingSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsListingOwnerOrReadOnly,
    ]

    def create(self, request, *args, **kwargs):
        error_response = self._validate_listing_images(request.FILES.getlist("images"))
        if error_response:
            return error_response
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        error_response = self._validate_listing_images(request.FILES.getlist("images"))
        if error_response:
            return error_response
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        error_response = self._validate_listing_images(request.FILES.getlist("images"))
        if error_response:
            return error_response
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        listing = serializer.save(user=self.request.user)
        self._save_listing_images(listing)
        if listing.image:
            try:
                image_path = default_storage.path(listing.image.name)
                storage_location = getattr(default_storage, "location", "")
            except Exception:
                image_path = ""
                storage_location = ""
            logger.info(
                "Cover image saved: %s path=%s location=%s media_root=%s exists=%s",
                listing.image.name,
                image_path,
                storage_location,
                settings.MEDIA_ROOT,
                default_storage.exists(listing.image.name),
            )

    def perform_update(self, serializer):
        listing = serializer.save()
        self._save_listing_images(listing)
        if listing.image:
            try:
                image_path = default_storage.path(listing.image.name)
                storage_location = getattr(default_storage, "location", "")
            except Exception:
                image_path = ""
                storage_location = ""
            logger.info(
                "Cover image saved: %s path=%s location=%s media_root=%s exists=%s",
                listing.image.name,
                image_path,
                storage_location,
                settings.MEDIA_ROOT,
                default_storage.exists(listing.image.name),
            )

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ["retrieve", "update", "partial_update", "destroy"]:
            if self.request.user.is_authenticated:
                queryset = queryset.filter(Q(is_active=True) | Q(user=self.request.user))
            else:
                queryset = queryset.filter(is_active=True)
        else:
            queryset = queryset.filter(is_active=True)

        location = self.request.query_params.get("location", "").strip()
        price_min = self.request.query_params.get("price_min", "").strip()
        price_max = self.request.query_params.get("price_max", "").strip()
        amenities = self.request.query_params.get("amenities", "").strip()

        if location:
            query = Q(title__icontains=location) | Q(address__icontains=location) | Q(
                neighborhood__icontains=location
            )
            queryset = queryset.filter(query)

        def _as_decimal(value):
            try:
                return Decimal(value)
            except (InvalidOperation, TypeError):
                return None

        min_value = _as_decimal(price_min)
        if min_value is not None:
            queryset = queryset.filter(rent_amount__gte=min_value)

        max_value = _as_decimal(price_max)
        if max_value is not None:
            queryset = queryset.filter(rent_amount__lte=max_value)

        amenity_terms = [term.strip() for term in amenities.split(",") if term.strip()]
        for term in amenity_terms:
            queryset = queryset.filter(amenities__icontains=term)

        return queryset

    def _validate_listing_images(self, image_files):
        if not image_files:
            return None
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        for image_file in image_files:
            if image_file.content_type not in allowed_types:
                return Response(
                    {"error": "Only JPG, PNG, or WEBP images are allowed."},
                    status=400,
                )
        return None

    def _save_listing_images(self, listing):
        image_files = self.request.FILES.getlist("images")
        if not image_files:
            return
        has_primary = listing.images.filter(is_primary=True).exists()
        for index, image_file in enumerate(image_files):
            ext = os.path.splitext(image_file.name)[1] or ".jpg"
            filename = f"listing_images/{listing.pk}_{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, image_file)
            try:
                absolute_path = default_storage.path(saved_path)
                storage_location = getattr(default_storage, "location", "")
            except Exception:
                absolute_path = ""
                storage_location = ""
            logger.info(
                "Additional image saved: %s path=%s location=%s media_root=%s exists=%s",
                saved_path,
                absolute_path,
                storage_location,
                settings.MEDIA_ROOT,
                default_storage.exists(saved_path),
            )
            image_url = self.request.build_absolute_uri(default_storage.url(saved_path))
            is_primary = False
            if not listing.image and not has_primary and index == 0:
                is_primary = True
                has_primary = True
            ListingImage.objects.create(
                listing=listing,
                image_url=image_url,
                is_primary=is_primary,
            )

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def reviews(self, request, pk=None):
        listing = self.get_object()

        existing_review = None
        if request.user.is_authenticated:
            existing_review = Review.objects.filter(listing=listing, reviewer=request.user).first()

        if request.method == "GET":
            approved_reviews = (
                listing.reviews.filter(
                    is_approved=True,
                    moderation_status=Review.ModerationStatus.APPROVED,
                )
                .select_related("reviewer", "reviewed_user")
                .order_by("-created_at")
            )
            summary = approved_reviews.aggregate(
                avg_rating=Avg("rating"),
                count=Count("review_id"),
            )
            return Response(
                {
                    "summary": {
                        "average": summary["avg_rating"],
                        "count": summary["count"],
                    },
                    "reviews": ReviewSerializer(
                        approved_reviews,
                        many=True,
                        context={"request": request},
                    ).data,
                    "existing_review": ReviewSerializer(
                        existing_review,
                        context={"request": request},
                    ).data
                    if existing_review
                    else None,
                }
            )

        if request.user == listing.user:
            return Response(
                {"error": "You cannot review your own listing."},
                status=400,
            )
        if existing_review:
            return Response(
                {"error": "You have already reviewed this listing."},
                status=400,
            )

        serializer = ReviewSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        review = serializer.save(
            reviewer=request.user,
            reviewed_user=listing.user,
            listing=listing,
        )
        return Response(
            ReviewSerializer(review, context={"request": request}).data,
            status=201,
        )


class ConversationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(Q(user1=user) | Q(user2=user))
            .select_related("user1", "user2")
            .prefetch_related("messages__sender")
            .order_by("-last_message_at", "-created_at")
        )

    def get_serializer_class(self):
        if self.action in ["retrieve", "messages"]:
            return ConversationDetailSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        partner_id = request.data.get("partner_id")
        if not partner_id:
            return Response({"error": "partner_id is required"}, status=400)

        try:
            partner = User.objects.get(pk=partner_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if partner.pk == request.user.pk:
            return Response({"error": "Cannot start a conversation with yourself"}, status=400)

        user1, user2 = sorted([request.user, partner], key=lambda u: u.pk)
        conversation, created = Conversation.objects.get_or_create(user1=user1, user2=user2)
        serializer = self.get_serializer(conversation, context={"request": request})
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        partner = conversation.user2 if conversation.user1_id == request.user.pk else conversation.user1

        if request.method == "GET":
            qs = conversation.messages.select_related("sender").order_by("sent_at")
            data = MessageSerializer(qs, many=True, context={"request": request}).data
            return Response(data)

        message_text = (request.data.get("message_text") or "").strip()
        attachment_file = request.FILES.get("attachment")

        if not message_text and not attachment_file:
            return Response(
                {"error": "Please enter a message or attach a file."},
                status=400,
            )

        attachment_type = Message.AttachmentType.TEXT
        attachment_name = ""
        if attachment_file:
            content_type = attachment_file.content_type or ""
            if content_type.startswith("image/"):
                attachment_type = Message.AttachmentType.IMAGE
            else:
                attachment_type = Message.AttachmentType.FILE
            attachment_name = attachment_file.name[:255]

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            receiver=partner,
            message_text=message_text,
            attachment=attachment_file,
            attachment_original_name=attachment_name,
            attachment_type=attachment_type,
        )
        conversation.last_message_at = message.sent_at
        conversation.save(update_fields=["last_message_at"])
        data = MessageSerializer(message, context={"request": request}).data
        return Response(data, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    user_type = request.data.get('user_type', 'External_Student')
    
    # Validate email domain
    if user_type == 'KU_Student':
        if not (email.endswith('@ku.edu.tr') or email.endswith('@ku.edu')):
            return Response({
                'error': 'KU Students must use their KU email address (@ku.edu.tr)'
            }, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)
    
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=400)
    
    user = User.objects.create_user(
        email=email,
        username=username,
        password=password,
        user_type=user_type
    )
    
    # Send verification email to KU students
    if user_type == 'KU_Student' and (email.endswith('@ku.edu.tr') or email.endswith('@ku.edu')):
        send_verification_email(user)
    
    django_login(request, user)
    
    return Response({
        'user': {
            'id': user.pk,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type,
            'is_verified': user.is_verified,
        }
    })


def send_verification_email(user):
    """Send email verification to KU students using Resend"""
    logger.info("=== Starting email verification process for %s ===", user.email)

    verification_token = get_random_string(64)
    user.verification_token = verification_token
    user.save()

    # Frontend URL - change this to your production URL when deploying
    verify_url = f"{FRONTEND_BASE_URL.rstrip('/')}/verify-email?token={verification_token}"

    # Email subject
    subject = 'Verify Your KUstay Account'

    # Plain text fallback (helps some clients and makes link obvious)
    text_message = f"""Hello {user.username},

Welcome to KUstay! Please verify your email address to access all features of the platform.

Verify your email: {verify_url}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
KUstay Team
"""

    # HTML message - Gmail-compatible version with KU brand colors
    html_message = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #231f20; margin: 0; padding: 0; background-color: #fff4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff4f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e4c9cf;">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #c3112e; margin: 0 0 20px 0; font-size: 24px;">Welcome to KUstay!</h2>
                            <p style="margin: 0 0 15px 0; color: #231f20; font-size: 16px;">Hello <strong>{user.username}</strong>,</p>
                            <p style="margin: 0 0 25px 0; color: #231f20; font-size: 16px;">Thank you for joining KUstay. Please verify your email address to access all features of the platform.</p>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{verify_url}" target="_blank" rel="noopener noreferrer" style="background-color: #c3112e; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 10px 0; color: #5c474a; font-size: 14px;">Or copy and paste this link into your browser:</p>
                            <p style="margin: 0 0 30px 0; word-break: break-all; color: #c3112e; font-size: 14px;">{verify_url}</p>

                            <p style="margin: 0 0 10px 0; color: #5c474a; font-size: 14px;">This link will expire in 24 hours.</p>
                            <p style="margin: 0 0 30px 0; color: #5c474a; font-size: 14px;">If you did not create this account, please ignore this email.</p>

                            <hr style="border: none; border-top: 1px solid #e4c9cf; margin: 20px 0;">

                            <p style="margin: 0; color: #5c474a; font-size: 12px;">Best regards,<br>KUstay Team</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''

    # Send email using Resend
    from_email = settings.DEFAULT_FROM_EMAIL or 'KUstay <onboarding@resend.dev>'

    logger.info("Using Resend API for email delivery")
    logger.info("From email: %s", from_email)
    logger.info("To email: %s", user.email)
    logger.info("Resend API key configured: %s", bool(settings.RESEND_API_KEY))

    try:
        # Set Resend API key
        resend.api_key = settings.RESEND_API_KEY

        # Send email via Resend
        params = {
            "from": from_email,
            "to": [user.email],
            "subject": subject,
            "text": text_message,
            "html": html_message,
        }

        logger.info("Sending email via Resend API...")
        email_response = resend.Emails.send(params)
        logger.info("Verification email sent successfully to %s. Response: %s", user.email, email_response)

    except Exception as e:
        # Log and continue so signup flow doesn't hang on email issues
        logger.error("Error type: %s", type(e).__name__)
        logger.exception("Error sending verification email to %s", user.email)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        django_login(request, user)
        return Response({
            'user': {
                'id': user.pk,
                'email': user.email,
                'username': user.username,
                'user_type': user.user_type,
            }
        })
    
    return Response({'error': 'Invalid credentials'}, status=401)


@api_view(['POST'])
@permission_classes([AllowAny])  # Changed from IsAuthenticated
def logout_view(request):
    """Logout user - FIXED VERSION"""
    try:
        django_logout(request)
        return Response({'message': 'Logged out successfully'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({
        'user': {
            'id': user.pk,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type,
            'is_verified': user.is_verified,
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    email = request.data.get('email')
    
    try:
        user = User.objects.get(email=email)
        
        # Generate reset token
        reset_token = get_random_string(64)
        user.verification_token = reset_token
        user.save()
        
        # Create reset URL
        reset_url = f"{FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={reset_token}"

        # Send email using Resend
        from_email = settings.DEFAULT_FROM_EMAIL or 'KUstay <onboarding@resend.dev>'

        html_message = f'''
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">Password Reset Request</h2>
                    <p>You have requested to reset your password.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="margin: 30px 0;">
                        <a href="{reset_url}"
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                  color: white;
                                  padding: 12px 30px;
                                  text-decoration: none;
                                  border-radius: 5px;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        If you did not request this, please ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Best regards,<br>
                        KUstay Team
                    </p>
                </div>
            </body>
        </html>
        '''

        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": from_email,
                "to": [email],
                "subject": "Password Reset Request",
                "html": html_message,
            }
            email_response = resend.Emails.send(params)
            logger.info("Password reset email sent successfully to %s. Response: %s", email, email_response)
        except Exception as e:
            logger.exception("Error sending password reset email to %s", email)
            return Response({'error': 'Failed to send email'}, status=500)

        return Response({'message': 'Reset email sent'}, status=200)
    except User.DoesNotExist:
        # Return success even if user doesn't exist (security best practice)
        return Response({'message': 'Reset email sent'}, status=200)
    except Exception as e:
        return Response({'error': 'Failed to send email'}, status=500)


@csrf_exempt  # Token in email link is the protection; allow calling without CSRF cookie.
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Skip session auth to avoid CSRF requirement when already logged in
def verify_email_view(request):
    token = (request.data.get('token') or '').strip()

    if not token:
        return Response({'error': 'Missing token'}, status=400)

    try:
        user = User.objects.get(verification_token=token)
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired token'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

    # Normalize for safety
    email_lower = (user.email or '').lower()
    user_type = (user.user_type or '').lower()

    # Only KU students can be verified
    if user_type != 'ku_student' or not (email_lower.endswith('@ku.edu.tr') or email_lower.endswith('@ku.edu')):
        return Response({'error': 'Invalid user type for verification'}, status=400)

    # If already verified, be idempotent but clear any stale token.
    if user.is_verified:
        user.verification_token = ''
        user.save(update_fields=['verification_token'])
        return Response({'message': 'Email already verified'}, status=200)

    user.is_verified = True
    user.verification_token = ''  # Clear the token
    user.save(update_fields=['is_verified', 'verification_token'])

    return Response({'message': 'Email verified successfully'}, status=200)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    token = (request.data.get('token') or '').strip()
    password = request.data.get('password')
    
    try:
        user = User.objects.get(verification_token=token)
        
        # Set new password
        user.set_password(password)
        user.verification_token = ''  # Clear the token
        user.save()
        
        return Response({'message': 'Password reset successfully'}, status=200)
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired token'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def profile_view_api(request):
    """Get or update user profile"""
    user = request.user

    try:
        profile = user.profile
    except Profile.DoesNotExist:
        profile = None
    
    if request.method == 'GET':
        if profile:
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        else:
            return Response({'error': 'Profile not found'}, status=404)
    
    elif request.method == 'POST':
        # Get data from request
        data = request.data.copy()

        # Normalize preferred neighborhoods (handle JSON string or comma-separated input)
        preferred_neighborhoods = data.get("preferred_neighborhoods", [])
        if isinstance(preferred_neighborhoods, str):
            try:
                preferred_neighborhoods = json.loads(preferred_neighborhoods)
            except json.JSONDecodeError:
                preferred_neighborhoods = [
                    n.strip() for n in preferred_neighborhoods.split(",") if n.strip()
                ]
        data["preferred_neighborhoods"] = preferred_neighborhoods

        # Normalize budgets and move_in_date
        for field in ("budget_min", "budget_max"):
            value = data.get(field)
            data[field] = value if value not in (None, "") else 0

        if not data.get("move_in_date"):
            data["move_in_date"] = None

        # Normalize boolean fields from form data
        for field in ("smoker", "pets"):
            value = data.get(field)
            if isinstance(value, str):
                data[field] = value.lower() in ("true", "1", "yes", "on")

        # Handle profile photo upload
        photo_file = request.FILES.get("profile_photo")
        if photo_file:
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if photo_file.content_type not in allowed_types:
                return Response({"error": "Only JPG, PNG, or WEBP images are allowed."}, status=400)

            ext = os.path.splitext(photo_file.name)[1] or ".jpg"
            filename = f"profile_photos/{user.pk}_{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, photo_file)
            photo_url = request.build_absolute_uri(default_storage.url(saved_path))
            data["profile_photo_url"] = photo_url
        
        if profile:
            # Update existing profile
            serializer = ProfileSerializer(profile, data=data, partial=True)
        else:
            # Create new profile
            serializer = ProfileSerializer(data=data)
        
        if serializer.is_valid():
            serializer.save(user=user)
            
            # KU students are NOT auto-verified anymore - they need email verification
            # External students can NEVER be verified
            
            return Response(serializer.data, status=200)
        else:
            return Response({'error': serializer.errors}, status=400)


@api_view(['GET'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def get_csrf_token(request):
    """Get CSRF token"""
    return Response({'detail': 'CSRF cookie set'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request, user_id):
    """Get public profile of a specific user by user_id"""
    try:
        user = User.objects.get(pk=user_id)
        profile = user.profile
        
        # Serialize profile data
        profile_serializer = ProfileSerializer(profile)
        profile_data = profile_serializer.data
        
        # Add user information
        profile_data['user'] = {
            'id': user.pk,
            'email': user.email,
            'user_type': user.user_type,
            'is_verified': user.is_verified,
        }
        
        return Response(profile_data, status=200)
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def block_reviews_view(request):
    if request.method == 'GET':
        queryset = (
            BlockReview.objects.filter(
                is_approved=True,
                moderation_status=BlockReview.ModerationStatus.APPROVED,
            )
            .select_related("user")
            .order_by("-created_at")
        )

        block_name = (request.query_params.get('block_name') or '').strip()
        neighborhood = (request.query_params.get('neighborhood') or '').strip()
        if block_name:
            queryset = queryset.filter(block_name__iexact=block_name)
        if neighborhood:
            queryset = queryset.filter(neighborhood__iexact=neighborhood)

        summary = queryset.aggregate(
            avg_noise=Avg("noise_rating"),
            avg_management=Avg("management_rating"),
            avg_safety=Avg("safety_rating"),
            avg_transport=Avg("transport_rating"),
            count=Count("block_review_id"),
        )

        overall = None
        if summary["count"]:
            overall = (
                (summary["avg_noise"] or 0)
                + (summary["avg_management"] or 0)
                + (summary["avg_safety"] or 0)
                + (summary["avg_transport"] or 0)
            ) / 4

        return Response(
            {
                "summary": {
                    "average": overall,
                    "count": summary["count"],
                    "avg_noise": summary["avg_noise"],
                    "avg_management": summary["avg_management"],
                    "avg_safety": summary["avg_safety"],
                    "avg_transport": summary["avg_transport"],
                },
                "reviews": BlockReviewSerializer(
                    queryset,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=401)

    data = request.data.copy()
    block_name = (data.get('block_name') or '').strip()
    neighborhood = (data.get('neighborhood') or '').strip()

    if not block_name or not neighborhood:
        return Response(
            {'error': 'block_name and neighborhood are required.'},
            status=400,
        )

    existing = BlockReview.objects.filter(
        user=request.user,
        block_name__iexact=block_name,
        neighborhood__iexact=neighborhood,
    ).first()
    if existing:
        return Response(
            {'error': 'You already reviewed this building.'},
            status=400,
        )

    serializer = BlockReviewSerializer(data=data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    review = serializer.save(user=request.user)
    return Response(
        BlockReviewSerializer(review, context={"request": request}).data,
        status=201,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def block_review_highlights(request):
    limit_raw = request.query_params.get('limit', '6')
    try:
        limit = max(1, min(int(limit_raw), 12))
    except ValueError:
        limit = 6

    base_queryset = BlockReview.objects.filter(
        is_approved=True,
        moderation_status=BlockReview.ModerationStatus.APPROVED,
    )

    summary_queryset = (
        base_queryset.values("block_name", "neighborhood")
        .annotate(
            avg_noise=Avg("noise_rating"),
            avg_management=Avg("management_rating"),
            avg_safety=Avg("safety_rating"),
            avg_transport=Avg("transport_rating"),
            review_count=Count("block_review_id"),
        )
        .annotate(
            avg_overall=ExpressionWrapper(
                (
                    F("avg_noise")
                    + F("avg_management")
                    + F("avg_safety")
                    + F("avg_transport")
                )
                / 4.0,
                output_field=FloatField(),
            )
        )
    )

    latest_comment = Subquery(
        base_queryset.filter(
            block_name=OuterRef("block_name"),
            neighborhood=OuterRef("neighborhood"),
        )
        .exclude(comment="")
        .order_by("-created_at")
        .values("comment")[:1]
    )
    latest_unit_details = Subquery(
        base_queryset.filter(
            block_name=OuterRef("block_name"),
            neighborhood=OuterRef("neighborhood"),
        )
        .exclude(unit_details="")
        .order_by("-created_at")
        .values("unit_details")[:1]
    )
    latest_created_at = Subquery(
        base_queryset.filter(
            block_name=OuterRef("block_name"),
            neighborhood=OuterRef("neighborhood"),
        )
        .order_by("-created_at")
        .values("created_at")[:1]
    )

    highlights = (
        summary_queryset.annotate(
            latest_comment=latest_comment,
            latest_unit_details=latest_unit_details,
            latest_created_at=latest_created_at,
        )
        .order_by("-avg_overall", "-review_count")[:limit]
    )

    return Response(list(highlights))


@api_view(['GET'])
@permission_classes([AllowAny])
def block_review_buildings(request):
    queryset = BlockReview.objects.filter(
        is_approved=True,
        moderation_status=BlockReview.ModerationStatus.APPROVED,
    )

    summary_queryset = (
        queryset.values('block_name', 'neighborhood')
        .annotate(
            avg_noise=Avg('noise_rating'),
            avg_management=Avg('management_rating'),
            avg_safety=Avg('safety_rating'),
            avg_transport=Avg('transport_rating'),
            review_count=Count('block_review_id'),
        )
        .annotate(
            avg_overall=ExpressionWrapper(
                (
                    F('avg_noise')
                    + F('avg_management')
                    + F('avg_safety')
                    + F('avg_transport')
                )
                / 4.0,
                output_field=FloatField(),
            )
        )
    )

    latest_comment = Subquery(
        queryset.filter(
            block_name=OuterRef('block_name'),
            neighborhood=OuterRef('neighborhood'),
        )
        .exclude(comment='')
        .order_by('-created_at')
        .values('comment')[:1]
    )
    latest_unit_details = Subquery(
        queryset.filter(
            block_name=OuterRef('block_name'),
            neighborhood=OuterRef('neighborhood'),
        )
        .exclude(unit_details='')
        .order_by('-created_at')
        .values('unit_details')[:1]
    )
    latest_created_at = Subquery(
        queryset.filter(
            block_name=OuterRef('block_name'),
            neighborhood=OuterRef('neighborhood'),
        )
        .order_by('-created_at')
        .values('created_at')[:1]
    )

    buildings = summary_queryset.annotate(
        latest_comment=latest_comment,
        latest_unit_details=latest_unit_details,
        latest_created_at=latest_created_at,
    ).order_by('block_name', 'neighborhood')

    return Response(list(buildings))

@api_view(['GET'])
@permission_classes([AllowAny])
def home_page_stats(request):
    """
    Returns statistics for the home page:
    - Active Listings
    - Registered Students
    - Match Rate
    """
    from .models import MatchCompatibility
    
    active_listings_count = Listing.objects.filter(is_active=True).count()
    students_count = User.objects.count()
    
    avg_match_rate = MatchCompatibility.objects.aggregate(avg=Avg('compatibility_score'))['avg']
    
    if avg_match_rate:
        match_rate_val = round(avg_match_rate)
        match_rate_str = f"{match_rate_val}%"
    else:
        match_rate_str = "95%"

    return Response({
        "active_listings": f"{active_listings_count}+",
        "students": f"{students_count}+",
        "match_rate": match_rate_str
    })

def _dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@api_view(['GET'])
@permission_classes([AllowAny])
def address_provinces(request):
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT il_id AS id, il_adi AS name FROM address.iller ORDER BY il_adi'
        )
        provinces = _dictfetchall(cursor)
        cursor.execute(
            'SELECT ilce_id AS id, ilce_adi AS name, il_id FROM address.ilceler ORDER BY ilce_adi'
        )
        districts = _dictfetchall(cursor)

    districts_by_province = {}
    for district in districts:
        districts_by_province.setdefault(district['il_id'], []).append(
            {'id': district['id'], 'name': district['name']}
        )

    for province in provinces:
        province['districts'] = districts_by_province.get(province['id'], [])

    return Response(provinces)


@api_view(['GET'])
@permission_classes([AllowAny])
def address_districts(request):
    province_id = (request.query_params.get('province_id') or '').strip()
    province_name = (request.query_params.get('province') or '').strip()

    query = 'SELECT ilce_id AS id, ilce_adi AS name, il_id FROM address.ilceler'
    params = []

    if province_id:
        query += ' WHERE il_id = %s'
        params.append(province_id)
    elif province_name:
        query += ' WHERE il_id = (SELECT il_id FROM address.iller WHERE il_adi ILIKE %s LIMIT 1)'
        params.append(province_name)

    query += ' ORDER BY ilce_adi'

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        districts = _dictfetchall(cursor)

    return Response(districts)


@api_view(['GET'])
@permission_classes([AllowAny])
def address_neighborhoods(request):
    district_id = (request.query_params.get('district_id') or '').strip()
    district_name = (request.query_params.get('district') or '').strip()
    query_text = (request.query_params.get('q') or '').strip()
    limit_raw = request.query_params.get('limit', '500')

    try:
        limit = max(1, min(int(limit_raw), 1000))
    except ValueError:
        limit = 500

    if not district_id and not district_name:
        return Response({'error': 'district_id is required.'}, status=400)

    query = 'SELECT mahalle_id AS id, mahalle_adi AS name, ilce_id FROM address.mahalleler'
    params = []
    where = []

    if district_id:
        where.append('ilce_id = %s')
        params.append(district_id)
    else:
        where.append(
            'ilce_id = (SELECT ilce_id FROM address.ilceler WHERE ilce_adi ILIKE %s LIMIT 1)'
        )
        params.append(district_name)

    if query_text:
        where.append('mahalle_adi ILIKE %s')
        params.append(f'%{query_text}%')

    query += ' WHERE ' + ' AND '.join(where)
    query += ' ORDER BY mahalle_adi LIMIT %s'
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        neighborhoods = _dictfetchall(cursor)

    return Response(neighborhoods)


@api_view(['GET'])
@permission_classes([AllowAny])
def address_streets(request):
    neighborhood_id = (request.query_params.get('neighborhood_id') or '').strip()
    query_text = (request.query_params.get('q') or '').strip()
    limit_raw = request.query_params.get('limit', '50')

    try:
        limit = max(1, min(int(limit_raw), 5000))
    except ValueError:
        limit = 50

    if not neighborhood_id:
        return Response({'error': 'neighborhood_id is required.'}, status=400)

    query = 'SELECT sokak_id AS id, sokak_adi AS name, mahalle_id FROM address.sokaklar'
    params = []
    where = ['mahalle_id = %s']
    params.append(neighborhood_id)

    if query_text:
        where.append('sokak_adi ILIKE %s')
        params.append(f'%{query_text}%')

    query += ' WHERE ' + ' AND '.join(where)
    query += ' ORDER BY sokak_adi LIMIT %s'
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        streets = _dictfetchall(cursor)

    return Response(streets)


# ============================================================================
# REPORT API ENDPOINTS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_report(request):
    """
    Create a report for a user, listing, or message
    POST /api/reports/
    Body: {
        "report_type": "user|listing|message",
        "reported_user_id": int,
        "reported_listing_id": int (optional),
        "reported_message_id": int (optional),
        "description": str
    }
    """
    from .models import Report, Listing, Message

    report_type = request.data.get('report_type')
    reported_user_id = request.data.get('reported_user_id')
    reported_listing_id = request.data.get('reported_listing_id')
    reported_message_id = request.data.get('reported_message_id')
    description = request.data.get('description', '').strip()

    # Validation
    if not report_type or report_type not in ['user', 'listing', 'message', 'other']:
        return Response(
            {'error': 'Invalid report_type. Must be: user, listing, message, or other'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not description or len(description) < 10:
        return Response(
            {'error': 'Description must be at least 10 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(description) > 1000:
        return Response(
            {'error': 'Description cannot exceed 1000 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        reported_user = User.objects.get(pk=reported_user_id)

        if reported_user == request.user:
            return Response(
                {'error': 'You cannot report yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create report
        report_data = {
            'reporter': request.user,
            'reported_user': reported_user,
            'report_type': report_type,
            'description': description,
        }

        # Add optional fields
        if reported_listing_id:
            try:
                listing = Listing.objects.get(pk=reported_listing_id)
                report_data['reported_listing'] = listing
            except Listing.DoesNotExist:
                return Response(
                    {'error': 'Listing not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        if reported_message_id:
            try:
                message = Message.objects.get(pk=reported_message_id)
                # Ensure reporter is part of the conversation
                if request.user not in (message.sender, message.receiver):
                    return Response(
                        {'error': 'You cannot report this message'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                report_data['reported_message'] = message
            except Message.DoesNotExist:
                return Response(
                    {'error': 'Message not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        report = Report.objects.create(**report_data)

        return Response(
            {
                'message': 'Report submitted successfully',
                'report_id': report.report_id,
                'status': report.status
            },
            status=status.HTTP_201_CREATED
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error creating report: {str(e)}")
        return Response(
            {'error': 'Failed to create report'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_reports(request):
    """
    Get current user's submitted reports
    GET /api/reports/
    """
    from .models import Report

    reports = Report.objects.filter(
        reporter=request.user
    ).select_related(
        'reported_user', 'reported_listing', 'reported_message'
    ).order_by('-created_at')

    data = []
    for report in reports:
        data.append({
            'report_id': report.report_id,
            'report_type': report.report_type,
            'description': report.description,
            'status': report.status,
            'created_at': report.created_at,
            'resolved_at': report.resolved_at,
            'reported_user': {
                'id': report.reported_user.user_id,
                'username': report.reported_user.username,
                'email': report.reported_user.email,
            } if report.reported_user else None,
            'reported_listing': {
                'id': report.reported_listing.listing_id,
                'title': report.reported_listing.title,
            } if report.reported_listing else None,
        })

    return Response({'reports': data})


# ============================================================================
# BLOCK USER API ENDPOINTS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_user(request, user_id):
    """
    Block a user
    POST /api/block-user/<user_id>/
    """
    from .models import BlockedUser

    try:
        user_to_block = User.objects.get(pk=user_id)

        if user_to_block == request.user:
            return Response(
                {'error': 'You cannot block yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already blocked
        if BlockedUser.objects.filter(
            blocker=request.user,
            blocked=user_to_block
        ).exists():
            return Response(
                {'message': 'User already blocked'},
                status=status.HTTP_200_OK
            )

        # Create block
        BlockedUser.objects.create(
            blocker=request.user,
            blocked=user_to_block
        )

        return Response(
            {'message': f'Successfully blocked {user_to_block.username}'},
            status=status.HTTP_201_CREATED
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    """
    Unblock a user
    DELETE /api/block-user/<user_id>/
    """
    from .models import BlockedUser

    try:
        user_to_unblock = User.objects.get(pk=user_id)

        blocked_entry = BlockedUser.objects.filter(
            blocker=request.user,
            blocked=user_to_unblock
        ).first()

        if not blocked_entry:
            return Response(
                {'error': 'User is not blocked'},
                status=status.HTTP_404_NOT_FOUND
            )

        blocked_entry.delete()

        return Response(
            {'message': f'Successfully unblocked {user_to_unblock.username}'},
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def blocked_users_list(request):
    """
    Get list of blocked users
    GET /api/blocked-users/
    """
    from .models import BlockedUser

    blocked = BlockedUser.objects.filter(
        blocker=request.user
    ).select_related('blocked').order_by('-blocked_at')

    data = []
    for entry in blocked:
        data.append({
            'block_id': entry.block_id,
            'blocked_at': entry.blocked_at,
            'user': {
                'id': entry.blocked.user_id,
                'username': entry.blocked.username,
                'email': entry.blocked.email,
                'first_name': entry.blocked.first_name,
                'last_name': entry.blocked.last_name,
            }
        })

    return Response({'blocked_users': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_blocked(request, user_id):
    """
    Check if a user is blocked
    GET /api/block-user/<user_id>/check/
    """
    from .models import BlockedUser

    is_blocked = BlockedUser.objects.filter(
        blocker=request.user,
        blocked_id=user_id
    ).exists()

    return Response({'is_blocked': is_blocked})
