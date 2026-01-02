from rest_framework import viewsets, filters
from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for public Services listing and detail (lookup by slug)."""
    queryset = Service.objects.filter(is_active=True).order_by("order", "title")
    serializer_class = ServiceSerializer
    lookup_field = "slug"

    # simple search + ordering support
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "short_description", "long_description", "features__name"]
    ordering_fields = ["order", "title", "created_at"]


