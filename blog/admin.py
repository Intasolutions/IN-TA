from django.contrib import admin
from .models import Blog, Subscriber
from home.retention import RetentionAdminMixin

@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'tag', 'focus_keyword')
    search_fields = ('title', 'tag', 'focus_keyword')
    list_filter = ('tag', 'date')
    
    fieldsets = (
        ('Main Content', {
            'fields': ('title', 'tag', 'date', 'image', 'content', 'link')
        }),
        ('SEO Settings', {
            'fields': ('slug', 'meta_title', 'meta_description', 'focus_keyword', 'image_alt'),
            'description': 'These fields explicitly customize how this blog post appears in Google Search and social media sharing.'
        }),
    )

@admin.register(Subscriber)
class SubscriberAdmin(RetentionAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'company', 'email', 'phone', 'interest', 'created_at')
    list_filter = ('interest', 'created_at')
    search_fields = ('name', 'company', 'email', 'phone', 'message')
    readonly_fields = ('created_at',)
    fields = ('name', 'company', 'email', 'phone', 'interest', 'message', 'created_at')
