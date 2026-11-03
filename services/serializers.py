from rest_framework import serializers
from portfolio.models import Project
from .models import Service, ServiceFAQ, ServiceImage, Feature, Technology, Benefit


def absolute_url(serializer, image):
    if not image:
        return None
    request = serializer.context.get('request')
    return request.build_absolute_uri(image.url) if request else image.url


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ("name", "slug")


class TechnologySerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Technology
        fields = ("name", "slug", "logo")

    def get_logo(self, obj):
        return absolute_url(self, obj.logo)


class BenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Benefit
        fields = ("id", "title", "description")


class ServiceImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ServiceImage
        fields = ("id", "image", "caption", "alt_text")

    def get_image(self, obj):
        return absolute_url(self, obj.image)


class ServiceFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceFAQ
        fields = ("id", "question", "answer")


class ServiceProjectSerializer(serializers.ModelSerializer):
    hero = serializers.SerializerMethodField()
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")

    class Meta:
        model = Project
        fields = ("id", "title", "slug", "role", "summary", "hero", "tags", "external_url")

    def get_hero(self, obj):
        return absolute_url(self, obj.hero)


class ServiceSerializer(serializers.ModelSerializer):
    features = FeatureSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)
    benefits = BenefitSerializer(many=True, read_only=True)
    gallery = ServiceImageSerializer(many=True, read_only=True)
    faqs = ServiceFAQSerializer(many=True, read_only=True)
    projects = serializers.SerializerMethodField()
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
            "gallery",
            "faqs",
            "projects",
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

    def get_projects(self, obj):
        live = [p for p in obj.projects.all() if p.is_active]
        return ServiceProjectSerializer(live, many=True, context=self.context).data

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
