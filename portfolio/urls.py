from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, GalleryViewSet

app_name = "portfolio"

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"gallery", GalleryViewSet, basename="gallery")

urlpatterns = [
    path("", include(router.urls)),
]
