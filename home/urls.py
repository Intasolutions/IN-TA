from django.urls import path
from .views import ClientLogoListView, TestimonialListView

urlpatterns = [
    path('testimonials/', TestimonialListView.as_view(), name='testimonial-list'),
    path('clients/', ClientLogoListView.as_view(), name='client-logo-list'),
]
