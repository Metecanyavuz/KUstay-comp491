from decimal import Decimal, InvalidOperation

from django.db.models import Q

from rest_framework import permissions, viewsets

from .models import Listing
from .serializers import ListingSerializer


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
