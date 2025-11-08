from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.db.models import Q
from django.shortcuts import redirect, render

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .forms import ProfileForm
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
    return render(
        request,
        "listings.html",
        {
            "listings": listings,
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
