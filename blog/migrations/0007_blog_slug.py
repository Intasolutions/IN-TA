"""Readable web addresses for posts (/blog/<slug> instead of /blog/<id>). Existing posts get one made from their
title; the old numeric addresses keep working and redirect to the new ones."""

from django.db import migrations, models
from django.utils.text import slugify


def slug_for(title, taken, max_length=80):
    """(A frozen copy of blog.models.slug_for, so this migration never changes with the app's code.)"""
    base = slugify(title) or 'post'
    if base.isdigit():
        base = f'post-{base}'
    if len(base) > max_length:
        base = base[:max_length].rsplit('-', 1)[0] or base[:max_length]
    slug, n = base, 2
    while slug in taken:
        suffix = f'-{n}'
        slug = f'{base[:max_length - len(suffix)].rstrip("-")}{suffix}'
        n += 1
    return slug


def fill_slugs(apps, schema_editor):
    Blog = apps.get_model('blog', 'Blog')
    taken = set()
    for post in Blog.objects.order_by('id'):
        post.slug = slug_for(post.title, taken)
        taken.add(post.slug)
        post.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0006_alter_subscriber_interest'),
    ]

    operations = [
        migrations.AddField(
            model_name='blog',
            name='slug',
            field=models.SlugField(blank=True, max_length=80, null=True),
        ),
        migrations.RunPython(fill_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='blog',
            name='slug',
            field=models.SlugField(
                blank=True, max_length=80, unique=True,
                help_text="The post's web address: in-tasolutions.com/blog/<this>. Left empty, it is made from the title. "
                          "Changing it later breaks links people already shared, so set it once.",
            ),
        ),
        migrations.AlterField(
            model_name='blog',
            name='meta_title',
            field=models.CharField(
                blank=True, max_length=200, null=True,
                help_text="The title shown in Google (optional; otherwise the post's title). Keep it under 60 characters or "
                          "Google cuts it off. Don't add the company name: the website adds \"| IN-TA Solutions\" itself "
                          "when there is room.",
            ),
        ),
    ]
