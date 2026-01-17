
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from services.models import Service, Feature
from contact.models import ContactMessage
from portfolio.models import Project, Tag, GalleryItem
from blog.models import Blog, Subscriber
from home.models import Testimonial

def clear_data():
    print("Clearing all data...")
    
    # Using delete() on QuerySet returns a tuple (deleted_count, dictionary_of_deleted_types)
    # We just want the count usually.
    
    count, _ = Service.objects.all().delete()
    print(f"Deleted {count} Services")
    
    count, _ = Feature.objects.all().delete()
    print(f"Deleted {count} Features")
    
    count, _ = ContactMessage.objects.all().delete()
    print(f"Deleted {count} ContactMessages")
    
    count, _ = Project.objects.all().delete()
    print(f"Deleted {count} Projects")
    
    count, _ = Tag.objects.all().delete()
    print(f"Deleted {count} Tags")
    
    count, _ = GalleryItem.objects.all().delete()
    print(f"Deleted {count} GalleryItems")
    
    count, _ = Blog.objects.all().delete()
    print(f"Deleted {count} Blogs")
    
    count, _ = Subscriber.objects.all().delete()
    print(f"Deleted {count} Subscribers")
    
    count, _ = Testimonial.objects.all().delete()
    print(f"Deleted {count} Testimonials")
    
    print("Database cleared.")

if __name__ == "__main__":
    clear_data()
