from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .forms import ListingForm, MessageForm, ProfileForm, ReportForm, BlockReviewForm
from .models import (
    Conversation,
    Listing,
    MatchCompatibility,
    Message,
    Profile,
    Faculty,
    Report,
    BlockReview,
    BlockedUser,
)
from .serializers import FacultySerializer
from .utils.matching import calculate_matches_for_user


def home_view(request):
    return render(
        request,
        "home.html",
        {
            "user": request.user,
        },
    )


def listing_list_view(request):
    listings = Listing.objects.filter(is_active=True).select_related("user")

    location = request.GET.get("location", "").strip()
    price_min = request.GET.get("price_min", "").strip()
    price_max = request.GET.get("price_max", "").strip()
    amenities = request.GET.get("amenities", "").strip()

    if location:
        listings = listings.filter(
            Q(title__icontains=location)
            | Q(address__icontains=location)
            | Q(neighborhood__icontains=location)
        )

    def _as_decimal(value):
        try:
            return Decimal(value)
        except (InvalidOperation, TypeError):
            return None

    min_value = _as_decimal(price_min)
    if min_value is not None:
        listings = listings.filter(rent_amount__gte=min_value)

    max_value = _as_decimal(price_max)
    if max_value is not None:
        listings = listings.filter(rent_amount__lte=max_value)

    amenity_terms = [
        term.strip()
        for term in amenities.split(",")
        if term.strip()
    ]
    for term in amenity_terms:
        listings = listings.filter(amenities__icontains=term)

    return render(
        request,
        "listings.html",
        {
            "listings": listings,
            "filters": {
                "location": location,
                "price_min": price_min,
                "price_max": price_max,
                "amenities": amenities,
                "amenity_terms": amenity_terms,
            },
        },
    )


def listing_detail_view(request, listing_id):
    listing = get_object_or_404(
        Listing.objects.select_related("user"),
        pk=listing_id,
    )
    return render(
        request,
        "listing_detail.html",
        {
            "listing": listing,
        },
    )


@login_required
def listing_create_view(request):
    if request.method == "POST":
        form = ListingForm(request.POST, request.FILES)
        if form.is_valid():
            listing = form.save(commit=False)
            listing.user = request.user
            listing.save()
            messages.success(request, "Listing created successfully.")
            return redirect("listing_detail", listing_id=listing.listing_id)
    else:
        form = ListingForm()

    return render(
        request,
        "listing_form.html",
        {
            "form": form,
            "is_edit": False,
        },
    )


@login_required
def listing_update_view(request, listing_id):
    listing = get_object_or_404(Listing, pk=listing_id, user=request.user)
    if request.method == "POST":
        form = ListingForm(request.POST, request.FILES, instance=listing)
        if form.is_valid():
            form.save()
            messages.success(request, "Listing updated successfully.")
            return redirect("listing_detail", listing_id=listing.listing_id)
    else:
        form = ListingForm(instance=listing)

    return render(
        request,
        "listing_form.html",
        {
            "form": form,
            "is_edit": True,
            "listing": listing,
        },
    )


@login_required
def listing_delete_view(request, listing_id):
    listing = get_object_or_404(Listing, pk=listing_id, user=request.user)
    if request.method == "POST":
        listing.delete()
        messages.success(request, "Listing deleted.")
        return redirect("listings")

    return render(
        request,
        "listing_confirm_delete.html",
        {
            "listing": listing,
        },
    )


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("home")
        messages.error(request, "Invalid email or password.")
    else:
        form = AuthenticationForm(request)

    return render(request, "login.html", {"form": form})


@login_required
def profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        form = ProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, "Preferences saved.")
            return redirect("profile")
        messages.error(request, "Please correct the errors below.")
    else:
        form = ProfileForm(instance=profile)

    return render(
        request,
        "profile.html",
        {
            "user": request.user,
            "form": form,
        },
    )


@login_required
def logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect("login")


