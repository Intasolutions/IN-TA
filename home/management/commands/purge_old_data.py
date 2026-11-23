from django.conf import settings
from django.core.management.base import BaseCommand

from home.retention import purge_old


class Command(BaseCommand):
    help = (
        'Deletes contact messages, enquiries, robot chats and cookie choices older than DATA_RETENTION_DAYS '
        '(the period the Privacy page states). It also runs by itself once a day; see home/retention.py.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Only count what would be deleted.')

    def handle(self, *args, **options):
        counts = purge_old(dry_run=options['dry_run'])
        verb = 'Would delete' if options['dry_run'] else 'Deleted'
        self.stdout.write(f"{verb} records older than {settings.DATA_RETENTION_DAYS} days:")
        for name, n in counts.items():
            self.stdout.write(f'  {name}: {n}')
