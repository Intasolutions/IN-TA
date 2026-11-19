"""Adds new work to the portfolio (Intelligen Hirelinks, StudyAtGeorgia, Green Field Apartments, Sufi
Darbar) and sets the order of the whole listing.

The new projects are written from their live sites and what our team said about them. Each is added switched off,
because the website needs its picture: upload the screenshot in the admin (Portfolio > Projects > the project > Hero)
and tick "Is active". A project that was already added by hand only has its empty boxes filled in. Each is linked to
the services it used.

The listing: every project gets its place (featured first, then by order, on the home page and the Work page), the
strongest and most varied work first. Projects not named here keep theirs, after these. Revive Hospital Management
System is no longer running: it's switched off (still in the admin).
"""

from django.db import migrations
from django.db.models import Q
from django.utils.text import slugify

NEW_PROJECTS = [
    {
        # what to look for, in case it was already added by hand (its address, or a word in its title)
        'find': ['intelligen-hirelinks', 'hirelinks'],
        'match': ['hirelinks'],
        'services': ['web-development'],
        'tags': ['HR', 'Healthcare Recruitment', 'Web Development', 'Next.js', 'MERN'],
        # (what the admin was first told to paste, before the site had been read: replaced by the fuller summary)
        'first_summary': 'A website for Hirelinks, an HR company, built by our team with Next.js and the MERN stack (MongoDB, Express, React and Node.js).',
        'fields': {
            'title': 'Intelligen Hirelinks',
            'slug': 'intelligen-hirelinks',
            'role': 'Full Stack Development',
            'summary': (
                'The website of Intelligen Hirelinks, a nursing recruitment and career company in Bengaluru that helps '
                'nurses build careers in India and abroad. It presents their services and programmes, partner '
                "hospitals, nurses' stories and a blog, and lets nurses register and reach the team by phone, email or "
                'WhatsApp.'
            ),
            'external_url': 'https://www.intelligenhirelinks.com/',
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
        },
    },
    {
        'find': ['studyatgeorgia', 'study-at-georgia'],
        'match': ['studyatgeorgia', 'study at georgia'],
        'services': ['web-development', 'Marketing'],
        'tags': ['Education', 'Study Abroad', 'Web Development', 'Digital Marketing', 'Next.js'],
        'first_summary': '',
        'fields': {
            'title': 'StudyAtGeorgia',
            'slug': 'studyatgeorgia',
            'role': 'Website & Digital Marketing',
            'summary': (
                'The website of StudyAtGeorgia, the Kochi-based marketing and student support team in India for '
                'Grigol Robakidze University (GRUNI) in Georgia. Students can explore its medical, nursing, dental and '
                'business programmes, take 360° campus tours, and apply or book a consultation. We also handle its '
                'digital marketing.'
            ),
            'external_url': 'https://studyatgeorgia.com/',
            'challenge': (
                'StudyAtGeorgia guides students from India through studying at Grigol Robakidze University in '
                'Georgia, from admission and scholarships to visas, travel and accommodation.\n\n'
                'They needed a website that presents the university and its programmes clearly and brings in '
                'consultation requests, and digital marketing to reach students planning to study abroad.'
            ),
            'solution': (
                'We built the website with Next.js, with its images served through Cloudinary.\n\n'
                "It presents GRUNI's programmes (MBBS/MD, BSc Nursing, BDS, MBA and BBA), why students choose the "
                'university, the support offered from admission to arrival, 360° virtual campus tours and common '
                'questions. Students can apply or book a consultation, and reach the team by phone, email or '
                'WhatsApp.\n\n'
                'We also handle its digital marketing.'
            ),
            'stack': 'Next.js, Cloudinary',
            'meta_description': (
                'Website and digital marketing for StudyAtGeorgia, the Indian student team for Grigol Robakidze '
                'University: programmes, campus tours and consultations.'
            ),
        },
    },
    {
        'find': ['green-field-apartments', 'greenfield-apartments', 'greenfieldstay', 'greenfield-stay', 'green-field-stay'],
        'match': ['green field', 'greenfield'],
        'services': ['web-development', 'Marketing'],
        'tags': ['Hospitality', 'Serviced Apartments', 'Web Development', 'OTA Management', 'Social Media', 'Next.js'],
        'first_summary': '',
        'fields': {
            'title': 'Green Field Apartments',
            'slug': 'green-field-apartments',
            'role': 'Website, OTA & Social Media Management',
            'summary': (
                'The website of Green Field Apartments, boutique serviced apartments in Mananthavady, Wayanad. Guests '
                'can see its rooms, amenities and gallery, and book or reach the team by phone, email or chat. We also '
                'manage its listings on online travel agencies (OTAs) and its social media.'
            ),
            'external_url': 'https://www.greenfieldstay.com/',
            'challenge': (
                'Green Field Apartments offers boutique serviced stays in Mananthavady, Wayanad, with premium rooms, '
                'complimentary breakfast and a shared kitchen.\n\n'
                'They needed a website that shows their spaces at their best and makes it easy for guests to book, '
                'and someone to look after how the property appears on booking sites and social media.'
            ),
            'solution': (
                'We built the website with Next.js. It presents the apartments and their rooms, the amenities and a '
                'photo gallery, with clear ways to book, call, email or chat with the team.\n\n'
                'We also manage its online presence: its listings on online travel agencies (OTAs) and its social '
                'media.'
            ),
            'stack': 'Next.js',
            'meta_description': (
                'Website, OTA and social media management for Green Field Apartments, boutique serviced apartments in '
                'Mananthavady, Wayanad.'
            ),
        },
    },
    {
        'find': ['sufi-darbar', 'sufidarbar', 'sufi-darbab', 'sufidarbab'],
        'match': ['sufi darbar', 'sufidarbar', 'sufi darbab'],
        'services': ['software-development'],
        'tags': ['Hospitality', 'Franchise Management', 'ERP', 'Custom Software', 'Secure System'],
        'first_summary': '',
        'fields': {
            'title': 'Sufi Darbar',
            'slug': 'sufi-darbar',
            'role': 'Custom Software',
            'summary': (
                'CentralCommand, a multi-franchise hotel management system built for Sufi Darbar: one secure, '
                'login-only portal for running its franchise hotels from one place.'
            ),
            # (no public link: the site is the staff login. No case-study page until the system's features are known:
            # "What the client needed" and "What we built" are left for the admin.)
            'meta_description': 'Multi-franchise hotel management system for Sufi Darbar: a secure portal for running its franchise hotels from one place.',
        },
    },
]

