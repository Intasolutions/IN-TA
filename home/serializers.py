from rest_framework import serializers

from services.models import Service, Technology

from .models import ClientLogo, HeroMetric, SiteSettings, Testimonial
from .site_text import changed_text


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = '__all__'


class ClientLogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLogo
        fields = ['id', 'name', 'logo', 'description']


class HeroMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroMetric
        fields = ['label', 'value', 'unit', 'note']


def _url(request, file):
    if not file:
        return None
    url = file.url
    return request.build_absolute_uri(url) if request and url.startswith('/') else url


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Everything the website shows about the company, in one request: details, wording, the footer's services and the About orbit."""

    address = serializers.SerializerMethodField()
    map = serializers.SerializerMethodField()
    hours = serializers.SerializerMethodField()
    socials = serializers.SerializerMethodField()
    metrics = HeroMetricSerializer(many=True, read_only=True)
    text = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    stack = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = ['phone', 'email', 'address', 'map', 'hours', 'socials', 'metrics', 'text', 'services', 'stack', 'updated_at']

    def get_address(self, obj):
        return {k: getattr(obj, k) for k in ('street', 'locality', 'district', 'region', 'postal_code', 'country')}

    def get_map(self, obj):
        return {'lat': float(obj.latitude), 'lng': float(obj.longitude), 'url': obj.map_url}

    def get_hours(self, obj):
        days = [int(d) for d in obj.open_days.split(',') if d.strip().isdigit()]
        return {'days': days, 'opens': obj.opens_at.strftime('%H:%M'), 'closes': obj.closes_at.strftime('%H:%M')}

    def get_socials(self, obj):
        return {k: getattr(obj, f'{k}_url') for k in ('linkedin', 'instagram', 'facebook', 'x', 'youtube')}

    def get_text(self, obj):
        return changed_text(obj.page_text)

    def get_services(self, obj):
        return list(Service.objects.filter(is_active=True).order_by('order', 'title').values('title', 'slug'))

    def get_stack(self, obj):
        request = self.context.get('request')
        tools = Technology.objects.filter(on_about_page=True).exclude(about_group='').order_by('about_order', 'name')
        return [
            {'name': t.name, 'slug': t.slug, 'logo': _url(request, t.logo), 'group': t.about_group, 'use': t.about_use}
            for t in tools
        ]
