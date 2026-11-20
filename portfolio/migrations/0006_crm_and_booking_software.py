"""Adds two more pieces of work for clients already in the portfolio: the CRM built for StudyAtGeorgia and the booking
management software built for Green Field Apartments. Each is its own project, next to that client's website.

Only what is known is filled in: the name, what it is, its address and the Software Development service. Each is
added switched off, because the website needs its picture: upload the screenshot in the admin (Portfolio > Projects >
the project > Hero) and tick "Is active". Filling in "What the client needed" and "What we built" there gives it a
case study page of its own (/portfolio/<slug>).

A project already added by hand (same address or title) only has its empty boxes filled in. Each new project takes
the place right after its client's website in the listing; the projects after it move down one.
"""

from django.db import migrations
from django.db.models import F, Q
from django.utils.text import slugify

NEW_PROJECTS = [
    {
        'after': 'studyatgeorgia',
        'find': ['studyatgeorgia-crm'],
        'url_has': 'crm.studyatgeorgia.com',
        'services': ['software-development'],
        'tags': ['CRM', 'Education', 'Custom Software'],
        'fields': {
            'title': 'StudyAtGeorgia – CRM',
            'slug': 'studyatgeorgia-crm',
            'role': 'CRM Development',
            'summary': (
                'A CRM we built for StudyAtGeorgia, the Kochi-based student support team for Grigol Robakidze '
                'University in Georgia, alongside its website.'
            ),
            'external_url': 'https://crm.studyatgeorgia.com/',
        },
    },
    {
        'after': 'green-field-apartments',
        'find': ['green-field-booking-software', 'greenfield-booking-software'],
        'url_has': 'bookings.greenfieldstay.com',
        'services': ['software-development'],
        'tags': ['Booking Management', 'Hospitality', 'Custom Software'],
        'fields': {
            'title': 'Green Field Apartments – Booking Management Software',
            'slug': 'green-field-booking-software',
            'role': 'Booking Management Software',
            'summary': 'Booking management software we built for Green Field Apartments, alongside its website.',
            'external_url': 'http://bookings.greenfieldstay.com/',
        },
    },
]


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

    for new in NEW_PROJECTS:
        fields = new['fields']
        looks = Q(slug__in=new['find']) | Q(title__iexact=fields['title']) | Q(external_url__icontains=new['url_has'])
        project = Project.objects.filter(looks).first()
        if project is None:
            # its place: right after the client's website (or at the end, if that has gone)
            sibling = Project.objects.filter(slug=new['after']).first()
            if sibling is not None:
                place = sibling.order + 1
                Project.objects.filter(order__gte=place).update(order=F('order') + 1)
            else:
                place = (Project.objects.order_by('-order').values_list('order', flat=True).first() or 0) + 1
            project = Project.objects.create(**fields, is_active=False, featured=False, order=place)
        else:
            for field, value in fields.items():
                if field in ('title', 'slug'):
                    continue
                if not (getattr(project, field) or '').strip():
                    setattr(project, field, value)
            project.save()
        if not project.tags.exists():
            project.tags.add(*[tag_for(Tag, name) for name in new['tags']])
        for service in Service.objects.filter(slug__in=new['services']):
            service.projects.add(project)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0005_hirelinks_case_study'),
        ('services', '0012_fill_service_content'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