# No longer running: switched off (it stays in the admin, and can be switched back on or deleted there)
RETIRED = ['revive-hospital-management-system']

# The listing, best first: (slug, featured)
LISTING = [
    ('aarohya-jewelry-store', True),
    ('growmedlink', True),
    ('intelligen-hirelinks', True),
    ('studyatgeorgia', True),
    ('sufi-darbar', True),
    ('green-field-apartments', False),
    ('favourite-garments', False),
    ('iGen', False),
    ('solid-tracks-accademy', False),
    ('orchid-spellbee', False),
    ('anova-medical-center', False),
    ('quinte-malayalee-association', False),
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


def add_project(Project, Tag, Service, new):
    """Adds it (switched off until its picture is uploaded), or fills in the empty boxes of one added by hand; returns its slug"""
    fields = new['fields']
    looks = Q(slug__in=new['find']) | Q(title__iexact=fields['title'])
    for word in new['match']:
        looks |= Q(title__icontains=word)
    project = Project.objects.filter(looks).first()
    if project is None:
        project = Project.objects.create(**fields, is_active=False)
    else:
        for field, value in fields.items():
            if field in ('title', 'slug'):
                continue
            current = (getattr(project, field) or '').strip()
            if not current or (field == 'summary' and new['first_summary'] and current == new['first_summary']):
                setattr(project, field, value)
        project.save()
    if not project.tags.exists():
        project.tags.add(*[tag_for(Tag, name) for name in new['tags']])
    for service in Service.objects.filter(slug__in=new['services']):
        service.projects.add(project)
    return project.slug


def forwards(apps, schema_editor):
    Project = apps.get_model('portfolio', 'Project')
    Tag = apps.get_model('portfolio', 'Tag')
    Service = apps.get_model('services', 'Service')

    # the new work (its slug may differ when someone added it by hand first)
    actual = {new['fields']['slug']: add_project(Project, Tag, Service, new) for new in NEW_PROJECTS}

    # work that has stopped running leaves the site (and its featured place)
    Project.objects.filter(slug__in=RETIRED).update(is_active=False, featured=False)

    # the listing
    named = set()
    for place, (slug, featured) in enumerate(LISTING, start=1):
        slug = actual.get(slug, slug)
        named.add(slug)
        Project.objects.filter(slug=slug).update(order=place, featured=featured)
    for extra, other in enumerate(Project.objects.exclude(slug__in=named).order_by('-featured', 'order', 'title'), start=len(LISTING) + 1):
        Project.objects.filter(pk=other.pk).update(order=extra, featured=False)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0002_case_study'),
        ('services', '0012_fill_service_content'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
