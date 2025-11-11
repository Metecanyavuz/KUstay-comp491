from django.core.management.base import BaseCommand

from kustay.utils.matching import calculate_all_matches


class Command(BaseCommand):
    help = "Recalculate compatibility scores for all verified profiles."

    def handle(self, *args, **options):
        total = calculate_all_matches()
        self.stdout.write(self.style.SUCCESS(f"Recomputed {total} match entries."))
