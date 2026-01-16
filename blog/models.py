from django.db import models

class Blog(models.Model):
    title = models.CharField(max_length=200)
    date = models.DateField()
    tag = models.CharField(max_length=50) # e.g. Design, Engineering
    image = models.ImageField(upload_to='blogs/', blank=True, null=True)
    link = models.URLField(blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-date']

class Subscriber(models.Model):
    INTEREST_CHOICES = [
        ('Web Development', 'Web Development'),
        ('UI/UX Design', 'UI/UX Design'),
        ('App Development', 'App Development'),
        ('Video Production', 'Video Production'),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    interest = models.CharField(max_length=50, choices=INTEREST_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.interest}"
