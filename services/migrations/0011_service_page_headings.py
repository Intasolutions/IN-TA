"""Service page headings (H1) that say what people search for.

Three services were named in the short form on their own page ("Web Development", "Software Development", "Mobile App").
Their big title now uses the full search phrase. It's set in the service's "Big title" box (page_text.hero_title), which
the page shows instead of the service's name; the name itself (menus, cards, breadcrumb) stays as it is. Only an empty
box is filled, so a title written in the admin is left alone; going back empties only a box that still holds this title.
By the user's choice the heading doesn't name a place: the location is in the search title and description.
"""

from django.db import migrations

TITLES = {
    # slug: big title (| before the words in blue)
    'web-development': 'Website | Development',
    'software-development': 'Custom Software | Development',
    'mobile-app': 'Mobile App | Development',
}


def fix(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for slug, title in TITLES.items():
        for service in Service.objects.filter(slug=slug):
            text = service.page_text if isinstance(service.page_text, dict) else {}
            if str(text.get('hero_title') or '').strip():
                continue
            service.page_text = {**text, 'hero_title': title}
            service.save(update_fields=['page_text'])


def undo(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for slug, title in TITLES.items():
        for service in Service.objects.filter(slug=slug):
            text = service.page_text if isinstance(service.page_text, dict) else {}
            if text.get('hero_title') == title:
                service.page_text = {k: v for k, v in text.items() if k != 'hero_title'}
                service.save(update_fields=['page_text'])


class Migration(migrations.Migration):
    dependencies = [('services', '0010_shorter_seo_titles')]
    operations = [migrations.RunPython(fix, undo)]
