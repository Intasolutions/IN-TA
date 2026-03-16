from rest_framework import serializers
from .models import Service, Feature, Technology, Benefit


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ("name", "slug")


class TechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = Technology
        fields = ("name", "slug")


class BenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Benefit
        fields = ("id", "title", "description")


class ServiceSerializer(serializers.ModelSerializer):
    features = FeatureSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)
    benefits = BenefitSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "long_description",
            "features",
            "technologies",
            "benefits",
            "image",
            "color",
            "icon_key",
            "icon_path",
            "meta_title",
            "meta_description",
            "focus_keyword",
            "image_alt",
            "order",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
