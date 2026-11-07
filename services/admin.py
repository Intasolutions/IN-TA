from django import forms
from django.contrib import admin, messages
from django.utils.html import format_html
from .models import Feature, Service, ServiceCapability, ServiceFAQ, ServiceImage, Technology, Benefit
from .page_text import FORM_OPTIONS, PAGE_SECTIONS, PAGE_TEXT, TEXT_KEYS

# The narrowest image that still looks sharp where it is used
MIN_WIDTH_MAIN = 2400
MIN_WIDTH_GALLERY = 1600
MIN_WIDTH_CAPABILITY = 1200


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
    list_display = ("name", "slug", "logo_preview", "on_about_page", "about_group", "about_order")
    list_editable = ("on_about_page", "about_order")
    list_filter = ("on_about_page", "about_group")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("logo_preview",)
    fieldsets = (
        (None, {"fields": ("name", "slug", "logo_preview", "logo")}),
        ("About page orbit", {
            "description": "The tools that circle the core on the About page. Without a logo uploaded, a tool the site already knows keeps its own logo; any other tool needs one.",
            "fields": ("on_about_page", "about_group", "about_use", "about_order"),
        }),
    )

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


class ServiceCapabilityInline(admin.StackedInline):
    model = ServiceCapability
    extra = 1
    fields = ("title", "description", "points", "preview", "image", "order")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        return thumbnail(obj.image)


class ServiceFAQInline(admin.StackedInline):
    model = ServiceFAQ
    extra = 1
    fields = ("question", "answer", "order")


class PageTextForm(forms.ModelForm):
    """Shows the wording kept in Service.page_text as one box per wording, and the page's sections as tick boxes."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        saved = self.instance.page_text or {}
        for key in TEXT_KEYS:
            self.initial[f"text_{key}"] = saved.get(key, "")
        hidden = saved.get("hide", [])
        for key, _ in PAGE_SECTIONS:
            self.initial[f"show_{key}"] = key not in hidden
        self.initial["form_interest"] = saved.get("form_interest", "")

    def save(self, commit=True):
        text = {}
        for key in TEXT_KEYS:
            value = (self.cleaned_data.get(f"text_{key}") or "").strip()
            if value:
                text[key] = value
        hidden = [key for key, _ in PAGE_SECTIONS if not self.cleaned_data.get(f"show_{key}")]
        if hidden:
            text["hide"] = hidden
        if self.cleaned_data.get("form_interest"):
            text["form_interest"] = self.cleaned_data["form_interest"]
        self.instance.page_text = text
        return super().save(commit)


def page_text_form():
    """The form with its boxes declared, so that the admin can place them. They come from services/page_text.py."""
    declared = {"Meta": type("Meta", (), {"model": Service, "fields": "__all__"})}
    for _, items in PAGE_TEXT:
        for key, label, standard in items:
            wide = len(standard) > 60
            declared[f"text_{key}"] = forms.CharField(
                required=False,
                label=label,
                help_text=f"Leave empty for: {standard}",
                widget=forms.Textarea(attrs={"rows": 2, "cols": 80}) if wide else forms.TextInput(attrs={"size": 60}),
            )
    for key, label in PAGE_SECTIONS:
        declared[f"show_{key}"] = forms.BooleanField(required=False, initial=True, label=label)
    declared["form_interest"] = forms.ChoiceField(
        required=False,
        label="Option picked first on the form",
        choices=[("", "The usual one for this service")] + [(option, option) for option in FORM_OPTIONS],
    )
    return type(PageTextForm)("ServicePageForm", (PageTextForm,), declared)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    form = page_text_form()
    list_display = ("title", "slug", "is_active", "order")
    list_filter = ("is_active",)
    search_fields = ("title", "short_description", "long_description")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("features", "technologies", "benefits", "projects")
    ordering = ("order", "title")
    readonly_fields = ("image_preview", "secondary_image_preview")
    inlines = (ServiceCapabilityInline, ServiceImageInline, ServiceFAQInline)

    fieldsets = (
        ("Main Content", {
            "fields": (
                "title",
                "slug",
                "short_description",
                "long_description",
                "ideal_for",
                "order",
                "is_active",
            )
        }),
        ("Second Description", {
            "description": "An optional second section on the service's page, below What's included.",
            "fields": (
                "secondary_title",
                "secondary_description",
                "secondary_image_preview",
                "secondary_image",
            )
        }),
        ("Sections on this service's page", {
            "description": "Untick a section to hide it for this service. A section with nothing to show stays hidden anyway.",
            "classes": ("collapse",),
            "fields": tuple(f"show_{key}" for key, _ in PAGE_SECTIONS),
        }),
        *(
            (f"Page wording: {name}", {
                "description": "Leave a box empty to use the standard wording shown under it. {part} becomes the name of the part, {part_lower} the same in small letters, and {title} the service's title. In a heading, put | before the words that should be in blue.",
                "classes": ("collapse",),
                "fields": tuple(f"text_{key}" for key, _, _ in items) + (("form_interest",) if name == "Enquiry form" else ()),
            })
            for name, items in PAGE_TEXT
        ),
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

    @admin.display(description="Preview")
    def secondary_image_preview(self, obj):
        return thumbnail(obj.secondary_image)

    def save_model(self, request, obj, form, change):
        if "image" in form.changed_data and form.cleaned_data.get("image"):
            warn_if_small(request, "The main image", form.cleaned_data["image"], MIN_WIDTH_MAIN)
        if "secondary_image" in form.changed_data and form.cleaned_data.get("secondary_image"):
            warn_if_small(request, "The second description's image", form.cleaned_data["secondary_image"], MIN_WIDTH_GALLERY)
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        minimums = {ServiceImage: ("A gallery image", MIN_WIDTH_GALLERY), ServiceCapability: ("A capability image", MIN_WIDTH_CAPABILITY)}
        rule = minimums.get(formset.model)
        if rule:
            for item in formset.forms:
                if "image" in item.changed_data and item.cleaned_data.get("image"):
                    warn_if_small(request, rule[0], item.cleaned_data["image"], rule[1])
        super().save_formset(request, form, formset, change)
