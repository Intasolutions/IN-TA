from django.db import models
from django.utils.text import slugify
from ckeditor.fields import RichTextField

SLUG_MAX = 80

META_TITLE_HELP = (
    "The title shown in Google (optional; otherwise the post's title). Keep it under 60 characters or Google cuts it off. "
    "Don't add the company name: the website adds \"| IN-TA Solutions\" itself when there is room."
)


def slug_for(title, taken, max_length=SLUG_MAX):
    """A post's web address from its title: lowercase words joined by hyphens, cut at a whole word, made unique."""
    base = slugify(title) or 'post'
    if base.isdigit():  # all digits would read as the post's number
        base = f'post-{base}'
    if len(base) > max_length:
        base = base[:max_length].rsplit('-', 1)[0] or base[:max_length]
    slug, n = base, 2
    while slug in taken:
        suffix = f'-{n}'
        slug = f'{base[:max_length - len(suffix)].rstrip("-")}{suffix}'
        n += 1
    return slug


class Blog(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(
        max_length=SLUG_MAX, unique=True, blank=True,
        help_text="The post's web address: in-tasolutions.com/blog/<this>. Left empty, it is made from the title. "
                  "Changing it later breaks links people already shared, so set it once.",
    )
    date = models.DateField()
    tag = models.CharField(max_length=50) # e.g. Design, Engineering
    image = models.ImageField(upload_to='blogs/', blank=True, null=True)
    link = models.URLField(blank=True, null=True)
    content = RichTextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # SEO Fields
    meta_title = models.CharField(max_length=200, blank=True, null=True, help_text=META_TITLE_HELP)
    meta_description = models.TextField(blank=True, null=True, help_text="Custom SEO description (optional). Recommended length: 150-160 characters.")
    focus_keyword = models.CharField(max_length=100, blank=True, null=True, help_text="Primary keyword for internal tracking (optional).")
    image_alt = models.CharField(max_length=200, blank=True, null=True, help_text="Custom alt text for the blog image (optional). Crucial for accessibility and SEO.")

    def save(self, *args, **kwargs):
        if not self.slug:
            taken = set(Blog.objects.exclude(pk=self.pk).values_list('slug', flat=True))
            self.slug = slug_for(self.title, taken)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-date']

class Subscriber(models.Model):
    """An enquiry from the "Tell us what you'd like to fix" form. Its options are the "What do you need?" list in Page
    wording (Enquiry form), plus a service's own name on that service's page."""

    # The options the form offered before it listed the services. Still accepted, so that a page built before the change
    # (or a visitor who opened it then) can still send.
    OLD_INTERESTS = (
        'Enterprise Web Solutions', 'Mobile App Development', 'UI/UX Design Strategy', 'System Architecture',
        'Web Development', 'UI/UX Design', 'App Development', 'Video Production',
    )

    name = models.CharField(max_length=100)
    email = models.EmailField('business email', blank=True, help_text='Empty on enquiries sent before the form asked for it.')
    phone = models.CharField('phone / WhatsApp', max_length=20, blank=True, help_text='Optional on the form since it asks for an email.')
    company = models.CharField(max_length=120, blank=True)
    interest = models.CharField('what they need', max_length=200, help_text='The option picked on the form.')
    message = models.CharField('the problem, in a line', max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'enquiry'
        verbose_name_plural = 'enquiries'

    def __str__(self):
        return f"{self.name} - {self.interest}"
