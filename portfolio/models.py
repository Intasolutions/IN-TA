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

    # Its own page on the website (/portfolio/<slug>), once the first two are filled in. Only what is true about the
    # project: the client's words where possible, real results only.
    challenge = models.TextField("What the client needed", blank=True, help_text="Their business and the problem to solve, in two to four sentences. A blank line starts a new paragraph.")
    solution = models.TextField("What we built", blank=True, help_text="What the site, app or software does, and the main features. A blank line starts a new paragraph.")
    outcome = models.TextField("The result", blank=True, help_text="What changed for the client, only what is true (for example faster billing, more enquiries, online since 2024). Leave empty if you're not sure.")
    stack = models.CharField("Tools used", max_length=200, blank=True, help_text="Separated by commas, e.g. Next.js, Django, PostgreSQL.")
    meta_description = models.CharField("Search description", max_length=170, blank=True, help_text="What search engines show under the page title, up to 160 characters. Empty: the summary is used.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-featured", "order", "title"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title

    @property
    def has_case_study(self) -> bool:
        """Whether the project has its own page: only when there is something real to say on it."""
        return bool(self.challenge.strip() and self.solution.strip())


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
