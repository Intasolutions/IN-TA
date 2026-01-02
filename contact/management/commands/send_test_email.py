from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.mail import mail_admins


class Command(BaseCommand):
    help = 'Send a test email to ADMINS using current email settings (useful to verify SMTP)'

    def handle(self, *args, **options):
        subject = 'Test email from IntaWeb contact app'
        message = 'This is a test email sent by management command contact.send_test_email to verify SMTP settings.'
        self.stdout.write(f'Using EMAIL_BACKEND={settings.EMAIL_BACKEND}, DEFAULT_FROM_EMAIL={settings.DEFAULT_FROM_EMAIL}')
        try:
            mail_admins(subject, message)
            self.stdout.write(self.style.SUCCESS('Test email sent using mail_admins(). Check admin inbox or console output.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send mail_admins(): {e}'))

        # Also attempt a direct send_mail to the configured host user (useful when ADMINS are not configured)
        try:
            from django.core.mail import send_mail
            send_mail('Direct test email', 'This is a direct test email to the configured email host user.', settings.DEFAULT_FROM_EMAIL, [settings.EMAIL_HOST_USER])
            self.stdout.write(self.style.SUCCESS(f'Direct test email sent to {settings.EMAIL_HOST_USER}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send direct test email: {e}'))
            raise
