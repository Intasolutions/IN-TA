import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from .models import ClientLogo

MEDIA = tempfile.mkdtemp()


def png(name='logo.png'):
    buffer = BytesIO()
    Image.new('RGBA', (8, 8), (1, 68, 181, 255)).save(buffer, 'PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


@override_settings(MEDIA_ROOT=MEDIA)
class ClientLogoTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def test_api_lists_active_logos_in_order(self):
        ClientLogo.objects.create(name='Second', logo=png(), order=2, description='Runs second')
        ClientLogo.objects.create(name='First', logo=png(), order=1)
        ClientLogo.objects.create(name='Hidden', logo=png(), order=0, is_active=False)

        data = self.client.get('/api/home/clients/').json()

        self.assertEqual([c['name'] for c in data], ['First', 'Second'])
        self.assertEqual(set(data[0]), {'id', 'name', 'logo', 'description'})
        self.assertEqual(data[0]['description'], '')
        self.assertEqual(data[1]['description'], 'Runs second')
        self.assertIn('clients/', data[0]['logo'])

    def test_logo_can_be_uploaded_from_the_admin(self):
        admin = get_user_model().objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)

        self.assertEqual(self.client.get('/admin/home/clientlogo/add/').status_code, 200)
        response = self.client.post('/admin/home/clientlogo/add/', {'name': 'Acme', 'logo': png(), 'description': 'Hospital software', 'order': 3, 'is_active': 'on'})
        self.assertEqual(response.status_code, 302)

        saved = ClientLogo.objects.get(name='Acme')
        self.assertEqual(saved.order, 3)
        self.assertEqual(self.client.get('/admin/home/clientlogo/').status_code, 200)
        self.assertEqual(self.client.get(f'/admin/home/clientlogo/{saved.pk}/change/').status_code, 200)


class SiteCountsTests(TestCase):
    def test_site_api_counts_the_projects_on_the_work_page(self):
        from portfolio.models import Project

        Project.objects.create(title='One', slug='one')
        Project.objects.create(title='Two', slug='two')
        Project.objects.create(title='Hidden', slug='hidden', is_active=False)

        counts = self.client.get('/api/home/site/').json()['counts']

        self.assertEqual(counts, {'projects': 2})


class QuestionTests(TestCase):
    """The shared questions: on the pages they are given to, a few per page, each told to search engines on one page."""

    def ask(self, question, pages='', services=(), **kw):
        from .models import Question

        q = Question.objects.create(question=question, answer=kw.pop('answer', f'{question} answered.'), pages=pages, **kw)
        q.services.set(services)
        return q

    def service(self, slug, order=0, **kw):
        from services.models import Service

        return Service.objects.create(title=slug.title(), slug=slug, short_description=f'{slug} in short', order=order, **kw)

    def test_each_page_gets_its_active_questions_in_order(self):
        self.ask('Second?', 'home', order=2, answer='Yes.\r\n\r\nReally.')
        self.ask('First?', 'home,contact', order=1)
        self.ask('Hidden?', 'home', is_active=False)
        self.ask('About us?', 'about')

        questions = self.client.get('/api/home/site/').json()['questions']

        self.assertEqual([q['q'] for q in questions['home']], ['First?', 'Second?'])
        self.assertEqual(questions['home'][1]['a'], 'Yes.\n\nReally.')
        self.assertEqual([q['q'] for q in questions['contact']], ['First?'])
        self.assertEqual([q['q'] for q in questions['about']], ['About us?'])
        self.assertEqual(questions['services'], [])

    def test_a_question_on_several_pages_is_marked_up_on_one(self):
        web = self.service('web')
        self.ask('Shared?', 'home,contact')  # automatic: Contact is more specific than Home
        self.ask('Chosen?', 'home,contact', main_page='home')
        self.ask('Service?', 'home', services=[web])  # automatic: its service page

        site = self.client.get('/api/home/site/').json()['questions']
        main = {page: {q['q']: q['main'] for q in items} for page, items in site.items()}
        self.assertEqual(main['home'], {'Shared?': False, 'Chosen?': True, 'Service?': False})
        self.assertEqual(main['contact'], {'Shared?': True, 'Chosen?': False})

        faqs = self.client.get('/api/services/web/').json()['faqs']
        self.assertEqual([(f['question'], f['main']) for f in faqs], [('Service?', True)])

    def test_the_first_active_service_page_is_the_main_one(self):
        first, second = self.service('first', order=1), self.service('second', order=2)
        self.ask('Both?', services=[second, first])

        self.assertEqual(self.client.get('/api/services/first/').json()['faqs'][0]['main'], True)
        self.assertEqual(self.client.get('/api/services/second/').json()['faqs'][0]['main'], False)

    def test_a_page_shows_only_its_first_few(self):
        from .models import Question

        for n in range(Question.LIMITS['contact'] + 2):
            self.ask(f'Q{n}?', 'contact', order=n)

        contact = self.client.get('/api/home/site/').json()['questions']['contact']
        self.assertEqual([q['q'] for q in contact], [f'Q{n}?' for n in range(Question.LIMITS['contact'])])

    def test_the_older_website_still_gets_the_home_questions(self):
        self.ask('First?', 'home')
        self.assertEqual(self.client.get('/api/home/site/').json()['faq'], [{'q': 'First?', 'a': 'First? answered.'}])

    def test_no_questions_means_empty_lists(self):
        site = self.client.get('/api/home/site/').json()
        self.assertEqual(site['faq'], [])
        self.assertEqual(site['questions'], {'home': [], 'services': [], 'about': [], 'contact': []})

    def test_the_admin_form_keeps_pages_and_checks_the_main_page(self):
        from .admin import QuestionForm

        web = self.service('web')
        ok = QuestionForm(data={'question': 'Q?', 'answer': 'A.', 'pages': ['contact', 'home'], 'services': [web.pk], 'main_page': '', 'order': 1, 'is_active': True})
        self.assertTrue(ok.is_valid(), ok.errors)
        saved = ok.save()
        self.assertEqual(saved.pages, 'home,contact')
        self.assertEqual(list(saved.services.all()), [web])

        nowhere = QuestionForm(data={'question': 'Q?', 'answer': 'A.', 'main_page': '', 'order': 1, 'is_active': True})
        self.assertFalse(nowhere.is_valid())
        draft = QuestionForm(data={'question': 'Q?', 'answer': 'A.', 'main_page': '', 'order': 1})
        self.assertTrue(draft.is_valid(), draft.errors)
        wrong = QuestionForm(data={'question': 'Q?', 'answer': 'A.', 'pages': ['home'], 'main_page': 'about', 'order': 1, 'is_active': True})
        self.assertFalse(wrong.is_valid())
        self.assertIn('main_page', wrong.errors)

    def test_the_admin_list_warns_about_full_pages(self):
        from django.contrib.auth import get_user_model

        from .models import Question

        for n in range(Question.LIMITS['about'] + 1):
            self.ask(f'Q{n}?', 'about', order=n)
        self.client.force_login(get_user_model().objects.create_superuser('admin', 'a@example.com', 'pw'))

        page = self.client.get('/admin/home/question/')

        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'About has 6 questions and shows the first 5')
        self.assertEqual(self.client.get(f'/admin/home/question/{Question.objects.first().pk}/change/').status_code, 200)
