from django.contrib import admin, messages
from django.conf import settings
from django.core.mail import mail_admins, send_mail
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
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
                        f"Thanks for contacting IN-TA Solutions",
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
