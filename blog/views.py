from django.shortcuts import get_object_or_404
from rest_framework import viewsets, mixins
from rest_framework.throttling import ScopedRateThrottle
from home.mail import admins_later

from .models import Blog, Subscriber
from .serializers import BlogSerializer, SubscriberSerializer

class BlogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly endpoint for listing and retrieving blogs.
    """
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer

    def get_object(self):
        """A post by its web address (slug), or by its number: links shared before posts had addresses still work."""
        key = self.kwargs[self.lookup_field]
        lookup = {'pk': int(key)} if key.isdigit() else {'slug__iexact': key}
        post = get_object_or_404(self.get_queryset(), **lookup)
        self.check_object_permissions(self.request, post)
        return post

class SubscriberViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """The enquiry form ("Tell us what you'd like to fix"): create only. Each enquiry is emailed to the team."""
    queryset = Subscriber.objects.all()
    serializer_class = SubscriberSerializer
    # the public enquiry form: one visitor can send at most "forms" (REST_FRAMEWORK) an hour
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'forms'

    def perform_create(self, serializer):
        e = serializer.save()
        lines = [
            f"Name: {e.name}",
            f"Company: {e.company or '-'}",
            f"Email: {e.email or '-'}",
            f"WhatsApp / phone: {e.phone or '-'}",
            f"Needs: {e.interest}",
            '',
            f"The problem: {e.message or '-'}",
            '',
            f"Sent from: {self.request.META.get('HTTP_REFERER', '') or '-'}",
            'All enquiries: admin > Blog > Enquiries.',
        ]
        admins_later(f"New enquiry: {e.name}{f' ({e.company})' if e.company else ''}: {e.interest}", '\n'.join(lines))
