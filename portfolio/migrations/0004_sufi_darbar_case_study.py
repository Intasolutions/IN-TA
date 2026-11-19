"""Sufi Darbar's full entry: its case study, tools, tags and services, from a read of the project's own code.

0003 added it with a short placeholder. This replaces only that placeholder text (and fills what is empty): anything
already written in the admin stays as it is. There is still no public link (the site is the staff login), and nothing
about the client's people, money or payment terms.
"""

from django.db import migrations
from django.utils.text import slugify

# What 0003 wrote: replaced if it is still there
OLD = {
    'role': 'Custom Software',
    'summary': (
        'CentralCommand, a multi-franchise hotel management system built for Sufi Darbar: one secure, '
        'login-only portal for running its franchise hotels from one place.'
    ),
    'meta_description': 'Multi-franchise hotel management system for Sufi Darbar: a secure portal for running its franchise hotels from one place.',
}
OLD_TAGS = {'Hospitality', 'Franchise Management', 'ERP', 'Custom Software', 'Secure System'}

NEW = {
    'role': 'Custom ERP Development',
    'summary': (
        'An ERP for Sufi Darbar, a food business whose central kitchen supplies its branches and franchise outlets. '
        'It brings purchasing, kitchen production, deliveries, branch stock and cash, staff attendance and payroll, '
        'and company finances into one web app.'
    ),
    'challenge': (
        'Sufi Darbar cooks in one central kitchen and supplies its branches, franchise outlets and business '
        'customers.\n\n'
        'They needed one system to track what they buy, what the kitchen produces, what each branch receives and '
        'sells, and how cash moves through the company, along with staff attendance and payroll.'
    ),
    'solution': (
        'We built a web-based ERP that covers the whole chain: purchase orders to suppliers, central kitchen '
        'production against recipes, dispatch notes to branches, branch stock requests, delivery checks and stock '
        'counts, and end-of-day till closing with an emailed report.\n\n'
        'Head office sees cash flow, profit and loss, bank accounts, loans, recurring bills and branch accounts on '
        'its finance dashboards, alongside B2B orders and a business intelligence dashboard. HR covers shifts, leave, '
        'advances and payroll, with attendance from face-scan machines or a phone clock-in that checks a selfie and '
        "the staff member's location. Screens update live, and reports export to PDF and Excel."
    ),
    'stack': 'Next.js, React, TypeScript, Tailwind CSS, Django, Django REST Framework, PostgreSQL, Redis, Docker',
    'meta_description': (
        'ERP for a multi-branch food business: purchasing, central kitchen, branch stock, finance, attendance and '
        'payroll in one web app.'
    ),
}
NEW_TAGS = ['ERP', 'Central Kitchen', 'Franchise Management', 'Inventory & Procurement', 'HR & Payroll', 'Django', 'Next.js']
# Software Development already; the attendance's face matching is AI integration
SERVICES = ['software-development', 'ai-integration-model-training']


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

    project = Project.objects.filter(slug='sufi-darbar').first()
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
        ('portfolio', '0003_new_work_and_listing'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
