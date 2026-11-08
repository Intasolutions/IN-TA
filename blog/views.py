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

class SubscriberViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Create-only endpoint for newsletter subscriptions.
    """
    queryset = Subscriber.objects.all()
    serializer_class = SubscriberSerializer
    # the public enquiry form: one visitor can send at most "forms" (REST_FRAMEWORK) an hour
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'forms'
