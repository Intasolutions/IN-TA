from django.contrib import admin
from django.utils.html import format_html
from .models import ClientLogo, Testimonial

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'role', 'created_at')
    search_fields = ('name', 'company', 'quote')

@admin.register(ClientLogo)
class ClientLogoAdmin(admin.ModelAdmin):
    list_display = ('preview', 'name', 'description', 'order', 'is_active')
    list_display_links = ('preview', 'name')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'description')
    readonly_fields = ('preview',)
    fields = ('name', 'logo', 'preview', 'description', 'order', 'is_active')

    @admin.display(description='Logo')
    def preview(self, obj):
        if not obj.logo:
            return '-'
        return format_html('<img src="{}" alt="" style="height:40px;max-width:120px;object-fit:contain;background:#fff;padding:4px;border-radius:6px;" />', obj.logo.url)
