import datetime

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Testimonial(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    quote = models.TextField()
    avatar = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    order = models.IntegerField(default=0, help_text="Lower numbers appear first. Equal numbers: newest first.")
    is_active = models.BooleanField(default=True, help_text="Untick to hide this testimonial without deleting it.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.company}"

class ClientLogo(models.Model):
    name = models.CharField(max_length=100, help_text="Company name, shown when the logo is hovered.")
    logo = models.ImageField(upload_to='clients/', help_text="PNG, JPG or WebP. A transparent PNG looks best.")
    description = models.CharField(max_length=200, blank=True, help_text="Optional. A short line shown under the name.")
    order = models.PositiveIntegerField(default=0, help_text="Lower numbers appear first.")
    is_active = models.BooleanField(default=True, help_text="Untick to hide this logo without deleting it.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


# The days of the week as the website counts them (0 = Sunday)
WEEKDAYS = [('1', 'Monday'), ('2', 'Tuesday'), ('3', 'Wednesday'), ('4', 'Thursday'), ('5', 'Friday'), ('6', 'Saturday'), ('0', 'Sunday')]


class SiteSettings(models.Model):
    """The company's details, shown across the whole website. There is only ever one of these."""

    phone = models.CharField(max_length=32, default='+91 94475 95381', help_text="As it should be shown, with the country code, e.g. +91 94475 95381.")
    email = models.EmailField(default='info@in-tasolutions.com')

    street = models.CharField(max_length=120, default='Thonichal', help_text="Street or area, e.g. Thonichal.")
    locality = models.CharField(max_length=80, default='Mananthavady', help_text="Town, e.g. Mananthavady.")
    district = models.CharField(max_length=80, default='Wayanad', help_text="District, e.g. Wayanad. Shown at the top of every page.")
    region = models.CharField(max_length=80, default='Kerala', help_text="State, e.g. Kerala.")
    postal_code = models.CharField(max_length=20, default='670645')
    country = models.CharField(max_length=2, default='IN', help_text="Two-letter country code, e.g. IN.")
    latitude = models.DecimalField(max_digits=8, decimal_places=4, default=11.8021, validators=[MinValueValidator(-90), MaxValueValidator(90)], help_text="Shown as the office's coordinates. The About and Contact globes are drawn for the current office, so if the office moves, they also need new imagery from your developer.")
    longitude = models.DecimalField(max_digits=8, decimal_places=4, default=76.0232, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    map_url = models.URLField(blank=True, help_text="Optional. The 'Open in Maps' link. Leave empty to point Google Maps at the coordinates above.")

    open_days = models.CharField(max_length=20, default='1,2,3,4,5,6', help_text="The days the office is open.")
    opens_at = models.TimeField(default=datetime.time(9, 0), help_text="India time.")
    closes_at = models.TimeField(default=datetime.time(17, 0), help_text="India time.")

    linkedin_url = models.URLField(blank=True, default='https://www.linkedin.com/company/in-ta-solutions/')
    instagram_url = models.URLField(blank=True, default='https://www.instagram.com/intasolutions')
    facebook_url = models.URLField(blank=True, default='https://www.facebook.com/share/17taAqPXPP/')
    x_url = models.URLField('X (Twitter) URL', blank=True, default='https://x.com/intasolution')
    youtube_url = models.URLField('YouTube URL', blank=True, default='https://www.youtube.com/@IN-TASolutionsPvtLtd')

    page_text = models.JSONField(default=dict, blank=True, help_text="The website's wording that has been changed from the standard. Edited in the 'Page wording' boxes.")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site settings'
        verbose_name_plural = 'Site settings'

    def __str__(self):
        return 'Site settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # only ever one
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]


class HeroMetric(models.Model):
    """One of the figures along the bottom of the home page's opening."""

    settings = models.ForeignKey(SiteSettings, on_delete=models.CASCADE, related_name='metrics')
    label = models.CharField(max_length=40, help_text="Small capitals above the figure, e.g. EXPERIENCE INDEX.")
    value = models.CharField(max_length=12, help_text="The figure, which counts up, e.g. 20, 99.9 or <100.")
    unit = models.CharField(max_length=12, blank=True, help_text="Beside the figure, in blue, e.g. + or %.")
    note = models.CharField(max_length=60, blank=True, help_text="Small line under it.")
    order = models.IntegerField(default=0, help_text="Lower numbers appear first.")

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Home page figure'

    def __str__(self):
        return f'{self.label}: {self.value}{self.unit}'
