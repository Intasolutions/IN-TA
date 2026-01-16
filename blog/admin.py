from django.contrib import admin
from .models import Blog, Subscriber

@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'tag')
    search_fields = ('title', 'tag')
    list_filter = ('tag', 'date')

@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'interest', 'created_at')
    list_filter = ('interest', 'created_at')
    search_fields = ('name', 'phone')
    readonly_fields = ('created_at',)
