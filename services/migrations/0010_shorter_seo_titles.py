"""Shorter search titles for three service pages, so Google shows them whole (about 60 characters).

The website already drops a trailing "| IN-TA Solutions" from a long title; these three were still too long without it.
Each title only changes while it is still exactly what it was, so anything rewritten in the admin is left alone, and
running it twice changes nothing.
"""

from django.db import migrations

TITLES = [
    # (service slug, as it was, as it should read)
    ('software-development',
     'Custom Software Development in Kerala | ERP, Billing & Hospital Software | IN-TA Solutions',
     'Custom Software Development in Kerala | ERP & Billing'),
    ('Marketing',
     'Digital Marketing Agency in Wayanad, Kerala | Social Media & Google Ads | IN-TA Solutions',
     'Digital Marketing Agency in Wayanad | Social Media & Ads'),
    ('media-production',
     'Media Production Services in Wayanad | Brand Video & Photography | IN-TA Solutions',
     'Media Production in Wayanad | Brand Video & Photography'),
]


def fix(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for slug, old, new in TITLES:
        Service.objects.filter(slug=slug, meta_title=old).update(meta_title=new)


def undo(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for slug, old, new in TITLES:
        Service.objects.filter(slug=slug, meta_title=new).update(meta_title=old)


class Migration(migrations.Migration):
    dependencies = [('services', '0009_copy_fixes')]
    operations = [migrations.RunPython(fix, undo)]
