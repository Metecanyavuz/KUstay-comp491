from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Tuple

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q, QuerySet
from django.utils import timezone

from ..models import BlockedUser, MatchCompatibility, Profile

# Weighting model inspired by qualitative roommate research.
COMPONENT_WEIGHTS = {
    "sleep_schedule": 5,
    "cleanliness": 10,
    "room_type": 20,
    "budget": 25,
    "location": 30,
    "lifestyle": 10,
}

BUDGET_MAX_FALLBACK = Decimal("100000")
MIN_SCORE_TO_STORE = 10  # Low-feasibility matches are skipped.


def get_candidate_users(for_user) -> QuerySet:
    """
    Returns verified users with a profile that pass hard constraints.
    Filters:
        * No self-match.
        * Exclude blocked users (both directions).
        * Require overlapping budget bands when available.
        * Hook for future campus/city filters via `feasibility_filters`.
    """
    UserModel = get_user_model()

    requester_profile = _get_profile(for_user)
    if requester_profile is None:
        return UserModel.objects.none()

    base_qs = (
        UserModel.objects.filter(is_verified=True, profile__isnull=False)
        .exclude(pk=for_user.pk)
        .select_related("profile")
    )

    blocked_pairs = BlockedUser.objects.filter(
        Q(blocker=for_user) | Q(blocked=for_user)
    ).values_list("blocker_id", "blocked_id")
    blocked_ids = {
        user_id
        for pair in blocked_pairs
        for user_id in pair
        if user_id is not None and user_id != for_user.pk
    }
    if blocked_ids:
        base_qs = base_qs.exclude(pk__in=blocked_ids)

    user_min, user_max = _normalize_budget_range(requester_profile)
    # Require budget overlap only when the requester provided a bounded range.
    if user_min is not None and user_max is not None and user_max < BUDGET_MAX_FALLBACK:
        base_qs = base_qs.filter(
            profile__budget_max__gte=user_min,
            profile__budget_min__lte=user_max,
        )

    # Placeholder for future feasibility hooks (campus/city, etc.)
    feasibility_filters = models.Q()
    base_qs = base_qs.filter(feasibility_filters)

    return base_qs


def compute_compatibility(
    profile1: Profile, profile2: Profile
) -> Tuple[int, Dict[str, Dict[str, object]]]:
    """
    Deterministic compatibility score between two profiles with an explainable breakdown.
    Scores are capped to [0, 100] and leverage content-based heuristics so ML/CF models
    can be layered in later without touching call sites.
    """
    breakdown: Dict[str, Dict[str, object]] = {}
    total_score = 0

    sleep_score, sleep_reason = _score_sleep_schedule(profile1, profile2)
    breakdown["sleep_schedule"] = {
        "score": sleep_score,
        "weight": COMPONENT_WEIGHTS["sleep_schedule"],
        "reason": sleep_reason,
    }
    total_score += sleep_score

    clean_score, clean_reason = _score_cleanliness(profile1, profile2)
    breakdown["cleanliness"] = {
        "score": clean_score,
        "weight": COMPONENT_WEIGHTS["cleanliness"],
        "reason": clean_reason,
    }
    total_score += clean_score

    room_score, room_reason = _score_room_type(profile1, profile2)
    breakdown["room_type"] = {
        "score": room_score,
        "weight": COMPONENT_WEIGHTS["room_type"],
        "reason": room_reason,
    }
    total_score += room_score

    budget_score, budget_reason = _score_budget(profile1, profile2)
    breakdown["budget"] = {
        "score": budget_score,
        "weight": COMPONENT_WEIGHTS["budget"],
        "reason": budget_reason,
    }
    total_score += budget_score

    location_score, location_reason = _score_location(profile1, profile2)
    breakdown["location"] = {
        "score": location_score,
        "weight": COMPONENT_WEIGHTS["location"],
        "reason": location_reason,
    }
    total_score += location_score

    lifestyle_score, lifestyle_reason = _score_lifestyle(profile1, profile2)
    breakdown["lifestyle"] = {
        "score": lifestyle_score,
        "weight": COMPONENT_WEIGHTS["lifestyle"],
        "reason": lifestyle_reason,
    }
    total_score += lifestyle_score

    final_score = max(0, min(100, int(round(total_score))))
    breakdown["total"] = {
        "score": final_score,
        "reason": "Weighted blend of lifestyle, feasibility, and preference overlap.",
    }
    return final_score, breakdown


def calculate_matches_for_user(user) -> int:
    """
    Calculates or refreshes match scores for a given user. Returns number of matches updated.
    """
    if not user.is_verified:
        return 0

    requester_profile = _get_profile(user)
    if requester_profile is None:
        return 0

    candidates = get_candidate_users(user)
    updated = 0

    for candidate in candidates:
        candidate_profile = _get_profile(candidate)
        if candidate_profile is None:
            continue

        score, breakdown = compute_compatibility(requester_profile, candidate_profile)
        if score < MIN_SCORE_TO_STORE:
            continue

        user_low, user_high = sorted([user, candidate], key=lambda u: u.pk)
        MatchCompatibility.objects.update_or_create(
            user1=user_low,
            user2=user_high,
            defaults={
                "compatibility_score": _to_decimal(score),
                "matching_criteria": breakdown,
                "calculated_at": timezone.now(),
            },
        )
        updated += 1

    return updated


def calculate_all_matches() -> int:
    """
    Utility for cron/management commands. Recalculates matches for all eligible users.
    Returns total number of updates performed (may double-count mirrored pairs, which is OK).
    """
    UserModel = get_user_model()
    eligible_users = UserModel.objects.filter(
        is_verified=True, profile__isnull=False
    ).select_related("profile")

    total = 0
    for user in eligible_users.iterator():
        total += calculate_matches_for_user(user)
    return total


