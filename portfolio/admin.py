from django.contrib import admin
from .models import Tag, Project, GalleryItem


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "featured", "order", "is_active")
    list_editable = ["is_active"]
    list_filter = ("featured", "is_active")
    search_fields = ("title", "summary", "role")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("tags",)
    ordering = ("-featured", "order", "title")


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ("title", "order", "is_active")
    list_editable = ["is_active"]
    ordering = ("order",)

