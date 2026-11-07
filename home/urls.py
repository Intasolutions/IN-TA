from django.urls import path
from .views import ClientLogoListView, SiteSettingsView, TestimonialListView

urlpatterns = [
    path('testimonials/', TestimonialListView.as_view(), name='testimonial-list'),
    path('clients/', ClientLogoListView.as_view(), name='client-logo-list'),
    path('site/', SiteSettingsView.as_view(), name='site-settings'),
]
