"""Digital Marketing's address becomes /services/marketing (it was /services/Marketing, the only one with a capital).

Only the slug changes. The old address keeps working: the website shows the same page there with its canonical link
pointing at the new one (findService in app/services/[slug]/page.tsx). It deliberately doesn't redirect, because
addresses that differ only in capitals can share a cache entry, and a cached redirect would loop.

This renames the slug only while it is still exactly "Marketing" and "marketing" is free, so running it twice, or after
someone changed the slug in the admin, changes nothing.
"""

from django.db import migrations

OLD, NEW = 'Marketing', 'marketing'


def rename(apps, frm, to):
    Service = apps.get_model('services', 'Service')
    if Service.objects.filter(slug=to).exists():
        return
    Service.objects.filter(slug=frm).update(slug=to)


def forward(apps, schema_editor):
    rename(apps, OLD, NEW)


def backward(apps, schema_editor):
    rename(apps, NEW, OLD)


class Migration(migrations.Migration):
    dependencies = [('services', '0012_fill_service_content')]
    operations = [migrations.RunPython(forward, backward)]
