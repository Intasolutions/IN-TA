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
            "created_at",
            "updated_at",
        )


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
