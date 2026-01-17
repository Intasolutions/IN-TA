
import os
import django
import random
from django.utils.text import slugify

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from services.models import Service, Feature
from contact.models import ContactMessage
from portfolio.models import Project, Tag, GalleryItem
from blog.models import Blog, Subscriber
from home.models import Testimonial
from django.core.files.base import ContentFile

def create_services():
    print("Creating Services...")
    features = []
    for i in range(1, 4):
        f, created = Feature.objects.get_or_create(name=f"Feature {i}")
        features.append(f)
    
    icons = ["code", "ux", "mobile"]
    for i in range(1, 4):
        s, created = Service.objects.get_or_create(
            slug=f"service-{i}",
            defaults={
                "title": f"Service Title {i}",
                "short_description": f"Short description for service {i}",
                "long_description": f"Long description for service {i}",
                "icon_key": icons[i-1],
                "order": i,
                "is_active": True
            }
        )
        if created:
            s.features.set(features)
            s.save()
            print(f"Created Service: {s.title}")
        else:
            print(f"Service already exists: {s.title}")

def create_contact_messages():
    print("Creating Contact Messages...")
    for i in range(1, 4):
        msg, created = ContactMessage.objects.get_or_create(
            email=f"user{i}@example.com",
            defaults={
                "name": f"Test User {i}",
                "phone": f"123456789{i}",
                "country": "TestCountry",
                "message": f"This is a test message {i}.",
                "source": "seed_script"
            }
        )
        if created:
            print(f"Created Message from: {msg.email}")
        else:
            print(f"Message already exists: {msg.email}")

def create_portfolio():
    print("Creating Portfolio...")
    tags = []
    for i in range(1, 4):
        t, created = Tag.objects.get_or_create(name=f"Tag {i}")
        tags.append(t)

    for i in range(1, 4):
        p, created = Project.objects.get_or_create(
            slug=f"project-{i}",
            defaults={
                "title": f"Project Title {i}",
                "role": "Developer",
                "summary": f"Summary for project {i}",
                "order": i,
                "is_active": True
            }
        )
        if created:
            p.tags.set(tags)
            p.save()
            print(f"Created Project: {p.title}")
        else:
            print(f"Project already exists: {p.title}")

    # Gallery Items (require image, using dummy content if needed)
    # Since ImageField usually needs a file, we'll try to use a placeholder or skip strict validation if just seeding text fields mostly.
    # But GalleryItem essentially *is* an image.
    # We will skip GalleryItem creation to avoid file system clutter or errors unless we have a real file.
    # OR we can create a simple dummy file.
    
    print("Skipping GalleryItem creation to avoid missing image file errors.")


def create_blog():
    print("Creating Blog...")
    for i in range(1, 4):
        b, created = Blog.objects.get_or_create(
            title=f"Blog Post {i}",
            defaults={
                "date": "2025-01-01",
                "tag": "Tech",
                "content": f"Content for blog post {i}"
            }
        )
        if created:
            print(f"Created Blog: {b.title}")
        else:
            print(f"Blog already exists: {b.title}")

    print("Creating Subscribers...")
    interests = ['Web Development', 'UI/UX Design', 'App Development']
    for i in range(1, 4):
        s, created = Subscriber.objects.get_or_create(
            phone=f"987654321{i}",
            defaults={
                "name": f"Subscriber {i}",
                "interest": interests[i-1]
            }
        )
        if created:
            print(f"Created Subscriber: {s.name}")
        else:
            print(f"Subscriber already exists: {s.name}")

def create_testimonials():
    print("Creating Testimonials...")
    for i in range(1, 4):
        t, created = Testimonial.objects.get_or_create(
            name=f"Client {i}",
            defaults={
                "role": "CEO",
                "company": f"Company {i}",
                "quote": f"Great service! Quote number {i}."
            }
        )
        if created:
            print(f"Created Testimonial: {t.name}")
        else:
            print(f"Testimonial already exists: {t.name}")

if __name__ == "__main__":
    create_services()
    create_contact_messages()
    create_portfolio()
    create_blog()
    create_testimonials()
    print("Database seeding completed.")
