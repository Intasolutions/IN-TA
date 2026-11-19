"""Emails sent because a visitor did something (an enquiry, a contact message, a chat), without making them wait.

Talking to the mail server takes one to three seconds per message. These send in a background thread once the row is
saved, so the visitor's form answers straight away. A failure is logged and never reaches the visitor.
"""
import logging
import threading

from django.core.mail import mail_admins, send_mail
from django.db import transaction

log = logging.getLogger(__name__)


def _run(send, *args, **kwargs):
    def work():
        try:
            send(*args, **kwargs)
        except Exception as error:
            log.warning('Could not send an email (%s): %s', send.__name__, error)

    threading.Thread(target=work, daemon=True).start()


def admins_later(subject, message):
    """mail_admins, after the current save is committed, in the background."""
    transaction.on_commit(lambda: _run(mail_admins, subject, message))


def send_later(subject, message, from_email, recipients):
    """send_mail, after the current save is committed, in the background."""
    transaction.on_commit(lambda: _run(send_mail, subject, message, from_email, recipients))
