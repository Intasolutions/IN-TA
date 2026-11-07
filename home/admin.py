from django import forms
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.html import format_html

from .models import WEEKDAYS, ClientLogo, HeroMetric, SiteSettings, Testimonial
from .site_text import SITE_TEXT, TEXT_KEYS


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'role', 'order', 'is_active', 'created_at')
    list_editable = ('order', 'is_active')
    list_filter = ('is_active',)
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


class HeroMetricInline(admin.TabularInline):
    model = HeroMetric
    extra = 0
    max_num = 4
    fields = ('label', 'value', 'unit', 'note', 'order')
    verbose_name_plural = 'Home page figures (up to four, along the bottom of the opening)'


class SiteSettingsForm(forms.ModelForm):
    """The office days as tick boxes, and the website's wording as one box per wording (kept in page_text)."""

    open_days = forms.MultipleChoiceField(choices=WEEKDAYS, widget=forms.CheckboxSelectMultiple, label='Open on', help_text='The days the office is open.')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.initial['open_days'] = [d for d in (self.instance.open_days or '').split(',') if d]
        saved = self.instance.page_text or {}
        for key in TEXT_KEYS:
            self.initial[f'text_{key}'] = saved.get(key, '')

    def clean_open_days(self):
        days = self.cleaned_data['open_days']
        if not days:
            raise forms.ValidationError('Pick at least one day.')
        return ','.join(sorted(days, key=lambda d: (int(d) or 7)))

    def clean(self):
        data = super().clean()
        opens, closes = data.get('opens_at'), data.get('closes_at')
        if opens and closes and closes <= opens:
            self.add_error('closes_at', 'The office has to close after it opens.')
        return data

    def save(self, commit=True):
        text = {}
        for key in TEXT_KEYS:
            # line breaks typed in the admin arrive as \r\n
            value = (self.cleaned_data.get(f'text_{key}') or '').replace('\r\n', '\n').strip()
            if value:
                text[key] = value
        self.instance.page_text = text
        return super().save(commit)


def site_settings_form():
    """The form with one box per wording in home/site_text.json, so that the admin can place them."""
    declared = {'Meta': type('Meta', (), {'model': SiteSettings, 'fields': '__all__'})}
    for _, items in SITE_TEXT:
        for key, label, standard in items:
            wide = len(standard) > 60 or '\n' in standard
            declared[f'text_{key}'] = forms.CharField(
                required=False,
                label=label,
                help_text=format_html('Leave empty for: <em>{}</em>', standard.replace('\n', ' / ')),
                widget=forms.Textarea(attrs={'rows': 3 if '\n' in standard else 2, 'cols': 80}) if wide else forms.TextInput(attrs={'size': 60}),
            )
    return type(SiteSettingsForm)('SiteSettingsAdminForm', (SiteSettingsForm,), declared)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    form = site_settings_form()
    inlines = (HeroMetricInline,)
    readonly_fields = ('updated_at',)
    fieldsets = (
        ('Contact', {
            'description': 'Shown in the header, the footer, the contact page and to search engines. Changes reach the website within five minutes.',
            'fields': ('phone', 'email'),
        }),
        ('Address and map', {
            'fields': ('street', 'locality', 'district', 'region', 'postal_code', 'country', 'latitude', 'longitude', 'map_url'),
        }),
        ('Office hours', {
            'description': 'The website works out from these whether the office is open right now.',
            'fields': ('open_days', 'opens_at', 'closes_at'),
        }),
        ('Social media', {
            'description': 'Leave a link empty to hide that icon.',
            'fields': ('linkedin_url', 'instagram_url', 'facebook_url', 'x_url', 'youtube_url'),
        }),
        *(
            (f'Page wording: {name}', {
                'description': 'Leave a box empty to use the standard wording shown under it. In a heading, put | before the words that should be in blue. Where a box has more than one line, each line is a line on the page. {street}, {locality}, {district} and {region} become the office address above.',
                'classes': ('collapse',),
                'fields': tuple(f'text_{key}' for key, _, _ in items),
            })
            for name, items in SITE_TEXT
        ),
        ('Last saved', {'fields': ('updated_at',)}),
    )

    # There is only one: the list goes straight to it, and it can be neither added again nor deleted
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj = SiteSettings.load()
        return redirect(reverse('admin:home_sitesettings_change', args=[obj.pk]))
