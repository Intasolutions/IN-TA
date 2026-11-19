from django.db.models import Prefetch
from rest_framework import serializers

from portfolio.models import Project
from services.models import Service, Technology

from .models import ClientLogo, HeroMetric, Question, SiteSettings, Testimonial
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


def _card(service):
    """A service's card on the home page, with its title and short description wherever the card's own are empty."""
    return {
        'n': service.home_card,
        'track': service.home_card_track,
        'title': service.home_card_title or service.title,
        'text': service.home_card_text or service.short_description,
        'tags': [t.strip() for t in service.home_card_tags.split(',') if t.strip()],
        'icon': service.home_card_icon,
    }


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
    counts = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()
    faq = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = ['phone', 'email', 'whatsapp', 'address', 'map', 'hours', 'socials', 'metrics', 'text', 'services', 'stack', 'counts', 'questions', 'faq', 'updated_at']

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
        """The services in their order, each with its home page card if it has one (null if not)."""
        fields = ('title', 'slug', 'short_description', 'home_card', 'home_card_track', 'home_card_title', 'home_card_text', 'home_card_tags', 'home_card_icon')
        return [
            {'title': s.title, 'slug': s.slug, 'card': _card(s) if s.home_card else None}
            for s in Service.objects.filter(is_active=True).order_by('order', 'title').only(*fields)
        ]

    def get_counts(self, obj):
        """Figures the website states as facts (the opening's lines): the projects on the Work page."""
        return {'projects': Project.objects.filter(is_active=True).count()}

    def _questions(self):
        """Each page's questions (Questions & answers in the admin), the first few by order, worked out once per request.
        `main`: search engines are told about the question on that page (each question is marked up on one page only)."""
        if not hasattr(self, '_by_page'):
            active = Service.objects.filter(is_active=True).order_by('order', 'title')
            questions = Question.objects.filter(is_active=True).prefetch_related(Prefetch('services', queryset=active))
            self._by_page = {page: [] for page, _ in Question.PAGES}
            for q in questions:
                main = q.main_key(q.services.all())
                for page in q.page_list:
                    if len(self._by_page[page]) < Question.LIMITS[page]:
                        # (line breaks typed in the admin arrive as \r\n)
                        self._by_page[page].append({'q': q.question.strip(), 'a': q.answer.replace('\r\n', '\n').strip(), 'main': main == page})
        return self._by_page

    def get_questions(self, obj):
        return self._questions()

    def get_faq(self, obj):
        """The home page's questions as the website before the shared questions read them (kept while it is replaced)."""
        return [{'q': q['q'], 'a': q['a']} for q in self._questions()['home']]

    def get_stack(self, obj):
        request = self.context.get('request')
        tools = Technology.objects.filter(on_about_page=True).exclude(about_group='').order_by('about_order', 'name')
        return [
            {'name': t.name, 'slug': t.slug, 'logo': _url(request, t.logo), 'group': t.about_group, 'use': t.about_use}
            for t in tools
        ]
