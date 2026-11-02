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
