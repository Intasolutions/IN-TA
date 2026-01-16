from rest_framework import viewsets, mixins
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
