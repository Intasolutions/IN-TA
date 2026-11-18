from django.shortcuts import get_object_or_404
from rest_framework import viewsets, mixins
from rest_framework.throttling import ScopedRateThrottle
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
    """
    Create-only endpoint for newsletter subscriptions.
    """
    queryset = Subscriber.objects.all()
    serializer_class = SubscriberSerializer
    # the public enquiry form: one visitor can send at most "forms" (REST_FRAMEWORK) an hour
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'forms'