# --- Scoring helpers ----------------------------------------------------- #


def _score_sleep_schedule(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["sleep_schedule"]
    schedule1 = profile1.sleep_schedule or "flexible"
    schedule2 = profile2.sleep_schedule or "flexible"

    if schedule1 == schedule2:
        score = weight
        reason = f"Both prefer {schedule1.replace('_', ' ')} schedules."
    elif "flexible" in (schedule1, schedule2):
        score = int(round(weight * 0.75))
        reason = "At least one of you is flexible with sleep schedules."
    else:
        score = int(round(weight * 0.2))
        reason = "Different sleep rhythms; plan for compromises."
    return score, reason


def _score_cleanliness(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["cleanliness"]
    levels = {"low": 0, "medium": 1, "high": 2}
    level1 = levels.get(profile1.cleanliness_level, 1)
    level2 = levels.get(profile2.cleanliness_level, 1)
    delta = abs(level1 - level2)

    if delta == 0:
        score = weight
        reason = "You expect similar cleanliness standards."
    elif delta == 1:
        score = int(round(weight * 0.6))
        reason = "Slight difference in cleanliness expectations."
    else:
        score = int(round(weight * 0.1))
        reason = "Very different cleanliness expectations."
    return score, reason


def _score_room_type(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["room_type"]
    pref1 = profile1.room_type_preference or "private"
    pref2 = profile2.room_type_preference or "private"

    if pref1 == pref2:
        score = weight
        reason = f"Both prefer {pref1.replace('_', ' ')} setups."
    elif {"shared", "private"} == {pref1, pref2}:
        score = int(round(weight * 0.6))
        reason = "One prefers shared rooms while the other prefers private; workable if flexible."
    elif "entire_place" in {pref1, pref2} and "private" in {pref1, pref2}:
        score = int(round(weight * 0.4))
        reason = "One prefers an entire place while the other prefers a private room."
    else:
        score = int(round(weight * 0.2))
        reason = "Room type expectations may be hard to reconcile."
    return score, reason


def _score_budget(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["budget"]
    range1 = _normalize_budget_range(profile1)
    range2 = _normalize_budget_range(profile2)
    overlap = _budget_overlap(range1, range2)

    if overlap <= 0:
        return 0, "Budget ranges currently do not overlap."

    combined_min = min(range1[0], range2[0])
    combined_max = max(range1[1], range2[1])
    denominator = combined_max - combined_min or Decimal("1")
    ratio = float(overlap / denominator)
    score = int(round(weight * min(1.0, ratio)))
    reason = (
        f"Budgets overlap roughly TRY {_format_decimal(overlap)} between "
        f"TRY {_format_decimal(max(range1[0], range2[0]))} and "
        f"TRY {_format_decimal(min(range1[1], range2[1]))}."
    )
    return score, reason


def _score_location(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["location"]
    neighborhoods1 = _normalize_neighborhoods(profile1.preferred_neighborhoods)
    neighborhoods2 = _normalize_neighborhoods(profile2.preferred_neighborhoods)

    if not neighborhoods1 or not neighborhoods2:
        score = int(round(weight * 0.4))
        reason = "One of you has not shared neighborhood preferences yet."
        return score, reason

    shared = neighborhoods1 & neighborhoods2
    if shared:
        coverage = len(shared) / min(len(neighborhoods1), len(neighborhoods2))
        score = int(round(weight * min(1.0, 0.6 + 0.4 * coverage)))
        reason = f"Shared interest in {', '.join(sorted(shared))}."
    else:
        score = int(round(weight * 0.2))
        reason = "Neighborhood preferences do not overlap yet."
    return score, reason


def _score_lifestyle(profile1: Profile, profile2: Profile) -> Tuple[int, str]:
    weight = COMPONENT_WEIGHTS["lifestyle"]
    penalties = 0
    reasons: list[str] = []

    if profile1.smoker != profile2.smoker:
        penalties += int(round(weight * 0.5))
        reasons.append("Different smoking habits.")

    if profile1.pets != profile2.pets:
        penalties += int(round(weight * 0.5))
        reasons.append("Pets situation may not align.")

    score = max(weight - penalties, 0)
    if score == weight:
        reason = "Aligned on smoking habits and pet expectations."
    else:
        reason = " ".join(reasons) or "Lifestyle preferences partially align."
    return score, reason


def _normalize_budget_range(profile: Profile) -> Tuple[Decimal, Decimal]:
    min_val = _to_decimal(profile.budget_min)
    max_val = _to_decimal(profile.budget_max)

    if min_val < 0:
        min_val = Decimal("0")

    if max_val <= 0:
        max_val = BUDGET_MAX_FALLBACK if min_val == 0 else min_val

    if max_val < min_val:
        min_val, max_val = max_val, min_val

    if min_val == 0 and max_val == 0:
        max_val = BUDGET_MAX_FALLBACK

    return min_val, max_val


def _budget_overlap(range1: Tuple[Decimal, Decimal], range2: Tuple[Decimal, Decimal]) -> Decimal:
    lower_bound = max(range1[0], range2[0])
    upper_bound = min(range1[1], range2[1])
    if upper_bound <= lower_bound:
        return Decimal("0")
    return upper_bound - lower_bound


def _normalize_neighborhoods(values) -> set[str]:
    if not values:
        return set()
    return {str(value).strip().lower() for value in values if str(value).strip()}


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(value)


def _format_decimal(value: Decimal) -> str:
    quantized = value.quantize(Decimal("1."), rounding=ROUND_HALF_UP)
    return f"{quantized:,.0f}"


def _get_profile(user) -> Profile | None:
    try:
        return user.profile
    except Profile.DoesNotExist:
        return None
