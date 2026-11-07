from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientLogo, SiteSettings, Testimonial
from .serializers import ClientLogoSerializer, SiteSettingsSerializer, TestimonialSerializer


class TestimonialListView(generics.ListAPIView):
    queryset = Testimonial.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = TestimonialSerializer


class ClientLogoListView(generics.ListAPIView):
    queryset = ClientLogo.objects.filter(is_active=True)
    serializer_class = ClientLogoSerializer


class SiteSettingsView(APIView):
    """The company's details and the website's wording. Read-only; edited in the admin."""

    def get(self, request):
        obj = SiteSettings.objects.prefetch_related('metrics').get_or_create(pk=1)[0]
        return Response(SiteSettingsSerializer(obj, context={'request': request}).data)
