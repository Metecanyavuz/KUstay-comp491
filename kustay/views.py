from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .forms import ListingForm, ProfileForm
from .models import Listing, MatchCompatibility, Profile
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


@login_required
def matches_view(request):
    try:
        user_profile = request.user.profile
    except Profile.DoesNotExist:
        user_profile = None

    if not request.user.is_verified or user_profile is None:
        messages.info(
            request,
            "You need a verified profile before we can generate matches.",
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


class TopMatchesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            user_profile = user.profile
        except Profile.DoesNotExist:
            user_profile = None

        if not user.is_verified or user_profile is None:
            return Response(
                {
                    "detail": "Verified profile required to view matches.",
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
                        "first_name": getattr(partner_profile, "first_name", partner.first_name),
                        "last_name": getattr(partner_profile, "last_name", partner.last_name),
                        "department": getattr(partner_profile, "department", ""),
                        "faculty": getattr(partner_profile, "faculty", ""),
                    },
                    "compatibility_score": float(match.compatibility_score),
                    "matching_criteria": match.matching_criteria or {},
                }
            )

        return Response({"results": results, "count": len(results)})
