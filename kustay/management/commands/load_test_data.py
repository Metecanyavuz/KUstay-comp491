from datetime import date
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from kustay.models import Profile, Listing
from kustay.utils.matching import calculate_matches_for_user

User = get_user_model()


class Command(BaseCommand):
    help = 'Load test data for Railway deployment testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test data before loading new data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing test data...'))
            # Delete test users (this will cascade delete profiles and listings)
            test_emails = [
                'ahmet.yilmaz@ku.edu.tr',
                'elif.demir@ku.edu.tr',
                'can.ozturk@gmail.com',
                'zeynep.kaya@hotmail.com',
                'murat.sahin@outlook.com',
            ]
            User.objects.filter(email__in=test_emails).delete()
            self.stdout.write(self.style.SUCCESS('Test data cleared!'))

        self.stdout.write(self.style.SUCCESS('Creating test users and profiles...'))

        # KU User 1: Ahmet Yılmaz
        ahmet = self._create_user(
            email='ahmet.yilmaz@ku.edu.tr',
            username='ahmet_ku',
            password='Test123!',
            user_type='KU_Student',
            is_verified=True
        )
        self._create_profile(
            user=ahmet,
            first_name='Ahmet',
            last_name='Yılmaz',
            department='Computer Engineering',
            faculty='Engineering',
            phone_number='+90 555 111 2233',
            budget_min=Decimal('8000'),
            budget_max=Decimal('12000'),
            preferred_neighborhoods=['Sarıyer', 'Beşiktaş', 'Şişli'],
            sleep_schedule='early_bird',
            cleanliness_level='high',
            room_type_preference='private',
            move_in_date=date(2025, 2, 1),
            smoker=False,
            pets=False,
            lifestyle_notes='Sabah erken kalkıp akşam erken yatan, düzenli ve temiz bir yaşam tarzım var. Sessiz ortamda çalışmayı severim.'
        )

        # KU User 2: Elif Demir
        elif_user = self._create_user(
            email='elif.demir@ku.edu.tr',
            username='elif_ku',
            password='Test123!',
            user_type='KU_Student',
            is_verified=True
        )
        self._create_profile(
            user=elif_user,
            first_name='Elif',
            last_name='Demir',
            department='Business Administration',
            faculty='Economics and Administrative Sciences',
            phone_number='+90 555 222 3344',
            budget_min=Decimal('9000'),
            budget_max=Decimal('13000'),
            preferred_neighborhoods=['Beşiktaş', 'Şişli', 'Levent'],
            sleep_schedule='early_bird',
            cleanliness_level='high',
            room_type_preference='private',
            move_in_date=date(2025, 2, 15),
            smoker=False,
            pets=True,
            lifestyle_notes='Düzenli yaşamayı seven, sabah egzersiz yapan biriyim. Kedim var ve sessiz bir ev arıyorum.'
        )

        # External User 1: Can Öztürk
        can = self._create_user(
            email='can.ozturk@gmail.com',
            username='can_external',
            password='Test123!',
            user_type='External_Student',
            is_verified=True
        )
        self._create_profile(
            user=can,
            first_name='Can',
            last_name='Öztürk',
            department='Architecture',
            faculty='',
            phone_number='+90 555 333 4455',
            budget_min=Decimal('10000'),
            budget_max=Decimal('15000'),
            preferred_neighborhoods=['Sarıyer', 'Beşiktaş', 'Etiler'],
            sleep_schedule='flexible',
            cleanliness_level='medium',
            room_type_preference='shared',
            move_in_date=date(2025, 3, 1),
            smoker=True,
            pets=False,
            lifestyle_notes='Esnek çalışma saatlerim var, sosyal biriyim. Sigara içiyorum ama balkonda içebilirim.'
        )

        # External User 2: Zeynep Kaya
        zeynep = self._create_user(
            email='zeynep.kaya@hotmail.com',
            username='zeynep_external',
            password='Test123!',
            user_type='External_Student',
            is_verified=True
        )
        self._create_profile(
            user=zeynep,
            first_name='Zeynep',
            last_name='Kaya',
            department='Graphic Design',
            faculty='',
            phone_number='+90 555 444 5566',
            budget_min=Decimal('7000'),
            budget_max=Decimal('11000'),
            preferred_neighborhoods=['Şişli', 'Mecidiyeköy', 'Levent'],
            sleep_schedule='night_owl',
            cleanliness_level='medium',
            room_type_preference='private',
            move_in_date=date(2025, 2, 20),
            smoker=False,
            pets=False,
            lifestyle_notes='Gece geç saatlere kadar çalışırım. Kulaklıkla müzik dinleyerek çalışmayı severim.'
        )

        # External User 3: Murat Şahin
        murat = self._create_user(
            email='murat.sahin@outlook.com',
            username='murat_external',
            password='Test123!',
            user_type='External_Student',
            is_verified=True
        )
        self._create_profile(
            user=murat,
            first_name='Murat',
            last_name='Şahin',
            department='Law',
            faculty='',
            phone_number='+90 555 555 6677',
            budget_min=Decimal('12000'),
            budget_max=Decimal('18000'),
            preferred_neighborhoods=['Etiler', 'Levent', 'Nişantaşı'],
            sleep_schedule='night_owl',
            cleanliness_level='low',
            room_type_preference='entire_place',
            move_in_date=date(2025, 4, 1),
            smoker=False,
            pets=True,
            lifestyle_notes='Hukuk stajyeri olarak geç saatlere kadar çalışıyorum. Köpeğim var ve geniş bir yer arıyorum.'
        )

        self.stdout.write(self.style.SUCCESS('✓ Created 5 test users with profiles'))

        # Create Listings
        self.stdout.write(self.style.SUCCESS('Creating test listings...'))

        # Listing 1 - Ahmet's listing
        self._create_listing(
            user=ahmet,
            title='Sarıyer\'de 2+1 Dairede Oda Arkadaşı Aranıyor',
            description='Sarıyer\'de deniz manzaralı 2+1 dairemde oda arkadaşı arıyorum. Sabah erken kalkan, düzenli biri tercih ederim.',
            listing_type='apartment',
            address='Rumeli Hisarı Mah. Yahya Kemal Cad. No:45 Sarıyer/İstanbul',
            neighborhood='Sarıyer',
            latitude=Decimal('41.0841'),
            longitude=Decimal('29.0548'),
            rent_amount=Decimal('10000'),
            available_from=date(2025, 2, 1),
            room_type='private',
            total_rooms=2,
            available_rooms=1,
            amenities=['wifi', 'washing_machine', 'dishwasher', 'balcony'],
            house_rules='Sigara içilmez, sessiz saatlere uyulur'
        )

        # Listing 2 - Elif's listing
        self._create_listing(
            user=elif_user,
            title='Beşiktaş\'ta Evcil Hayvan Dostu Daire',
            description='Kedimle birlikte yaşadığım geniş dairede oda paylaşacak arkadaş arıyorum.',
            listing_type='apartment',
            address='Abbasağa Mah. Barbaros Bulvarı No:78 Beşiktaş/İstanbul',
            neighborhood='Beşiktaş',
            latitude=Decimal('41.0422'),
            longitude=Decimal('29.0044'),
            rent_amount=Decimal('11000'),
            available_from=date(2025, 2, 15),
            room_type='private',
            total_rooms=3,
            available_rooms=1,
            amenities=['wifi', 'furnished', 'pet_friendly', 'parking', 'security'],
            house_rules='Evcil hayvan dostu, temizliğe dikkat eden biri arıyorum'
        )

        # Listing 3 - Can's listing
        self._create_listing(
            user=can,
            title='Etiler\'de Lüks Rezidansta Paylaşımlı Oda',
            description='Site içi sosyal tesis ve havuz olan rezidansta paylaşımlı odada yerler var.',
            listing_type='apartment',
            address='Nispetiye Mah. Aytar Cad. No:12 Etiler/İstanbul',
            neighborhood='Etiler',
            latitude=Decimal('41.0767'),
            longitude=Decimal('29.0278'),
            rent_amount=Decimal('13000'),
            available_from=date(2025, 3, 1),
            room_type='shared',
            total_rooms=2,
            available_rooms=2,
            amenities=['wifi', 'gym', 'pool', 'security', 'concierge'],
            house_rules='Sosyal ortam, balkon sigara içme alanı mevcut'
        )

        # Listing 4 - Zeynep's listing
        self._create_listing(
            user=zeynep,
            title='Şişli Merkezde Stüdyo Daire Paylaşımı',
            description='Metro\'ya 2 dakika mesafede, gece çalışanlar için uygun sessiz daire',
            listing_type='apartment',
            address='Halaskargazi Cad. No:156 Şişli/İstanbul',
            neighborhood='Şişli',
            latitude=Decimal('41.0532'),
            longitude=Decimal('28.9864'),
            rent_amount=Decimal('9000'),
            available_from=date(2025, 2, 20),
            room_type='private',
            total_rooms=2,
            available_rooms=1,
            amenities=['wifi', 'furnished', 'central_heating', 'elevator'],
            house_rules='Gece geç saatlerde çalışanlara uygun, sessiz ortam'
        )

        # Listing 5 - Murat's listing
        self._create_listing(
            user=murat,
            title='Levent\'te Evcil Hayvan Dostu Bahçeli Villa',
            description='Köpekler için bahçesi olan villa tipinde müstakil ev. Geniş yaşam alanı.',
            listing_type='house',
            address='1. Levent Mah. Kısıklı Sok. No:8 Beşiktaş/İstanbul',
            neighborhood='Levent',
            latitude=Decimal('41.0785'),
            longitude=Decimal('28.9995'),
            rent_amount=Decimal('16000'),
            available_from=date(2025, 4, 1),
            room_type='entire_place',
            total_rooms=4,
            available_rooms=3,
            amenities=['wifi', 'garden', 'parking', 'pet_friendly', 'dishwasher', 'laundry_room'],
            house_rules='Köpek sahibi, geç saatlere kadar çalışan profesyoneller için uygun'
        )

        # Listing 6 - Ahmet's 2nd listing
        self._create_listing(
            user=ahmet,
            title='KU Kampüse Yürüme Mesafesinde Oda',
            description='Kampüse 10 dakika yürüme mesafesinde, öğrencilere özel ucuz seçenek',
            listing_type='room',
            address='Rumeli Feneri Yolu No:23 Sarıyer/İstanbul',
            neighborhood='Sarıyer',
            latitude=Decimal('41.1635'),
            longitude=Decimal('29.0587'),
            rent_amount=Decimal('8500'),
            available_from=date(2025, 2, 1),
            room_type='private',
            total_rooms=1,
            available_rooms=1,
            amenities=['wifi', 'desk', 'wardrobe'],
            house_rules='Öğrencilere özel, sessiz çalışma ortamı'
        )

        # Listing 7 - Elif's 2nd listing
        self._create_listing(
            user=elif_user,
            title='Şişli\'de Spor Salonu Olan Sitede Daire',
            description='Site içi gym ve yüzme havuzu olan modern komplekste daire paylaşımı',
            listing_type='apartment',
            address='Bozkurt Mah. Cumhuriyet Cad. No:89 Şişli/İstanbul',
            neighborhood='Şişli',
            latitude=Decimal('41.0612'),
            longitude=Decimal('28.9889'),
            rent_amount=Decimal('12000'),
            available_from=date(2025, 3, 1),
            room_type='private',
            total_rooms=2,
            available_rooms=1,
            amenities=['wifi', 'gym', 'pool', 'furnished', 'security', 'parking'],
            house_rules='Sporla ilgilenen, düzenli yaşam tarzı olan kişiler tercihimiz'
        )

        self.stdout.write(self.style.SUCCESS('✓ Created 7 test listings'))

        # Calculate matches
        self.stdout.write(self.style.SUCCESS('Calculating compatibility matches...'))

        all_users = [ahmet, elif_user, can, zeynep, murat]
        total_matches = 0

        for user in all_users:
            matches_count = calculate_matches_for_user(user)
            total_matches += matches_count
            self.stdout.write(f'  → {user.email}: {matches_count} matches calculated')

        self.stdout.write(self.style.SUCCESS(f'✓ Calculated {total_matches} total match records'))

        # Print summary
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST DATA LOADED SUCCESSFULLY!'))
        self.stdout.write('='*70)
        self.stdout.write('\nTest Users Created:')
        self.stdout.write('  KU Students:')
        self.stdout.write('    - ahmet.yilmaz@ku.edu.tr (password: Test123!)')
        self.stdout.write('    - elif.demir@ku.edu.tr (password: Test123!)')
        self.stdout.write('  External Students:')
        self.stdout.write('    - can.ozturk@gmail.com (password: Test123!)')
        self.stdout.write('    - zeynep.kaya@hotmail.com (password: Test123!)')
        self.stdout.write('    - murat.sahin@outlook.com (password: Test123!)')
        self.stdout.write('\nYou can now test:')
        self.stdout.write('  ✓ Login with any of the above credentials')
        self.stdout.write('  ✓ View and filter listings (7 listings created)')
        self.stdout.write('  ✓ Check match compatibility scores')
        self.stdout.write('  ✓ Test messaging between users')
        self.stdout.write('  ✓ View listings on map with coordinates')
        self.stdout.write('  ✓ Test all app features with realistic data')
        self.stdout.write('='*70 + '\n')

    def _create_user(self, email, username, password, user_type, is_verified):
        """Create or get a user"""
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'user_type': user_type,
                'is_verified': is_verified,
            }
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(f'  ✓ Created user: {email}')
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ User already exists: {email}'))
        return user

    def _create_profile(self, user, **kwargs):
        """Create or update a user profile"""
        profile, created = Profile.objects.update_or_create(
            user=user,
            defaults=kwargs
        )
        action = 'Created' if created else 'Updated'
        self.stdout.write(f'    → {action} profile for {user.email}')
        return profile

    def _create_listing(self, user, **kwargs):
        """Create a listing"""
        listing = Listing.objects.create(user=user, **kwargs)
        self.stdout.write(f'  ✓ Created listing: {listing.title}')
        return listing
