from rest_framework import serializers
from .models import Service, Feature


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ("name", "slug")


class ServiceSerializer(serializers.ModelSerializer):
    features = FeatureSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "long_description",
            "features",
            "color",
            "icon_path",
            "icon_svg",
            "order",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")
