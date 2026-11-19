"""Intelligen Hirelinks' full entry, from a read of the project's own code: the admin panel behind the website.

0003 wrote its entry from the live site alone. This replaces only that text (and fills what is empty): anything
already written in the admin stays as it is. The live link and Bengaluru come from the live site; the rest from the
code. No client results are claimed.
"""

from django.db import migrations
from django.utils.text import slugify

# What 0003 wrote: replaced if it is still there
OLD = {
    'summary': (
        'The website of Intelligen Hirelinks, a nursing recruitment and career company in Bengaluru that helps '
        'nurses build careers in India and abroad. It presents their services and programmes, partner '
        "hospitals, nurses' stories and a blog, and lets nurses register and reach the team by phone, email or "
        'WhatsApp.'
    ),
    'challenge': (
        'Intelligen Hirelinks supports nurses through every step of a career move, from licensing exam '
        'preparation and credential evaluation to placement, visas and relocation.\n\n'
        'They needed a website that explains all of this clearly to nurses and turns visitors into '
        'registrations.'
    ),
    'solution': (
        'We built the site with Next.js and the MERN stack (MongoDB, Express, React and Node.js).\n\n'
        'It presents their five services and four featured programmes, their partner hospitals in India and '
        'abroad, testimonials from nurses, and a blog of recruitment and licensing updates. Nurses can '
        'register and contact the team by phone, email or WhatsApp.'
    ),
    'stack': 'Next.js, React, Node.js, Express, MongoDB',
    'meta_description': (
        'Website for Intelligen Hirelinks, a Bengaluru nursing recruitment company: services, programmes and '
        'registrations, built with Next.js and the MERN stack.'
    ),
}
OLD_TAGS = {'HR', 'Healthcare Recruitment', 'Web Development', 'Next.js', 'MERN'}

NEW = {
    'summary': (
        'The website of Intelligen Hirelinks, a nursing recruitment and career company in Bengaluru, with its own '
        'admin panel. Nurses can explore services and programmes, read the blog and register their interest; the '
        'team updates the whole site and handles enquiries without a developer.'
    ),
    'challenge': (
        'Intelligen Hirelinks helps nurses find work in India and abroad, and handles everything in between: '
        'licensing, documents, visas and relocation.\n\n'
        'They needed a professional website that explains their services and programmes and collects registrations '
        'from nurses, and a way to update it themselves and keep track of enquiries in one place.'
    ),
    'solution': (
        'We built the public website and its admin panel with Next.js and a Node.js, Express and MongoDB back end. '
        'Every service and programme has its own page with the steps, benefits and reviews, alongside a blog, '
        'placed-nurse stories, partner logos and a detailed registration form.\n\n'
        'In the admin panel the team manages all of it: services, programmes, blog posts in a rich-text editor, '
        'reviews (approved before they appear), placed nurses, partners, pages and site settings, including search '
        'settings for every page. Registrations and messages arrive in an enquiries inbox with a status, and images '
        'are cropped in the browser and stored on Cloudinary.'
    ),
    'stack': 'Next.js, React, TypeScript, Tailwind CSS, Node.js, Express, MongoDB',
    'meta_description': (
        'Nursing recruitment website with an admin panel to manage services, programmes, blogs, reviews and nurse '
        'registrations.'
    ),
}
NEW_TAGS = ['Healthcare Recruitment', 'Nursing Careers', 'CMS Website', 'Admin Panel', 'Next.js', 'Node.js', 'MongoDB']
# Web Development already; the admin panel and enquiries system are custom software
SERVICES = ['web-development', 'software-development']


def tag_for(Tag, name):
    tag = Tag.objects.filter(name__iexact=name).first()
    if tag:
        return tag
    base = slugify(name) or 'tag'
    slug, n = base, 2
    while Tag.objects.filter(slug=slug).exists():
        slug, n = f'{base}-{n}', n + 1
    return Tag.objects.create(name=name, slug=slug)


def forwards(apps, schema_editor):
    Project = apps.get_model('portfolio', 'Project')
    Tag = apps.get_model('portfolio', 'Tag')
    Service = apps.get_model('services', 'Service')

    project = Project.objects.filter(slug__in=['intelligen-hirelinks', 'hirelinks']).first()
    if project is None:
        return
    for field, value in NEW.items():
        current = (getattr(project, field) or '').strip()
        if not current or current == OLD.get(field):
            setattr(project, field, value)
    project.save()

    names = {t.name for t in project.tags.all()}
    if not names or names == OLD_TAGS:
        project.tags.set([tag_for(Tag, name) for name in NEW_TAGS])

    for service in Service.objects.filter(slug__in=SERVICES):
        service.projects.add(project)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0004_sufi_darbar_case_study'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
