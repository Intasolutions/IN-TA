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


class HomeQuestion(models.Model):
    """Before the shared questions (Question): kept only until its table is dropped, once the site reads Question. Not used
    by the website or the admin any more; its rows were copied into Question (home 0005)."""

    settings = models.ForeignKey(SiteSettings, on_delete=models.CASCADE, related_name='questions')
    question = models.CharField(max_length=200, help_text="As a visitor would ask it, e.g. How long does a website take?")
    answer = models.TextField(max_length=1200, help_text="A short, plain answer: two or three sentences. A blank line starts a new paragraph.")
    order = models.IntegerField(default=0, help_text="Lower numbers appear first.")
    is_active = models.BooleanField(default=True, help_text="Untick to hide it without deleting it.")

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Home page question'

    def __str__(self):
        return self.question


class Question(models.Model):
    """A question and its answer, shown on the pages it is given to (Questions & answers in the admin). A page shows no
    question section at all until it has one. One question can be on several pages; search engines are told about it on
    one of them only (its main page), as Google asks for answers that appear in more than one place."""

    PAGES = [('home', 'Home'), ('services', 'Services'), ('about', 'About'), ('contact', 'Contact')]
    SERVICE_PAGE = 'service'
    # How many each page shows (the first ones, by order): enough to answer, few enough not to bury the page
    LIMITS = {'home': 8, 'services': 6, 'about': 5, 'contact': 5, SERVICE_PAGE: 5}
    # Where a question is told to search engines when its main page is left on automatic: the most specific page first
    MAIN_ORDER = (SERVICE_PAGE, 'contact', 'about', 'services', 'home')

    question = models.CharField(
        max_length=200,
        help_text='As people would type it into Google, in under about 12 words, e.g. "Can you build a booking website for a homestay?"',
    )
    answer = models.TextField(
        max_length=1200,
        help_text='Answer in the first sentence ("Yes. ..."), then add the useful detail: 40 to 80 words. Name the service and the place where it '
        'fits naturally, and only state what is true. A blank line starts a new paragraph.',
    )
    pages = models.CharField(max_length=60, blank=True, help_text='The pages it is shown on.')
    services = models.ManyToManyField('services.Service', blank=True, related_name='questions', help_text="Also shown on these services' pages.")
    main_page = models.CharField(
        max_length=20,
        blank=True,
        help_text='Where search engines are told about it, if it is on more than one page. Automatic picks the most specific: '
        'a service page, then Contact, About, Services, Home.',
    )
    order = models.IntegerField(default=0, help_text='Lower numbers appear first.')
    is_active = models.BooleanField(default=True, help_text='Untick to hide it everywhere without deleting it.')

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Question'
        verbose_name_plural = 'Questions & answers'

    def __str__(self):
        return self.question

    @property
    def page_list(self):
        return [p for p in self.pages.split(',') if p in dict(self.PAGES)]

    def main_key(self, services=None):
        """'home', 'services', 'about', 'contact' or 'service:<id>': the one page where search engines are told about it.
        `services` are its active services in their order (given when they are already loaded)."""
        services = list(services if services is not None else self.services.filter(is_active=True).order_by('order', 'title'))
        shown = {p: True for p in self.page_list}
        if services:
            shown[self.SERVICE_PAGE] = True
        choice = self.main_page if shown.get(self.main_page) else next((p for p in self.MAIN_ORDER if shown.get(p)), '')
        return f'{self.SERVICE_PAGE}:{services[0].id}' if choice == self.SERVICE_PAGE else choice
