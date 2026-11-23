from datetime import timedelta
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from blog.models import Subscriber
from home import retention

from .models import ChatConversation, ConsentRecord, ContactMessage


def age(model, pk, days, field='created_at'):
    """Backdates a record (auto_now fields can't be set through save)"""
    model.objects.filter(pk=pk).update(**{field: timezone.now() - timedelta(days=days)})


class ConsentApiTests(TestCase):
    URL = '/api/contact/consents/'

    def test_saves_an_answer(self):
        res = self.client.post(self.URL, {'browser': 'abc123DEF456', 'allowed': True, 'version': '2026-11-23.1a2b', 'page': '/services'}, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        record = ConsentRecord.objects.get()
        self.assertEqual((record.browser, record.allowed, record.version, record.page), ('abc123DEF456', True, '2026-11-23.1a2b', '/services'))

    def test_refuses_odd_browser_codes(self):
        for code in ('short', 'has spaces in it', '<script>alert(1)</script>', 'x' * 41):
            res = self.client.post(self.URL, {'browser': code, 'allowed': False, 'version': 'v'}, content_type='application/json')
            self.assertEqual(res.status_code, 400, code)
        self.assertFalse(ConsentRecord.objects.exists())

    def test_nobody_can_read_them_through_the_api(self):
        ConsentRecord.objects.create(browser='abc123DEF456', allowed=True, version='v')
        self.assertEqual(self.client.get(self.URL).status_code, 405)


@override_settings(DATA_RETENTION_DAYS=730)
class RetentionTests(TestCase):
    def setUp(self):
        retention._last_run = None

    def make_old_and_new(self):
        old_msg = ContactMessage.objects.create(name='Old', email='old@example.com', message='An old message')
        new_msg = ContactMessage.objects.create(name='New', email='new@example.com', message='A new message')
        old_enq = Subscriber.objects.create(name='Old', interest='Website')
        old_chat = ChatConversation.objects.create(name='Old', token='t1')
        live_chat = ChatConversation.objects.create(name='Talking', token='t2')
        old_choice = ConsentRecord.objects.create(browser='abc123DEF456', allowed=True, version='v')
        age(ContactMessage, old_msg.pk, 731)
        age(ContactMessage, new_msg.pk, 700)
        age(Subscriber, old_enq.pk, 800)
        age(ChatConversation, old_chat.pk, 731, 'updated_at')
        # started long ago, but its last message is recent: a chat counts from its last message
        age(ChatConversation, live_chat.pk, 900)
        age(ConsentRecord, old_choice.pk, 731)
        return new_msg, live_chat

    def test_deletes_only_what_is_past_the_period(self):
        new_msg, live_chat = self.make_old_and_new()
        counts = retention.purge_old()
        self.assertEqual(counts, {'Contact messages': 1, 'enquiries': 1, 'Robot chats': 1, 'Cookie choices': 1})
        self.assertEqual(list(ContactMessage.objects.all()), [new_msg])
        self.assertEqual(list(ChatConversation.objects.all()), [live_chat])
        self.assertFalse(Subscriber.objects.exists())
        self.assertFalse(ConsentRecord.objects.exists())

    def test_dry_run_command_only_counts(self):
        self.make_old_and_new()
        out = StringIO()
        call_command('purge_old_data', '--dry-run', stdout=out)
        self.assertIn('Would delete', out.getvalue())
        self.assertEqual(ContactMessage.objects.count(), 2)
        call_command('purge_old_data', stdout=StringIO())
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_a_new_record_runs_it_at_most_once_a_day(self):
        with mock.patch.object(retention, 'purge_old', return_value={}) as purge:
            with self.captureOnCommitCallbacks(execute=True):
                ContactMessage.objects.create(name='A', email='a@example.com', message='First message')
            with self.captureOnCommitCallbacks(execute=True):
                ContactMessage.objects.create(name='B', email='b@example.com', message='Second message')
            # an update isn't a new record
            with self.captureOnCommitCallbacks(execute=True):
                ContactMessage.objects.first().save()
        self.assertEqual(purge.call_count, 1)

    def test_opening_an_admin_list_runs_it(self):
        self.make_old_and_new()
        admin = get_user_model().objects.create_superuser('boss', 'boss@example.com', 'a-long-test-password')
        self.client.force_login(admin)
        self.assertEqual(self.client.get('/admin/contact/consentrecord/').status_code, 200)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertFalse(ConsentRecord.objects.exists())

    def test_a_failing_clean_up_never_breaks_a_form(self):
        with mock.patch.object(retention, 'purge_old', side_effect=RuntimeError('database away')):
            with self.captureOnCommitCallbacks(execute=True):
                ContactMessage.objects.create(name='A', email='a@example.com', message='Still saved')
        self.assertEqual(ContactMessage.objects.count(), 1)
