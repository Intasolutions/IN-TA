from rest_framework import viewsets, mixins, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from django.core.mail import mail_admins, send_mail
from django.conf import settings

from .models import ContactMessage
from .serializers import ContactSerializer


class ContactViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Public create (anyone) and admin-only list for messages."""
    queryset = ContactMessage.objects.all()
    serializer_class = ContactSerializer

    def get_throttles(self):
        # only sending is limited (see "forms" in REST_FRAMEWORK); the admin's list is not
        if self.action == 'create':
            self.throttle_scope = 'forms'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.action == 'list':
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [AllowAny]
        return [p() for p in permission_classes]

    def perform_create(self, serializer):
        # capture source and user agent when available
        request = self.request
        source = request.META.get('HTTP_REFERER', '')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:300]
        obj = serializer.save(source=source, user_agent=user_agent)

        # notify admins (development: printed to console if console backend)
        try:
            subject = f"New contact: {obj.name}"
            message = (
                f"Name: {obj.name}\nEmail: {obj.email}\nPhone: {obj.phone}\nCountry: {obj.country}\nSubmit request: {'Yes' if obj.is_request else 'No'}\n\nMessage:\n{obj.message}\n\nSource: {obj.source}\nUser agent: {obj.user_agent}"
            )
            mail_admins(subject, message)

            # send a confirmation email to the sender as well
            try:
                from_email = settings.DEFAULT_FROM_EMAIL
                user_subject = "Thanks for contacting IN-TA Solutions"
                user_message = (
                    f"Hi {obj.name},\n\nThanks for reaching out. We've received your message and will get back to you shortly.\n\nSummary:\nName: {obj.name}\nEmail: {obj.email}\nPhone: {obj.phone}\nCountry: {obj.country}\n\nMessage:\n{obj.message}\n\n— IN-TA Solutions"
                )
                send_mail(user_subject, user_message, from_email, [obj.email])
            except Exception:
                # don't fail the request for mail delivery issues
                pass
        except Exception:
            # never fail the request because of notification
            pass

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({'detail': 'Message received'}, status=status.HTTP_201_CREATED, headers=headers)