def _get_or_create_conversation(user_a, user_b):
    if user_a.pk == user_b.pk:
        raise ValueError("Cannot start a conversation with yourself.")
    ordered = sorted([user_a, user_b], key=lambda u: u.pk)
    conversation, _ = Conversation.objects.get_or_create(
        user1=ordered[0],
        user2=ordered[1],
    )
    return conversation


@login_required
def conversation_list_view(request):
    conversations = (
        Conversation.objects.filter(Q(user1=request.user) | Q(user2=request.user))
        .select_related("user1", "user2")
        .order_by("-last_message_at", "-created_at")
    )

    items = []
    for convo in conversations:
        partner = convo.user2 if convo.user1_id == request.user.pk else convo.user1
        last_message = (
            convo.messages.select_related("sender").order_by("-sent_at").first()
        )
        items.append(
            {
                "conversation": convo,
                "partner": partner,
                "last_message": last_message,
            }
        )

    return render(
        request,
        "conversations.html",
        {
            "conversations": items,
        },
    )


@login_required
def conversation_start_view(request, user_id):
    UserModel = get_user_model()
    other_user = get_object_or_404(UserModel, pk=user_id)
    if other_user.pk == request.user.pk:
        messages.error(request, "You cannot start a conversation with yourself.")
        return redirect("conversations")

    conversation = _get_or_create_conversation(request.user, other_user)
    return redirect("conversation_detail", conversation_id=conversation.pk)


@login_required
def conversation_detail_view(request, conversation_id):
    conversation = get_object_or_404(
        Conversation.objects.select_related("user1", "user2"),
        pk=conversation_id,
    )
    if request.user not in (conversation.user1, conversation.user2):
        messages.error(request, "You are not part of this conversation.")
        return redirect("conversations")

    partner = conversation.user2 if conversation.user1_id == request.user.pk else conversation.user1

    conversation.messages.filter(
        receiver=request.user,
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    if request.method == "POST":
        form = MessageForm(request.POST, request.FILES)
        if form.is_valid():
            message = form.save(commit=False)
            message.sender = request.user
            message.receiver = partner
            message.conversation = conversation
            message.save()
            conversation.last_message_at = message.sent_at
            conversation.save(update_fields=["last_message_at"])
            messages.success(request, "Message sent.")
            return redirect("conversation_detail", conversation_id=conversation.pk)
        messages.error(request, "Please correct the errors below.")
    else:
        form = MessageForm()

    messages_qs = conversation.messages.select_related("sender").order_by("sent_at")

    return render(
        request,
        "conversation_detail.html",
        {
            "conversation": conversation,
            "partner": partner,
            "messages": messages_qs,
            "form": form,
        },
    )


@login_required
def matches_view(request):
    try:
        user_profile = request.user.profile
    except Profile.DoesNotExist:
        user_profile = None

    # Check if profile exists - no need for verification anymore
    if user_profile is None:
        messages.info(
            request,
            "You need to complete your profile before we can generate matches.",
        )
        return redirect("profile")

    # Ensure the requesting user has fresh scores before rendering.
    calculate_matches_for_user(request.user)

    matches_qs = (
        MatchCompatibility.objects.filter(
            Q(user1=request.user, user2__is_verified=True, user2__profile__isnull=False)
            | Q(
                user2=request.user,
                user1__is_verified=True,
                user1__profile__isnull=False,
            )
        )
        .select_related("user1__profile", "user2__profile")
        .order_by("-compatibility_score", "-calculated_at")[:20]
    )

    display_matches = []
    for match in matches_qs:
        partner = match.user2 if match.user1_id == request.user.pk else match.user1
        display_matches.append(
            {
                "user": partner,
                "profile": getattr(partner, "profile", None),
                "score": int(match.compatibility_score),
                "criteria": match.matching_criteria or {},
            }
        )

    return render(
        request,
        "matches.html",
        {
            "user": request.user,
            "matches": display_matches,
        },
    )


class FacultyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        faculties = Faculty.objects.prefetch_related('departments').all()
        serializer = FacultySerializer(faculties, many=True)
        return Response(serializer.data)


class TopMatchesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            user_profile = user.profile
        except Profile.DoesNotExist:
            user_profile = None

        # Check if profile exists - no need for verification anymore
        if user_profile is None:
            return Response(
                {
                    "detail": "Profile required to view matches.",
                },
                status=400,
            )

        calculate_matches_for_user(user)

        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), 50))
        except (TypeError, ValueError):
            limit = 20

        matches_qs = (
            MatchCompatibility.objects.filter(
                Q(user1=user, user2__is_verified=True, user2__profile__isnull=False)
                | Q(
                    user2=user,
                    user1__is_verified=True,
                    user1__profile__isnull=False,
                )
            )
            .select_related("user1__profile", "user2__profile")
            .order_by("-compatibility_score", "-calculated_at")[:limit]
        )

        results = []
        for match in matches_qs:
            partner = match.user2 if match.user1_id == user.pk else match.user1
            partner_profile = getattr(partner, "profile", None)
            results.append(
                {
                    "user": {
                        "id": partner.pk,
                        "email": partner.email,
                        "username": partner.username,
                        "first_name": getattr(partner_profile, "first_name", partner.first_name),
                        "last_name": getattr(partner_profile, "last_name", partner.last_name),
                        "department": [d.name for d in partner_profile.departments.all()] if partner_profile else [],
                        "faculty": [d.faculty.name for d in partner_profile.departments.all()] if partner_profile else [],
                        "profile_photo_url": getattr(partner_profile, "profile_photo_url", ""),
                    },
                    "compatibility_score": float(match.compatibility_score),
                    "matching_criteria": match.matching_criteria or {},
                }
            )

        return Response({"results": results, "count": len(results)})


