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


class Technology(models.Model):
    """Tech stack used for the service (e.g., 'Next.js', 'PostgreSQL')."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "Technologies"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Benefit(models.Model):
    """Strategic benefits for the service immersion section."""
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="Sub-text for the benefit point")

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return self.title


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
    technologies = models.ManyToManyField(Technology, blank=True, related_name="services")
    benefits = models.ManyToManyField(Benefit, blank=True, related_name="services")

    # Visual Assets
    image = models.ImageField(upload_to='services/images/', blank=True, null=True, help_text="Main editorial image for service detail page")
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

    # SEO Fields
    meta_title = models.CharField(max_length=200, blank=True, null=True, help_text="Custom SEO title (optional)")
    meta_description = models.TextField(blank=True, null=True, help_text="Custom SEO description (optional)")
    focus_keyword = models.CharField(max_length=100, blank=True, null=True, help_text="Primary focus keyword")
    image_alt = models.CharField(max_length=200, blank=True, null=True, help_text="Alt text for screen readers & SEO")

    # Admin/UI helpers
    order = models.IntegerField(default=0, help_text="Sort order for listing services (low->high)")
    is_active = models.BooleanField(default=True, help_text="If false, the service is hidden from public lists")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title"]
        indexes = [models.Index(fields=["slug"])]

    @property
    def icon_path(self):
        # Fallback for frontend compatibility
        return f"/api/placeholder/100/100?text={self.icon_key}"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse("services:detail", kwargs={"slug": self.slug})
