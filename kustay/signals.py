from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=Profile)
def refresh_matches_on_profile_save(sender, instance: Profile, **kwargs):
    """
    Keep compatibility scores fresh whenever a profile is created or updated.
    """
    user = instance.user
    if not user.is_verified:
        return

    from .utils.matching import calculate_matches_for_user

    calculate_matches_for_user(user)
