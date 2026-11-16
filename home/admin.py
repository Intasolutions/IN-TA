from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.html import format_html

from services.models import Service

from .models import WEEKDAYS, ClientLogo, HeroMetric, Question, SiteSettings, Testimonial
from .site_text import GROUP_NOTES, SITE_TEXT, TEXT_KEYS


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


class QuestionForm(forms.ModelForm):
    """The pages as tick boxes (kept as a comma list), the services as tick boxes, and the main page as a choice."""

    pages = forms.MultipleChoiceField(choices=Question.PAGES, widget=forms.CheckboxSelectMultiple, required=False, label='Show on')
    main_page = forms.ChoiceField(
        choices=[('', 'Automatic (recommended)'), *Question.PAGES, (Question.SERVICE_PAGE, 'Its first service page')],
        required=False,
        label='Main page for search engines',
        help_text=Question._meta.get_field('main_page').help_text,
    )

    class Meta:
        model = Question
        fields = ('question', 'answer', 'pages', 'services', 'main_page', 'order', 'is_active')
        widgets = {'services': forms.CheckboxSelectMultiple}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.initial['pages'] = self.instance.page_list
        self.fields['services'].queryset = Service.objects.order_by('order', 'title')
        self.fields['services'].label = 'Also show on service pages'

    def clean(self):
        data = super().clean()
        pages, services, main = data.get('pages') or [], data.get('services'), data.get('main_page')
        if data.get('is_active') and not pages and not services:
            raise forms.ValidationError('Choose at least one page to show it on (or untick Active to keep it as a draft).')
        if main == Question.SERVICE_PAGE and not services:
            self.add_error('main_page', 'Choose a service page above first, or leave this on Automatic.')
        elif main and main != Question.SERVICE_PAGE and main not in pages:
            self.add_error('main_page', 'It has to be one of the pages it is shown on, or Automatic.')
        return data

    def clean_pages(self):
        return ','.join(p for p, _ in Question.PAGES if p in (self.cleaned_data.get('pages') or []))


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    form = QuestionForm
    list_display = ('question', 'shown_on', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    list_filter = ('is_active', 'services')
    search_fields = ('question', 'answer')
    fieldsets = (
        (None, {
            'description': 'Questions with short answers, on the pages where they help. A page shows its first few by order '
            '(Home 8, Services 6, About and Contact 5, a service page 5) and has no question section until it has one. '
            'A question can be on several pages; search engines are told about it on one of them.',
            'fields': ('question', 'answer'),
        }),
        ('Where it shows', {'fields': ('pages', 'services', 'main_page')}),
        (None, {'fields': ('order', 'is_active')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('services')

    @admin.display(description='Shown on')
    def shown_on(self, obj):
        names = dict(Question.PAGES)
        return ', '.join([names[p] for p in obj.page_list] + [s.title for s in obj.services.all()]) or '-'

    def changelist_view(self, request, extra_context=None):
        """Says which pages have more questions than they show, and which questions appear twice on one page."""
        if request.method != 'GET':
            return super().changelist_view(request, extra_context)
        live = list(Question.objects.filter(is_active=True).prefetch_related('services'))
        names = dict(Question.PAGES)
        on_page = {}
        for q in live:
            for key in [names[p] for p in q.page_list] + [f'the {s.title} page' for s in q.services.all()]:
                on_page.setdefault(key, []).append(q)
        for page, questions in on_page.items():
            limit = Question.LIMITS['service' if page.startswith('the ') else next(k for k, v in names.items() if v == page)]
            if len(questions) > limit:
                messages.warning(request, f'{page} has {len(questions)} questions and shows the first {limit} by order. Untick or reorder the rest.')
            seen = set()
            for q in questions:
                text = ' '.join(q.question.lower().split()).rstrip('?')
                if text in seen:
                    messages.warning(request, f'"{q.question}" is on {page} twice.')
                seen.add(text)
        return super().changelist_view(request, extra_context)


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
    """The form with one box per wording in home/site_text.json and home/legal_text.json, so that the admin can place them."""
    declared = {'Meta': type('Meta', (), {'model': SiteSettings, 'fields': '__all__'})}
    for _, items in SITE_TEXT:
        for key, label, standard in items:
            if len(standard) > 400:
                # a whole document: a big box to write in, and the standard text to copy from, folded away
                help_text = format_html('Leave empty for the standard text. <details><summary>Show it</summary><pre style="white-space:pre-wrap;max-width:60em">{}</pre></details>', standard)
                widget = forms.Textarea(attrs={'rows': 24, 'cols': 100})
            else:
                help_text = format_html('Leave empty for: <em>{}</em>', standard.replace('\n', ' / '))
                wide = len(standard) > 60 or '\n' in standard
                widget = forms.Textarea(attrs={'rows': 3 if '\n' in standard else 2, 'cols': 80}) if wide else forms.TextInput(attrs={'size': 60})
            declared[f'text_{key}'] = forms.CharField(required=False, label=label, help_text=help_text, widget=widget)
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
                'description': GROUP_NOTES.get(name, 'Leave a box empty to use the standard wording shown under it. In a heading, put | before the words that should be in blue. Where a box has more than one line, each line is a line on the page. {street}, {locality}, {district} and {region} become the office address above.'),
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
