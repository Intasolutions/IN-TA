from django.db.models import Prefetch
from rest_framework import viewsets, filters

from home.models import Question

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for public Services listing and detail (lookup by slug)."""
    queryset = (
        Service.objects.filter(is_active=True)
        .prefetch_related(
            "features", "technologies", "benefits", "capabilities", "gallery", "projects__tags",
            # the page's questions in their order, with the services each one is on (to work out its main page)
            Prefetch("questions", queryset=Question.objects.order_by("order", "id").prefetch_related(
                Prefetch("services", queryset=Service.objects.order_by("order", "title"))
            )),
        )
        .order_by("order", "title")
    )
    serializer_class = ServiceSerializer
    lookup_field = "slug"

    # simple search + ordering support
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "short_description", "long_description", "features__name"]
    ordering_fields = ["order", "title", "created_at"]


