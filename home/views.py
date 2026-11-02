from rest_framework import generics
from .models import ClientLogo, Testimonial
from .serializers import ClientLogoSerializer, TestimonialSerializer

class TestimonialListView(generics.ListAPIView):
    queryset = Testimonial.objects.all().order_by('-created_at')
    serializer_class = TestimonialSerializer

class ClientLogoListView(generics.ListAPIView):
    queryset = ClientLogo.objects.filter(is_active=True)
    serializer_class = ClientLogoSerializer
