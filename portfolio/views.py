from rest_framework import viewsets, filters
from .models import Project, GalleryItem
from .serializers import ProjectSerializer, GalleryItemSerializer


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    # (tags in one query for all projects, instead of one per project)
    queryset = Project.objects.filter(is_active=True).prefetch_related("tags").order_by("-featured", "order", "title")
    serializer_class = ProjectSerializer
    lookup_field = "slug"

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "summary", "role", "tags__name"]
    ordering_fields = ["order", "title", "created_at"]


class GalleryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GalleryItem.objects.filter(is_active=True).order_by("order")
    serializer_class = GalleryItemSerializer
