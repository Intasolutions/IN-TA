"""Tells the website to refresh whenever its content changes here, so an edit in the admin shows on the next visit.

The website caches what it reads from this API (5 minutes to an hour). After any save or delete of website content, this
calls its refresh address (app/api/revalidate/route.ts) once, a moment after the save, in the background. It needs two
settings, from the environment: FRONTEND_REVALIDATE_URLS (the website's refresh address; several separated by commas) and
REVALIDATE_SECRET (the same secret the website has). Without them it does nothing and the caches simply run out.
"""
import logging
import threading
import urllib.request

from django.conf import settings
from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save

log = logging.getLogger(__name__)

# The apps whose data the website shows. (Enquiries and contact messages are private and change nothing on it.)
WEBSITE_APPS = {'home', 'services', 'portfolio', 'blog'}
PRIVATE_MODELS = {'blog.subscriber'}
DELAY = 2.0  # seconds: a save with inlines changes many rows, and they are all sent as one refresh

_timer = None
_lock = threading.Lock()


def _send():
    for url in settings.FRONTEND_REVALIDATE_URLS:
        try:
            request = urllib.request.Request(url, data=b'', method='POST', headers={'x-revalidate-secret': settings.REVALIDATE_SECRET})
            with urllib.request.urlopen(request, timeout=15) as response:
                response.read()
        except Exception as error:  # the website's caches still run out on their own
            log.warning('Could not refresh the website at %s: %s', url, error)


def _soon():
    global _timer
    with _lock:
        if _timer:
            _timer.cancel()
        _timer = threading.Timer(DELAY, _send)
        _timer.daemon = True
        _timer.start()


def _changed(sender, **kwargs):
    meta = sender._meta
    if meta.app_label not in WEBSITE_APPS or meta.label_lower in PRIVATE_MODELS:
        return
    if not settings.FRONTEND_REVALIDATE_URLS or not settings.REVALIDATE_SECRET:
        return
    transaction.on_commit(_soon)


def connect():
    for signal in (post_save, post_delete, m2m_changed):
        signal.connect(_changed, dispatch_uid=f'website-refresh-{signal}')
