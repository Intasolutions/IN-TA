import importlib

from django.apps import apps as django_apps
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.forms.models import model_to_dict
from django.test import RequestFactory, TestCase

from home.models import SiteSettings

from .models import Service

place_services = importlib.import_module('services.migrations.0008_service_board_and_home_card').place_services

SLUGS = ('ai-integration-model-training', 'web-development', 'software-development', 'mobile-app', 'Marketing', 'ui-ux-design', 'seo-aeo-geo-services', 'media-production')


def make(slug, **extra):
    return Service.objects.create(title=slug.replace('-', ' ').title(), slug=slug, short_description=f'{slug} in short', **extra)


class PlacesTests(TestCase):
    """Which service sits on each part of the Services page board, and which holds each home page card."""

    def test_migration_puts_every_service_where_the_site_showed_it(self):
        for slug in SLUGS:
            make(slug)
        settings = SiteSettings.load()
        settings.page_text = {'home_cap2_title': 'Changed in the admin', 'home_cap_title': 'Not a card'}
        settings.save()

        place_services(django_apps, None)

        parts = dict(Service.objects.values_list('slug', 'board_part'))
        self.assertEqual(parts, {
            'ai-integration-model-training': 'ai', 'web-development': 'web', 'software-development': 'software', 'mobile-app': 'mobile',
            'Marketing': 'marketing', 'ui-ux-design': 'ui', 'seo-aeo-geo-services': 'seo', 'media-production': 'media',
        })
        self.assertEqual(Service.objects.get(slug='seo-aeo-geo-services').board_label, 'SEO / AEO / GEO')
        cards = dict(Service.objects.exclude(home_card=None).values_list('home_card', 'slug'))
        self.assertEqual(cards, {1: 'ai-integration-model-training', 2: 'web-development', 3: 'software-development', 4: 'mobile-app', 5: 'seo-aeo-geo-services'})
        web = Service.objects.get(slug='web-development')
        self.assertEqual(web.home_card_title, 'Changed in the admin')  # wording changed in Site settings is kept
        self.assertEqual(web.home_card_track, 'Track 02 // Web Runtimes')
        self.assertEqual((web.home_card_tags, web.home_card_icon), ('Next.js, TypeScript, Tailwind', 'code'))

    def test_migration_leaves_places_already_taken_alone(self):
        make('web-development', board_part='ai', home_card=1)
        make('ai-integration-model-training')
        place_services(django_apps, None)
        ai = Service.objects.get(slug='ai-integration-model-training')
        self.assertEqual((ai.board_part, ai.home_card), ('', None))

    def test_a_part_or_card_holds_one_service(self):
        make('one', board_part='web', home_card=2)
        with self.assertRaises(IntegrityError), transaction.atomic():
            make('two', board_part='web')
        with self.assertRaises(IntegrityError), transaction.atomic():
            make('three', home_card=2)
        make('four')
        make('five')  # any number of services can be off the board and without a card

    def test_site_api_sends_each_card_with_its_fallbacks(self):
        make('web-development', home_card=2, home_card_track='Track 02', home_card_tags='Next.js, , TypeScript ', home_card_icon='code', order=2)
        make('mobile-app', home_card=4, home_card_title='Mobile Ecosystems', home_card_text='Apps.', order=1)
        make('hidden', home_card=1, is_active=False)
        make('Marketing', order=3)

        services = self.client.get('/api/home/site/').json()['services']

        self.assertEqual([s['slug'] for s in services], ['mobile-app', 'web-development', 'Marketing'])
        web = services[1]['card']
        self.assertEqual(web, {'n': 2, 'track': 'Track 02', 'title': 'Web Development', 'text': 'web-development in short', 'tags': ['Next.js', 'TypeScript'], 'icon': 'code'})
        self.assertEqual(services[0]['card']['title'], 'Mobile Ecosystems')
        self.assertEqual(services[0]['card']['text'], 'Apps.')
        self.assertIsNone(services[2]['card'])

    def test_services_api_sends_each_part(self):
        make('web-development', board_part='web', board_label='Web')
        make('extra')
        data = {s['slug']: s for s in self.client.get('/api/services/').json()}
        self.assertEqual((data['web-development']['board_part'], data['web-development']['board_label']), ('web', 'Web'))
        self.assertEqual((data['extra']['board_part'], data['extra']['board_label']), ('', ''))


class AdminTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(self.user)
        self.model_admin = admin.site._registry[Service]

    def form(self, instance, **changes):
        data = {k: v for k, v in model_to_dict(instance).items() if v is not None and k not in ('features', 'technologies', 'benefits', 'projects', 'image', 'secondary_image')}
        data.update(changes)
        request = RequestFactory().get('/')
        request.user = self.user
        return self.model_admin.get_form(request, instance)(data=data, instance=instance)

    def test_a_service_holding_a_place_cannot_be_hidden(self):
        held = make('web-development', board_part='web', home_card=2)
        form = self.form(held, is_active=False)
        self.assertFalse(form.is_valid())
        self.assertIn('home page card 2 and the Network block', str(form.errors))
        # cleared in the same save, it can
        self.assertTrue(self.form(held, is_active=False, board_part='', home_card='').is_valid())

    def test_a_service_holding_a_place_cannot_be_deleted(self):
        held = make('web-development', home_card=2)
        free = make('extra')
        request = RequestFactory().get('/')
        request.user = self.user
        *_, protected = self.model_admin.get_deleted_objects([held, free], request)
        self.assertEqual(len(protected), 1)
        self.assertIn('Web Development: it holds home page card 2', protected[0])

    def test_list_warns_about_empty_places(self):
        make('web-development', board_part='web', home_card=2)
        page = self.client.get('/admin/services/service/').content.decode()
        self.assertIn('No service has home page card 1, 3, 4, 5', page)
        self.assertIn('Neural engine', page)
        self.assertNotIn('Network block', page.split('No service sits on')[1].split('.')[0])

    def test_change_page_offers_the_services_as_the_first_option(self):
        held = make('web-development')
        make('mobile-app')
        page = self.client.get(f'/admin/services/service/{held.pk}/change/').content.decode()
        self.assertIn('<option value="Mobile App">Mobile App</option>', page)
        self.assertIn('Part on the board', page)
        self.assertIn('Card on the home page', page)


class EnquiryTests(TestCase):
    """The "Have a project in mind?" form: its options are the services."""

    def post(self, interest):
        return self.client.post('/api/blog/subscribe/', {'name': 'Asha', 'phone': '+91 94475 95381', 'interest': interest}, content_type='application/json')

    def test_accepts_a_listed_service_or_an_old_option(self):
        Service.objects.create(title='Digital Marketing', slug='Marketing', short_description='Ads')
        self.assertEqual(self.post('Digital Marketing').status_code, 201)
        self.assertEqual(self.post('System Architecture').status_code, 201)  # what pages built before the change send

    def test_refuses_anything_else(self):
        make('hidden', is_active=False)
        self.assertEqual(self.post('Hidden').status_code, 400)
        self.assertEqual(self.post('Something made up').status_code, 400)
