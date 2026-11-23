from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatViewSet, ConsentViewSet, ContactViewSet

router = DefaultRouter()
router.register(r'messages', ContactViewSet, basename='contactmessage')
router.register(r'chats', ChatViewSet, basename='chat')
router.register(r'consents', ConsentViewSet, basename='consent')

urlpatterns = [
    path('', include(router.urls)),
]
