from django.contrib import admin
from .models import Tag, Project, GalleryItem


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "has_page", "featured", "order", "is_active")
    list_editable = ["is_active"]
    list_filter = ("featured", "is_active")
    search_fields = ("title", "summary", "role")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("tags",)
    ordering = ("-featured", "order", "title")
    fieldsets = (
        (None, {"fields": ("title", "slug", "role", "summary", "hero", "tags", "external_url", "featured", "order", "is_active")}),
        ("Case study page", {
            "description": "Fill in at least the first two and the project gets its own page on the website (/portfolio/its-slug), "
            "linked from the Work page and from the services it used (Services > a service > its projects). Only write what is true.",
            "fields": ("challenge", "solution", "outcome", "stack", "meta_description"),
        }),
    )

    @admin.display(boolean=True, description="Case study page")
    def has_page(self, obj):
        return obj.has_case_study


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ("title", "order", "is_active")
    list_editable = ["is_active"]
    ordering = ("order",)

