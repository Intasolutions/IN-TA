import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from home.models import Testimonial

testimonials = [
    { 'name': 'Priya Sharma', 'role': 'Head of Product', 'company': 'LuxHomes', 'quote': 'They redesigned our product experience and the conversion lift was obvious. Motion, detail and performance — all top tier.' },
    { 'name': 'Rahul Mehta', 'role': 'CTO', 'company': 'BlueCart', 'quote': 'Engineering quality and design sensibility in one team. We shipped faster with fewer regressions — highly recommended.' },
    { 'name': 'Sara Lee', 'role': 'Marketing Lead', 'company': 'Nova', 'quote': 'The campaigns and motion work lifted engagement and brand recall. The videos simply performed across channels.' },
]

for t in testimonials:
    Testimonial.objects.create(**t)
print("Added 3 testimonials.")
