from django.contrib import admin, messages
from django.utils.html import format_html
from .models import Feature, Service, ServiceFAQ, ServiceImage, Technology, Benefit

# The narrowest image that still looks sharp where it is used
MIN_WIDTH_MAIN = 2400
MIN_WIDTH_GALLERY = 1600


def uploaded_width(upload):
    """The width of a file just uploaded, or None if it can't be read."""
    try:
        from PIL import Image

        upload.seek(0)
        width = Image.open(upload).size[0]
        upload.seek(0)
        return width
    except Exception:
        return None


def warn_if_small(request, label, upload, minimum):
    width = uploaded_width(upload)
    if width and width < minimum:
        messages.warning(request, f"{label} is {width}px wide. Use at least {minimum}px so that it stays sharp on large screens.")


def thumbnail(image):
    if not image:
        return "-"
    return format_html('<img src="{}" style="max-height:90px;max-width:160px;border-radius:6px" alt="">', image.url)


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Technology)
class TechnologyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "logo_preview")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("logo_preview",)

    @admin.display(description="Logo")
    def logo_preview(self, obj):
        return thumbnail(obj.logo)


@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = ("title",)
    search_fields = ("title", "description")


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 1
    fields = ("preview", "image", "caption", "alt_text", "order")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        return thumbnail(obj.image)


class ServiceFAQInline(admin.StackedInline):
    model = ServiceFAQ
    extra = 1
    fields = ("question", "answer", "order")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_active", "order")
    list_filter = ("is_active",)
    search_fields = ("title", "short_description", "long_description")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("features", "technologies", "benefits", "projects")
    ordering = ("order", "title")
    readonly_fields = ("image_preview",)
    inlines = (ServiceImageInline, ServiceFAQInline)

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
                "image_preview",
                "image",
                "color",
                "icon_key",
            )
        }),
        ("Relational Content", {
            "description": "Select tags and features that define this service, and the real work that used it.",
            "fields": (
                "features",
                "technologies",
                "benefits",
                "projects",
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

    @admin.display(description="Current image")
    def image_preview(self, obj):
        return thumbnail(obj.image)

    def save_model(self, request, obj, form, change):
        if "image" in form.changed_data and form.cleaned_data.get("image"):
            warn_if_small(request, "The main image", form.cleaned_data["image"], MIN_WIDTH_MAIN)
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        if formset.model is ServiceImage:
            for item in formset.forms:
                if "image" in item.changed_data and item.cleaned_data.get("image"):
                    warn_if_small(request, "A gallery image", item.cleaned_data["image"], MIN_WIDTH_GALLERY)
        super().save_formset(request, form, formset, change)
