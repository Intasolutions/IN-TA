"""The home page's new opening copy (2026-11-19), and a WhatsApp number of its own in Site settings.

- The hero now says who the software is for and what it fixes: "Software that fits how your business actually runs", a
  line naming the services, the industries and where the clients are, and a main button that books a short call (it opens
  the enquiry form). The standard wording in home/site_text.json is changed too.
- Site settings get an optional WhatsApp number, for when WhatsApp runs on a different number from the office phone.
  Empty means the phone number, as before.

Like 0007 and 0008, the wording step only replaces text that is still exactly as it was in the admin's Page wording
boxes, so anything rewritten there since is left alone, and running it twice changes nothing.
"""

from django.db import migrations, models

TEXTS = {
    # key: (as it was, as it should read)
    'home_hero_title': (
        'Smarter |custom software & AI for your business',
        'Software that fits |how your business actually runs',
    ),
    'home_hero_text': (
        'We build AI tools, websites, mobile apps and custom software for hospitals, retailers, schools and growing '
        'companies. From chatbots that answer customers 24/7 to systems that automate daily work, we build technology '
        'that saves you time and money.',
        'Custom software, ERP/MES, AI automation and websites for manufacturers, traders, clinics and hospitality '
        'businesses in Kerala, Bangalore and the GCC.',
    ),
    'home_hero_cta_primary': ('See Our Work', 'Book a 15-minute conversation'),
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

    dependencies = [
        ('home', '0008_seo_keyword_wording'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='whatsapp',
            field=models.CharField(blank=True, help_text='The number the WhatsApp buttons open a chat with, with the country code. Leave empty to use the phone number above.', max_length=32, verbose_name='WhatsApp number'),
        ),
        migrations.RunPython(fix, undo),
    ]
