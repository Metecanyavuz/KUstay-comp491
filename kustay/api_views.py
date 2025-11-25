from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from datetime import timedelta

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Listing, Message, Profile, User
from .serializers import (
    ConversationDetailSerializer,
    ConversationSerializer,
    ListingSerializer,
    MessageSerializer,
    ProfileSerializer,
)
from django.views.decorators.csrf import ensure_csrf_cookie

import re


class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().select_related("user")
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
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


class ConversationViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          viewsets.GenericViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

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

        serializer = MessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            receiver=partner,
            message_text=serializer.validated_data["message_text"],
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
    """Send email verification to KU students"""
    verification_token = get_random_string(64)
    user.verification_token = verification_token
    user.save()
    
    # Frontend URL - change this to your production URL when deploying
    verify_url = f"http://localhost:3000/verify-email?token={verification_token}"
    
    # Email subject
    subject = 'Verify Your KUstay Account'
    
    # Plain text message
    message = f'''
Hello {user.username},

Welcome to KUstay! Please verify your email address to access all features of the platform.

Click the link below to verify your email:
{verify_url}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
KUstay Team
    '''
    
    # HTML message (optional but looks better)
    html_message = f'''
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #667eea;">Welcome to KUstay!</h2>
                <p>Hello <strong>{user.username}</strong>,</p>
                <p>Thank you for joining KUstay. Please verify your email address to access all features of the platform.</p>
                <div style="margin: 30px 0;">
                    <a href="{verify_url}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 12px 30px;
                              text-decoration: none;
                              border-radius: 5px;
                              display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 24 hours.
                </p>
                <p style="color: #666; font-size: 14px;">
                    If you did not create this account, please ignore this email.
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
    
    # Send email
    try:
        from django.core.mail import send_mail
        send_mail(
            subject=subject,
            message=message,
            from_email='noreply@kustay.com',
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error sending verification email: {e}")


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
        reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
        
        # Send email
        send_mail(
            'Password Reset Request',
            f'Click the link to reset your password: {reset_url}\n\nThis link expires in 1 hour.',
            'noreply@kustay.com',
            [email],
            fail_silently=False,
        )
        
        return Response({'message': 'Reset email sent'}, status=200)
    except User.DoesNotExist:
        # Return success even if user doesn't exist (security best practice)
        return Response({'message': 'Reset email sent'}, status=200)
    except Exception as e:
        return Response({'error': 'Failed to send email'}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_view(request):
    token = request.data.get('token')
    
    try:
        user = User.objects.get(verification_token=token)
        
        # Only KU students can be verified
        if user.user_type == 'KU_Student' and (user.email.endswith('@ku.edu.tr') or user.email.endswith('@ku.edu')):
            user.is_verified = True
            user.verification_token = ''  # Clear the token
            user.save()
            
            return Response({'message': 'Email verified successfully'}, status=200)
        else:
            return Response({'error': 'Invalid user type for verification'}, status=400)
            
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired token'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    token = request.data.get('token')
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
