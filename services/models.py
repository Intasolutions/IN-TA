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
    logo = models.ImageField(upload_to="services/technologies/", blank=True, null=True, help_text="PNG with a transparent background, at least 256px wide")
    on_about_page = models.BooleanField("Show on the About page", default=False, help_text="Puts this tool in the orbit on the About page.")
    about_group = models.CharField("Orbit ring", max_length=12, blank=True, choices=[
        ("ai", "Intelligence (AI)"),
        ("frontend", "Product (front end)"),
        ("design", "Product (design)"),
        ("backend", "Platform (back end)"),
        ("cloud", "Platform (cloud)"),
    ], help_text="Which ring of the orbit it sits on.")
    about_use = models.CharField("What we use it for", max_length=80, blank=True, help_text="Shown when the logo is hovered or tapped, e.g. 'Type-safe code across the whole stack'.")
    about_order = models.IntegerField("Order in the orbit", default=0, help_text="Lower numbers come first in their ring.")

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
    ideal_for = models.TextField(blank=True, help_text="Who this service suits, shown as 'Right for you if'. One per line, up to four short lines. Optional.")
    page_text = models.JSONField(default=dict, blank=True, help_text="The wording of this service's page that differs from the standard. Edited in the 'Page wording' boxes.")
    secondary_title = models.CharField(max_length=120, blank=True, help_text="Heading for the second description. Its last word takes the blue accent. Optional.")
    secondary_description = models.TextField(blank=True, help_text="A second, more detailed description. Leave a blank line between paragraphs. Its section only appears when this is filled in.")
    secondary_image = models.ImageField(upload_to="services/images/", blank=True, null=True, help_text="A picture beside the second description. Optional. At least 1600px wide")
    features = models.ManyToManyField(Feature, blank=True, related_name="services")
    technologies = models.ManyToManyField(Technology, blank=True, related_name="services")
    benefits = models.ManyToManyField(Benefit, blank=True, related_name="services")
    projects = models.ManyToManyField("portfolio.Project", blank=True, related_name="services", help_text="Real work that used this service, shown on its page")

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

    # Where the service sits in the site's fixed designs: a drawn part of the Services page board, and a card on the home
    # page. Each spot holds one service. (services/migrations/0008 filled them in as the site showed them before.)
    BOARD_PARTS = [
        ("ai", "Neural engine: the large part in the centre"),
        ("software", "Compute core: top left"),
        ("ui", "Display engine: top middle"),
        ("web", "Network block: top right"),
        ("marketing", "Signal block: right"),
        ("seo", "Index block: bottom right"),
        ("media", "Media engine: bottom middle"),
        ("mobile", "Mobile cluster: bottom left"),
    ]
    board_part = models.CharField(
        "Part on the board", max_length=12, choices=BOARD_PARTS, blank=True,
        help_text="Leave empty to list the service above the board instead.",
    )
    board_label = models.CharField(
        "Name printed on the part", max_length=16, blank=True,
        help_text="Short, e.g. 'Web'. Printed on the part and shown as the camera reaches it. Leave empty for the service's title.",
    )

    HOME_CARDS = [(1, "Card 1: the large one, with the network drawing"), (2, "Card 2"), (3, "Card 3"), (4, "Card 4"), (5, "Card 5")]
    # The icons the website already loads (MATERIAL_ICONS in app/layout.tsx); a new one has to be added there too
    CARD_ICONS = [
        ("neurology", "Brain"),
        ("code", "Code"),
        ("domain", "Building"),
        ("devices", "Phone and laptop"),
        ("speed", "Speedometer"),
        ("design_services", "Design tools"),
        ("terminal", "Terminal"),
        ("developer_board", "Circuit board"),
        ("travel_explore", "Globe and magnifier"),
        ("search", "Magnifier"),
    ]
    home_card = models.PositiveSmallIntegerField(
        "Card on the home page", choices=HOME_CARDS, null=True, blank=True,
        help_text="The home page's 'Specialized Capabilities' has five cards. The card links to this service's page.",
    )
    home_card_track = models.CharField("Card: small line", max_length=60, blank=True, help_text="Above the title, e.g. 'Track 02 // Web Runtimes'.")
    home_card_title = models.CharField("Card: title", max_length=120, blank=True, help_text="Leave empty for the service's title.")
    home_card_text = models.TextField("Card: text", blank=True, help_text="Leave empty for the short description.")
    home_card_tags = models.CharField("Card: tags", max_length=200, blank=True, help_text="Separate them with commas.")
    home_card_icon = models.CharField("Card: icon", max_length=24, choices=CARD_ICONS, blank=True, help_text="Leave empty for the card's usual one.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title"]
        indexes = [models.Index(fields=["slug"])]
        constraints = [
            models.UniqueConstraint(
                fields=["board_part"], condition=~models.Q(board_part=""), name="one_service_per_board_part",
                violation_error_message="Another service already sits on that part of the board. Clear it there first.",
            ),
            models.UniqueConstraint(
                fields=["home_card"], condition=models.Q(home_card__isnull=False), name="one_service_per_home_card",
                violation_error_message="Another service already has that home page card. Clear it there first.",
            ),
        ]

    def spots(self):
        """The fixed places this service holds, in words, for the admin's messages."""
        held = []
        if self.home_card:
            held.append(f"home page card {self.home_card}")
        if self.board_part:
            held.append(f"the {self.get_board_part_display().split(':')[0]} on the Services page board")
        return " and ".join(held)

    @property
    def icon_path(self):
        # Fallback for frontend compatibility
        return f"/api/placeholder/100/100?text={self.icon_key}"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse("services:detail", kwargs={"slug": self.slug})


class ServiceImage(models.Model):
    """A picture in the 'In real use' gallery on a service's page."""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="gallery")
    image = models.ImageField(upload_to="services/gallery/", help_text="At least 1600px wide, so that it stays sharp")
    caption = models.CharField(max_length=200, blank=True)
    alt_text = models.CharField(max_length=200, blank=True, help_text="Describes the image for screen readers and search")
    order = models.IntegerField(default=0, help_text="Low numbers come first")

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Gallery image"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.caption or f"Image {self.pk}"


class ServiceCapability(models.Model):
    """One thing we do within a service, shown as its own block in 'What we do' on the service's page."""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="capabilities")
    title = models.CharField(max_length=80, help_text="Short: two to four words. The last word takes the blue accent.")
    description = models.TextField(help_text="What this is and what it does for the customer, in two or three sentences.")
    points = models.TextField(blank=True, help_text="Optional key points. One per line, up to five short lines.")
    image = models.ImageField(upload_to="services/capabilities/", blank=True, null=True, help_text="Optional. At least 1200px wide")
    order = models.IntegerField(default=0, help_text="Low numbers come first")

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Capability"
        verbose_name_plural = "What we do (capabilities)"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title


class ServiceFAQ(models.Model):
    """A common question on a service's page."""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="faqs")
    question = models.CharField(max_length=255)
    answer = models.TextField()
    order = models.IntegerField(default=0, help_text="Low numbers come first")

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.question
