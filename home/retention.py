"""How long the visitors' details are kept: DATA_RETENTION_DAYS in settings (730 = the 24 months the Privacy page
promises), counted from when a message or enquiry arrived, a robot chat last changed, or a cookie choice was made.
After that they're deleted.

There's no scheduler on the free hosting plan, so the deletion runs by itself, at most once a day per server process:
when a new message, enquiry, chat or cookie choice arrives, and when the team opens one of their lists in the admin.
`python manage.py purge_old_data` runs it by hand (with --dry-run it only counts).
"""
import logging
import threading
import time
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save
from django.utils import timezone

logger = logging.getLogger(__name__)

DAY = 24 * 60 * 60
_lock = threading.Lock()
_last_run = None  # time.monotonic() of the last run in this process


def kept():
    """Each kind of visitor record, with the date field its age is counted from"""
    from blog.models import Subscriber
    from contact.models import ChatConversation, ConsentRecord, ContactMessage

    return (
        (ContactMessage, 'created_at'),
        (Subscriber, 'created_at'),
        (ChatConversation, 'updated_at'),  # a chat counts from its last message
        (ConsentRecord, 'created_at'),
    )


def purge_old(dry_run=False):
    """Deletes (or with dry_run, counts) everything older than DATA_RETENTION_DAYS. Returns {name: count}."""
    cutoff = timezone.now() - timedelta(days=settings.DATA_RETENTION_DAYS)
    counts = {}
    for model, field in kept():
        old = model.objects.filter(**{f'{field}__lt': cutoff})
        counts[str(model._meta.verbose_name_plural)] = old.count() if dry_run else old.delete()[0]
    return counts


def purge_if_due():
    """purge_old(), unless it already ran in this process during the last day. Never raises."""
    global _last_run
    with _lock:
        now = time.monotonic()
        if _last_run is not None and now - _last_run < DAY:
            return
        _last_run = now
    try:
        counts = purge_old()
        if any(counts.values()):
            logger.info('Deleted visitor records older than %s days: %s', settings.DATA_RETENTION_DAYS, counts)
    except Exception:  # a failed clean-up must never break a form or the admin
        logger.exception('Deleting old visitor records failed')


def _after_new(sender, created, **kwargs):
    if created:
        transaction.on_commit(purge_if_due)


def connect():
    """Runs the clean-up when a new visitor record arrives (see HomeConfig.ready)"""
    for model, _ in kept():
        post_save.connect(_after_new, sender=model, dispatch_uid=f'retention-{model._meta.label_lower}')


class RetentionAdminMixin:
    """For the admin lists of visitor records: opening one also runs the daily clean-up"""

    def changelist_view(self, request, extra_context=None):
        purge_if_due()
        return super().changelist_view(request, extra_context)