# ============================================================================
# REPORT SYSTEM VIEWS
# ============================================================================


@login_required
def report_create_view(request, report_type, object_id):
    """
    Create a report for a user, listing, or message.
    report_type: 'user', 'listing', or 'message'
    object_id: ID of the object being reported
    """
    UserModel = get_user_model()

    reported_user = None
    reported_listing = None
    reported_message = None

    if report_type == "user":
        reported_user = get_object_or_404(UserModel, pk=object_id)
        if reported_user == request.user:
            messages.error(request, "You cannot report yourself.")
            return redirect("home")
    elif report_type == "listing":
        reported_listing = get_object_or_404(Listing, pk=object_id)
        reported_user = reported_listing.user
    elif report_type == "message":
        reported_message = get_object_or_404(Message, pk=object_id)
        # Ensure the reporter is part of the conversation
        if request.user not in (reported_message.sender, reported_message.receiver):
            messages.error(request, "You cannot report this message.")
            return redirect("conversations")
        reported_user = reported_message.sender
    else:
        messages.error(request, "Invalid report type.")
        return redirect("home")

    if request.method == "POST":
        form = ReportForm(request.POST)
        if form.is_valid():
            report = form.save(commit=False)
            report.reporter = request.user
            report.reported_user = reported_user
            report.reported_listing = reported_listing
            report.reported_message = reported_message
            report.save()
            messages.success(
                request,
                "Report submitted successfully. Our team will review it shortly.",
            )
            return redirect("home")
    else:
        initial_data = {"report_type": report_type}
        form = ReportForm(initial=initial_data)

    context = {
        "form": form,
        "report_type": report_type,
        "reported_object": reported_user or reported_listing or reported_message,
    }
    return render(request, "report_form.html", context)


@login_required
def report_list_view(request):
    """View reports filed by the current user"""
    reports = Report.objects.filter(reporter=request.user).order_by("-created_at")
    return render(request, "report_list.html", {"reports": reports})


# ============================================================================
# BLOCK USER SYSTEM VIEWS
# ============================================================================


