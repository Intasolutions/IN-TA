from django.contrib import admin
from .models import Feature, Service


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_active", "order")
    list_filter = ("is_active",)
    search_fields = ("title", "short_description", "long_description")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("features",)
    ordering = ("order", "title")

