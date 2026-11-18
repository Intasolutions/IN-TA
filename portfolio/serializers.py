import os

from rest_framework import serializers
from .models import Project, Tag, GalleryItem


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("name", "slug")


class ProjectSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    hero = serializers.ImageField(read_only=True)
    case_study = serializers.BooleanField(source="has_case_study", read_only=True)
    services = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "slug",
            "role",
            "summary",
            "hero",
            "tags",
            "external_url",
            "featured",
            "order",
            "is_active",
            "case_study",
            "challenge",
            "solution",
            "outcome",
            "stack",
            "meta_description",
            "services",
            "created_at",
            "updated_at",
        )

    def get_services(self, obj):
        """The services this project used (Services > a service > its projects), for links from the project's page."""
        return [{"title": s.title, "slug": s.slug} for s in obj.services.all() if s.is_active]


class GalleryItemSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        # Prefer the uploaded image URL when present and the file exists on disk.
        try:
            if obj.image and hasattr(obj.image, "url"):
                try:
                    # Some storage backends don't expose .path; guard with try/except.
                    if hasattr(obj.image, "path") and os.path.exists(obj.image.path):
                        return obj.image.url
                except Exception:
                    # If we can't check the path but there is a URL, assume it's valid.
                    return obj.image.url
        except Exception:
            pass

        # No picture rather than a stock one: the site shows the item without an image.
        return None

    class Meta:
        model = GalleryItem
        fields = ("id", "title", "image", "href", "order")
