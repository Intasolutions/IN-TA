from django.contrib import admin
from .models import Feature, Service, Technology, Benefit


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Technology)
class TechnologyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = ("title",)
    search_fields = ("title", "description")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_active", "order")
    list_filter = ("is_active",)
    search_fields = ("title", "short_description", "long_description")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("features", "technologies", "benefits")
    ordering = ("order", "title")

    fieldsets = (
        ("Main Content", {
            "fields": (
                "title",
                "slug",
                "short_description",
                "long_description",
                "order",
                "is_active",
            )
        }),
        ("Visual Assets", {
            "fields": (
                "image",
                "color",
                "icon_key",
            )
        }),
        ("Relational Content", {
            "description": "Select tags and features that define this service.",
            "fields": (
                "features",
                "technologies",
                "benefits",
            )
        }),
        ("SEO Metadata", {
            "classes": ("collapse",),
            "fields": (
                "meta_title",
                "meta_description",
                "focus_keyword",
                "image_alt",
            )
        }),
    )

