"""The home page's search title, from the SEO audit of 2026-11-21.

The audit found the page's main keywords ("custom software", "mobile app", "apps") in its text, description and
headings but not in its title. The title now names custom software and apps and keeps the place (51 characters before
"| IN-TA Solutions", which search results drop when the whole title is over 60).

The standard wording in home/site_text.json is changed too. Like 0007 and 0008, this only replaces wording that is
still exactly as it was in the admin's Page wording box, so anything rewritten there is left alone, and running it
twice changes nothing.
"""

from django.db import migrations

TEXTS = {
    # key: (as it was, as it should read)
    'seo_home_title': (
        'Software, AI & Automation Company in Wayanad, Kerala | IN-TA Solutions',
        'Custom Software, AI & App Company in Wayanad, Kerala | IN-TA Solutions',
    ),
}


def swap(apps, forward):
    SiteSettings = apps.get_model('home', 'SiteSettings')
    for row in SiteSettings.objects.all():
        text = row.page_text if isinstance(row.page_text, dict) else {}
        changed = False
        for key, (old, new) in TEXTS.items():
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
    dependencies = [('home', '0009_hero_copy_and_whatsapp')]
    operations = [migrations.RunPython(fix, undo)]
