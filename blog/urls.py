from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlogViewSet, SubscriberViewSet

router = DefaultRouter()
router.register(r'posts', BlogViewSet, basename='blog')
router.register(r'subscribe', SubscriberViewSet, basename='subscriber')

urlpatterns = [
    path('', include(router.urls)),
]
