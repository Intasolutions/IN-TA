"""Spelling and capitalisation fixes in posts entered in the admin (found in the site-wide check of 2026-11-17).

- Titles are in Title Case, so their verbs take a capital too ("Clinics Are Upgrading", "Django Form the ...").
- The company is IN-TA Solutions, never "INTA Solutions".

Each fix only applies while the text still reads exactly as it did, so a post already edited in the admin is left
alone, and running it twice changes nothing. The web addresses (slugs) don't change: they're lowercase anyway.
"""

import re

from django.db import migrations

PHRASES = [
    # (field, as it was, as it should read)
    ('title', 'Why Next.js and Django form the Ultimate Stack', 'Why Next.js and Django Form the Ultimate Stack'),
    ('title', 'How Custom AI Integration is Revolutionizing', 'How Custom AI Integration Is Revolutionizing'),
    ('title', 'Why Kerala Clinics are Upgrading', 'Why Kerala Clinics Are Upgrading'),
    ('title', 'How Kerala Businesses are Scaling', 'How Kerala Businesses Are Scaling'),
    ('title', 'How IN-TA Solutions is Powering Growth', 'How IN-TA Solutions Is Powering Growth'),
    ('title', 'Why Kerala Companies are Switching', 'Why Kerala Companies Are Switching'),
    ('meta_title', 'Smart Billing Software for Kerala Retailer', 'Smart Billing Software for Kerala Retailers'),
]

COMPANY = re.compile(r'\bINTA Solutions\b')
COMPANY_FIELDS = ['title', 'content', 'meta_title', 'meta_description', 'image_alt']


def fix(apps, schema_editor):
    Blog = apps.get_model('blog', 'Blog')
    for post in Blog.objects.all():
        changed = []
        for field, old, new in PHRASES:
            value = getattr(post, field) or ''
            if old in value and not value.endswith(new) and new not in value:
                setattr(post, field, value.replace(old, new))
                changed.append(field)
        for field in COMPANY_FIELDS:
            value = getattr(post, field) or ''
            fixed = COMPANY.sub('IN-TA Solutions', value)
            if fixed != value:
                setattr(post, field, fixed)
                changed.append(field)
        if changed:
            # (update_fields leaves updated_at as it was: these are corrections, not new versions of the posts)
            post.save(update_fields=sorted(set(changed)))


def undo(apps, schema_editor):
    Blog = apps.get_model('blog', 'Blog')
    for post in Blog.objects.all():
        changed = []
        for field, old, new in PHRASES:
            value = getattr(post, field) or ''
            if new in value:
                setattr(post, field, value.replace(new, old))
                changed.append(field)
        if changed:
            post.save(update_fields=sorted(set(changed)))


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0007_blog_slug'),
    ]

    operations = [
        migrations.RunPython(fix, undo),
    ]
