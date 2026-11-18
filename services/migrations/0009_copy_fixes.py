"""Spelling and hyphenation fixes in service wording entered in the admin (found in the site-wide check of 2026-11-17).

Each fix only applies while the text is still exactly what it was, so anything already corrected or rewritten in the
admin is left alone, and running it twice changes nothing.
"""

from django.db import migrations

FEATURES = [
    # (as it was, as it should read)
    ('Photoshots &  Videography', 'Photo Shoots & Videography'),
    ('On Page SEO', 'On-Page SEO'),
    ('User Centric', 'User-Centric'),
    ('Cross Platform', 'Cross-Platform'),
]

BENEFIT_TEXT = [
    # (benefit title, description as it was, as it should read)
    ('Strong Local Presence', 'Helps your business rank in any where in world',
     'Helps your business show up in local searches and on Google Maps.'),
    ('Strong Brand Identity', 'Creates a consistent and professional visual experience',
     'Creates a consistent and professional visual experience.'),
]


def fix(apps, schema_editor):
    Feature = apps.get_model('services', 'Feature')
    Benefit = apps.get_model('services', 'Benefit')

    for old, new in FEATURES:
        wrong = Feature.objects.filter(name=old).first()
        if not wrong:
            continue
        right = Feature.objects.filter(name=new).first()
        if right:
            # the corrected name already exists: the services move over to it (names are unique)
            for service in wrong.services.all():
                service.features.add(right)
            wrong.delete()
        else:
            wrong.name = new
            wrong.save(update_fields=['name'])

    for title, old, new in BENEFIT_TEXT:
        Benefit.objects.filter(title=title, description=old).update(description=new)


def undo(apps, schema_editor):
    Feature = apps.get_model('services', 'Feature')
    Benefit = apps.get_model('services', 'Benefit')
    for old, new in FEATURES:
        if not Feature.objects.filter(name=old).exists():
            Feature.objects.filter(name=new).update(name=old)
    for title, old, new in BENEFIT_TEXT:
        Benefit.objects.filter(title=title, description=new).update(description=old)


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0008_service_board_and_home_card'),
    ]

    operations = [
        migrations.RunPython(fix, undo),
    ]
