from django.db import models
from django.utils.text import slugify


class Feature(models.Model):
    """A simple tag-like feature used by services (e.g., 'Figma → UI', 'Responsive')."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Service(models.Model):
    """Model for a service exposed on the Services page.

    Fields mirror the frontend 'Service' type: id/slug, title, short description, features,
    optional color and icon path or svg, plus ordering and visibility flags.
    """
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    short_description = models.CharField(max_length=255)
    long_description = models.TextField(blank=True)
    features = models.ManyToManyField(Feature, blank=True, related_name="services")

    # Visual/UX fields used by the frontend
    color = models.CharField(max_length=24, blank=True, help_text="Hex color used for accent (e.g. #1f6fe6)")
    ICON_CHOICES = [
    ("code", "Code"),
    ("ux", "UX / Design"),
    ("mobile", "Mobile App"),
    ("video", "Video"),
    ("marketing", "Marketing"),
    ("seo", "SEO"),
    ("software_development", "Software Development"),
    ("ai_integration", "AI Integration"),
    ]

    icon_key = models.CharField(
    max_length=20,
    choices=ICON_CHOICES,
    default="code",
    help_text="Icon identifier used by frontend"
    )


    # Admin/UI helpers
    order = models.IntegerField(default=0, help_text="Sort order for listing services (low->high)")
    is_active = models.BooleanField(default=True, help_text="If false, the service is hidden from public lists")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title

    def get_absolute_url(self):
        from django.urls import reverse

        return reverse("services:detail", kwargs={"slug": self.slug})

