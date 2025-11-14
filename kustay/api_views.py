from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from datetime import timedelta

from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Listing, User
from .serializers import ListingSerializer

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
    
    # Send verification email
    if user_type == 'KU_Student':
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
    
    verify_url = f"http://localhost:3000/verify-email?token={verification_token}"
    
    send_mail(
        'Verify Your KUstay Account',
        f'Click to verify: {verify_url}',
        'noreply@kustay.com',
        [user.email],
    )


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