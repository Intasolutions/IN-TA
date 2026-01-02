from django.db import models
from django.utils.text import slugify


class Tag(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Project(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=260, unique=True)
    role = models.CharField(max_length=120, blank=True)
    summary = models.TextField(blank=True)
    hero = models.ImageField(upload_to="portfolio/heroes/", blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="projects")
    external_url = models.URLField(blank=True)

    featured = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-featured", "order", "title"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title


class GalleryItem(models.Model):
    title = models.CharField(max_length=220)
    image = models.ImageField(upload_to="portfolio/gallery/")
    href = models.URLField(blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title
