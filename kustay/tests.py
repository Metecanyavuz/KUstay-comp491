from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import MatchCompatibility, Profile
from .utils.matching import calculate_matches_for_user, compute_mutual_compatibility


class MatchingTests(TestCase):
    def setUp(self):
        self.User = get_user_model()

    def _profile(
        self,
        username: str,
        sleep_schedule="early_bird",
        cleanliness_level="high",
        room_type_preference="private",
        budget_min=5000,
        budget_max=8000,
        preferred_neighborhoods=None,
        smoker=False,
        pets=False,
    ):
        preferred_neighborhoods = preferred_neighborhoods or ["levent"]
        user = self.User.objects.create(
            email=f"{username}@test.com",
            username=username,
            user_type="KU_Student",
            is_verified=True,
        )
        return Profile.objects.create(
            user=user,
            first_name=username,
            last_name="User",
            sleep_schedule=sleep_schedule,
            cleanliness_level=cleanliness_level,
            room_type_preference=room_type_preference,
            budget_min=Decimal(budget_min),
            budget_max=Decimal(budget_max),
            preferred_neighborhoods=preferred_neighborhoods,
            smoker=smoker,
            pets=pets,
        )

    def test_high_alignment_scores_high(self):
        profile1 = self._profile("aligned1")
        profile2 = self._profile(
            "aligned2",
            preferred_neighborhoods=["levent", "besiktas"],
            budget_min=5200,
            budget_max=8200,
        )

        score, _ = compute_mutual_compatibility(profile1, profile2)
        self.assertGreaterEqual(score, 85)

    def test_mismatch_penalizes_score(self):
        profile1 = self._profile(
            "mismatch1",
            sleep_schedule="early_bird",
            cleanliness_level="high",
            room_type_preference="private",
            budget_min=8000,
            budget_max=10000,
            preferred_neighborhoods=["levent"],
            smoker=False,
            pets=False,
        )
        profile2 = self._profile(
            "mismatch2",
            sleep_schedule="night_owl",
            cleanliness_level="low",
            room_type_preference="shared",
            budget_min=2000,
            budget_max=3000,
            preferred_neighborhoods=["kadikoy"],
            smoker=True,
            pets=True,
        )

        score, _ = compute_mutual_compatibility(profile1, profile2)
        self.assertLess(score, 35)

    def test_calculate_matches_persists_and_is_idempotent(self):
        profile1 = self._profile("owner", preferred_neighborhoods=["etiler"])
        profile2 = self._profile("candidate", preferred_neighborhoods=["etiler", "levent"])

        updated = calculate_matches_for_user(profile1.user)
        self.assertEqual(updated, 1)

        match = MatchCompatibility.objects.get()
        self.assertGreater(match.compatibility_score, Decimal("0"))
        self.assertLessEqual(match.compatibility_score, Decimal("100"))
        self.assertIsInstance(match.matching_criteria, dict)

        updated_again = calculate_matches_for_user(profile1.user)
        self.assertEqual(updated_again, 1)
        self.assertEqual(MatchCompatibility.objects.count(), 1)
