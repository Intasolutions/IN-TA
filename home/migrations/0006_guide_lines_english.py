"""The website guide's lines in plain English: the Malayalam words (Namaskaram, Ayyo, sathyam, alle) are replaced.

The standard wording in home/site_text.json is already changed; this fixes the same lines where they were saved in the
admin's Page wording boxes. Only a line that is still exactly as it was is replaced, so anything rewritten in the admin
is left alone, and running it twice changes nothing.
"""

from django.db import migrations

LINES = {
    # as it was: as it should read
    'Namaskaram! Welcome to IN-TA.': 'Hello! Welcome to IN-TA.',
    'Ayyo, that tickles!': 'Hey, that tickles!',
    "Ayyo! I'll walk back.": "Oof! I'll walk back.",
    'Ayyo!': 'Oops!',
    'The button moved, sathyam!': 'The button moved, I promise!',
    'Nobody saw that, alle?': 'Nobody saw that, right?',
}


def fix(apps, schema_editor):
    SiteSettings = apps.get_model('home', 'SiteSettings')
    for row in SiteSettings.objects.all():
        text = row.page_text if isinstance(row.page_text, dict) else {}
        changed = False
        for key, value in text.items():
            if not key.startswith('guide_') or not isinstance(value, str):
                continue
            lines = value.split('\n')
            fixed = [LINES.get(line.strip(), line) for line in lines]
            if fixed != lines:
                text[key] = '\n'.join(fixed)
                changed = True
        if changed:
            row.page_text = text
            row.save(update_fields=['page_text'])


class Migration(migrations.Migration):
    dependencies = [('home', '0005_question_bank')]
    operations = [migrations.RunPython(fix, migrations.RunPython.noop)]
