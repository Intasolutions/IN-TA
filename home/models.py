from django.db import models

class Testimonial(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    quote = models.TextField()
    avatar = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
