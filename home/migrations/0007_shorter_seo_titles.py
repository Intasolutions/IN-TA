"""Shorter search titles for the About and Contact pages, so Google shows them whole (about 60 characters).

The standard wording in home/site_text.json is already changed; this fixes the same titles where they were saved in the
admin's Page wording boxes. Only a title that is still exactly as it was is replaced, so anything rewritten in the admin
is left alone, and running it twice changes nothing.
"""

from django.db import migrations

TITLES = {
    # key: (as it was, as it should read)
    'seo_about_title': (
        'About IN-TA Solutions | Software & AI Company in Wayanad, Kerala',
        'About Us | Software & AI Company in Wayanad, Kerala',
    ),
    'seo_contact_title': (
        'Contact IN-TA Solutions | Software & AI Company in Wayanad, Kerala',
        'Contact Us | Software & AI Company in Wayanad, Kerala',
    ),
}


def swap(apps, forward):
    SiteSettings = apps.get_model('home', 'SiteSettings')
    for row in SiteSettings.objects.all():
        text = row.page_text if isinstance(row.page_text, dict) else {}
        changed = False
        for key, (old, new) in TITLES.items():
            was, becomes = (old, new) if forward else (new, old)
            if isinstance(text.get(key), str) and text[key].strip() == was:
                text[key] = becomes
                changed = True
        if changed:
            row.page_text = text
            row.save(update_fields=['page_text'])


def fix(apps, schema_editor):
    swap(apps, forward=True)


def undo(apps, schema_editor):
    swap(apps, forward=False)


class Migration(migrations.Migration):
    dependencies = [('home', '0006_guide_lines_english')]
    operations = [migrations.RunPython(fix, undo)]
