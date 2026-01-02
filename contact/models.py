from django.db import models


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True, help_text='Mobile number without country code')
    country = models.CharField(max_length=64, blank=True, help_text='Country name or code (e.g. India, IN)')
    message = models.TextField()
    is_request = models.BooleanField(default=False, help_text='Whether user marked this as a submit request')
    source = models.CharField(max_length=200, blank=True, help_text='Optional: where the message came from')
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact message'
        verbose_name_plural = 'Contact messages'

    def __str__(self):
        return f"{self.name} <{self.email}> — {self.message[:40]}"