@login_required
def block_user_view(request, user_id):
    """Block a user"""
    UserModel = get_user_model()
    user_to_block = get_object_or_404(UserModel, pk=user_id)

    if user_to_block == request.user:
        messages.error(request, "You cannot block yourself.")
        return redirect("home")

    # Check if already blocked
    if BlockedUser.objects.filter(
        blocker=request.user, blocked=user_to_block
    ).exists():
        messages.info(request, "You have already blocked this user.")
        return redirect("blocked_users")

    BlockedUser.objects.create(blocker=request.user, blocked=user_to_block)
    messages.success(request, f"You have blocked {user_to_block.username}.")
    return redirect("blocked_users")


@login_required
def unblock_user_view(request, user_id):
    """Unblock a user"""
    UserModel = get_user_model()
    user_to_unblock = get_object_or_404(UserModel, pk=user_id)

    blocked_entry = get_object_or_404(
        BlockedUser, blocker=request.user, blocked=user_to_unblock
    )
    blocked_entry.delete()
    messages.success(request, f"You have unblocked {user_to_unblock.username}.")
    return redirect("blocked_users")


@login_required
def blocked_users_view(request):
    """View all users blocked by the current user"""
    blocked_users = BlockedUser.objects.filter(blocker=request.user).select_related(
        "blocked"
    )
    return render(request, "blocked_users.html", {"blocked_users": blocked_users})


# ============================================================================
# BLOCK REVIEW SYSTEM VIEWS
# ============================================================================


@login_required
def block_review_create_view(request):
    """Create a new block/site review"""
    if request.method == "POST":
        form = BlockReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.save()
            messages.success(
                request,
                "Review submitted successfully! It will be visible after moderation.",
            )
            return redirect("block_reviews")
    else:
        form = BlockReviewForm()

    return render(request, "block_review_form.html", {"form": form, "is_edit": False})


@login_required
def block_review_update_view(request, review_id):
    """Update an existing block review"""
    review = get_object_or_404(BlockReview, pk=review_id, user=request.user)

    if request.method == "POST":
        form = BlockReviewForm(request.POST, instance=review)
        if form.is_valid():
            updated_review = form.save(commit=False)
            # Reset moderation status when edited
            updated_review.moderation_status = "pending"
            updated_review.is_approved = False
            updated_review.save()
            messages.success(request, "Review updated and re-submitted for moderation.")
            return redirect("block_reviews")
    else:
        form = BlockReviewForm(instance=review)

    return render(
        request,
        "block_review_form.html",
        {"form": form, "is_edit": True, "review": review},
    )


@login_required
def block_review_delete_view(request, review_id):
    """Delete a block review"""
    review = get_object_or_404(BlockReview, pk=review_id, user=request.user)

    if request.method == "POST":
        review.delete()
        messages.success(request, "Review deleted successfully.")
        return redirect("block_reviews")

    return render(request, "block_review_confirm_delete.html", {"review": review})


def block_reviews_view(request):
    """
    View all approved block reviews.
    Users can filter by neighborhood or block name.
    """
    reviews = BlockReview.objects.filter(is_approved=True).select_related("user")

    # Filtering
    neighborhood = request.GET.get("neighborhood", "").strip()
    block_name = request.GET.get("block_name", "").strip()

    if neighborhood:
        reviews = reviews.filter(neighborhood__icontains=neighborhood)
    if block_name:
        reviews = reviews.filter(block_name__icontains=block_name)

    reviews = reviews.order_by("-created_at")

    return render(
        request,
        "block_reviews.html",
        {
            "reviews": reviews,
            "filters": {"neighborhood": neighborhood, "block_name": block_name},
        },
    )


@login_required
def my_block_reviews_view(request):
    """View current user's block reviews (all statuses)"""
    reviews = BlockReview.objects.filter(user=request.user).order_by("-created_at")
    return render(request, "my_block_reviews.html", {"reviews": reviews})
