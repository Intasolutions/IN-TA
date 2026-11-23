from django.contrib import admin, messages
from django.utils.html import format_html, format_html_join
from django.conf import settings
from django.core.mail import mail_admins, send_mail
from home.retention import RetentionAdminMixin

from .models import ChatConversation, ConsentRecord, ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(RetentionAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'country', 'is_request', 'created_at', 'reviewed')
    list_filter = ('reviewed', 'created_at', 'country')
    search_fields = ('name', 'email', 'message', 'phone')
    readonly_fields = ('user_agent', 'source', 'created_at')
    actions = ['mark_reviewed', 'resend_notifications']

    def mark_reviewed(self, request, queryset):
        queryset.update(reviewed=True)
    mark_reviewed.short_description = 'Mark selected messages as reviewed'

    def resend_notifications(self, request, queryset):
        sent = 0
        failed = 0
        for obj in queryset:
            try:
                subject = f"New contact (resend): {obj.name}"
                message = (
                    f"Name: {obj.name}\nEmail: {obj.email}\nPhone: {obj.phone}\nCountry: {obj.country}\nSubmit request: {'Yes' if obj.is_request else 'No'}\n\nMessage:\n{obj.message}\n\nSource: {obj.source}\nUser agent: {obj.user_agent}"
                )
                # send to admins
                mail_admins(subject, message)
                # confirmation to user
                try:
                    send_mail(
                        "Thanks for contacting IN-TA Solutions",
                        f"Hi {obj.name},\n\nWe've received (again) your message. We'll get back to you shortly.\n\n-- IN-TA Solutions",
                        settings.DEFAULT_FROM_EMAIL,
                        [obj.email],
                    )
                except Exception:
                    # don't fail the whole process
                    pass
                sent += 1
            except Exception:
                failed += 1
        if sent:
            self.message_user(request, f"Notifications re-sent for {sent} messages.", level=messages.SUCCESS)
        if failed:
            self.message_user(request, f"Failed to resend for {failed} messages.", level=messages.ERROR)
    resend_notifications.short_description = 'Re-send admin/user notifications for selected messages'


@admin.register(ChatConversation)
class ChatConversationAdmin(RetentionAdminMixin, admin.ModelAdmin):
    """Every conversation with the website robot: who they are, what they need, and the whole chat."""
    list_display = ('name', 'phone', 'email', 'service', 'message_count', 'updated_at', 'reviewed')
    list_filter = ('reviewed', 'created_at')
    search_fields = ('name', 'phone', 'email', 'service', 'need', 'business')
    readonly_fields = ('conversation', 'pages', 'source', 'created_at', 'updated_at')
    exclude = ('messages',)
    fieldsets = (
        (None, {'fields': ('name', 'phone', 'email', 'reviewed')}),
        ('What the robot learned', {'fields': ('service', 'need', 'business', 'timeline', 'budget')}),
        ('The conversation', {'fields': ('conversation',)}),
        ('Visit', {'fields': ('pages', 'source', 'created_at', 'updated_at')}),
    )
    actions = ['mark_reviewed']

    @admin.display(description='Messages')
    def message_count(self, obj):
        return len(obj.messages or [])

    @admin.display(description='Conversation')
    def conversation(self, obj):
        if not obj.messages:
            return 'No messages yet.'
        rows = format_html_join(
            '',
            '<div style="margin:0 0 10px;padding:8px 12px;border-radius:10px;max-width:640px;{}">'
            '<div style="font-size:11px;opacity:.65;margin-bottom:2px">{} {}</div><div style="white-space:pre-wrap">{}</div></div>',
            (
                (
                    'background:#0144b5;color:#fff;margin-left:auto' if m.get('role') == 'visitor' else 'background:#eef2f8;color:#01072b',
                    'Visitor' if m.get('role') == 'visitor' else 'Robot',
                    f"· {m.get('at', '')[:16].replace('T', ' ')}" + (f" · {m['action']}" if m.get('action') else ''),
                    m.get('text', ''),
                )
                for m in obj.messages
            ),
        )
        return format_html('<div style="display:flex;flex-direction:column">{}</div>', rows)

    def mark_reviewed(self, request, queryset):
        queryset.update(reviewed=True)
    mark_reviewed.short_description = 'Mark selected chats as reviewed'


@admin.register(ConsentRecord)
class ConsentRecordAdmin(RetentionAdminMixin, admin.ModelAdmin):
    """Answers to the website's cookie prompt (Meta Pixel), kept as proof of what was asked and answered. They can't be
    changed here: a visitor who changes their mind adds a new one (same browser code)."""
    list_display = ('created_at', 'allowed', 'version', 'page', 'browser')
    list_filter = ('allowed', 'version', 'created_at')
    search_fields = ('browser',)
    readonly_fields = ('browser', 'allowed', 'version', 'page', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
