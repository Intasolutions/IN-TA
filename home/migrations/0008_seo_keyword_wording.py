"""Home and page wording from the SEO audit of 2026-11-18.

- The search description ran to 166 characters, so Google cut it off in the middle of the phone number. The new one is
  146 characters and keeps the number whole.
- The page headings (each page's H1, and a few home page H2s) now name what people search for: custom software, websites,
  apps, AI, the company's name. By the user's choice the opening (hero) headings don't name a place; the location is in
  the search titles, descriptions and the rest of the page.

The standard wording in home/site_text.json is changed too. Like 0007, this only replaces wording that is still exactly
as it was in the admin's Page wording boxes, so anything rewritten there is left alone, and running it twice changes
nothing.
"""

from django.db import migrations

TEXTS = {
    # key: (as it was, as it should read)
    'seo_home_description': (
        'Custom software, mobile apps, AI integration and business automation for companies in Kerala and abroad, '
        'from WhatsApp lead bots to ERP systems. Call +91 94475 95381.',
        'Custom software, mobile apps, AI and WhatsApp automation for businesses in Kerala and abroad, '
        'from lead bots to ERP systems. Call +91 94475 95381.',
    ),
    # Home page
    'home_hero_title': ('Smarter |software & AI for your business', 'Smarter |custom software & AI for your business'),
    'home_cap_title': (
        'AI, software and everything your business needs online',
        'AI, custom software, mobile apps and websites for your business',
    ),
    'home_work_title': ('Built, launched and live', 'Websites, apps & software, |launched and live'),
    'home_blog_title': ('Tips & insights', 'AI & software tips |for businesses'),
    # Each page's H1
    'services_title': ('Everything your business needs. |One team.', 'Software, websites, apps & AI. |One team.'),
    'portfolio_title': ('Real projects. |Real results.', "Websites, apps & software |we've built."),
    'about_title': ('Who we |are', 'About IN-TA |Solutions'),
    'blog_title': ('Tips & |insights.', 'AI & software tips |for businesses.'),
    'contact_title': ("Let's talk about |your project.", 'Talk to IN-TA |about your project.'),
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
    dependencies = [('home', '0007_shorter_seo_titles')]
    operations = [migrations.RunPython(fix, undo)]
