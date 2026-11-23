import secrets

from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from django.conf import settings

from home.mail import admins_later, send_later

from .models import ChatConversation, ContactMessage
from .serializers import ChatStartSerializer, ConsentSerializer, ContactSerializer


class ConsentViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Answers to the website's cookie prompt (contact.ConsentRecord). Anyone may add one; nobody can read them here:
    they're in the admin (Contact > Cookie choices)."""
    serializer_class = ConsentSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'consent'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'saved': True}, status=status.HTTP_201_CREATED)


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

        # notify the team, and confirm to the sender (in the background: the visitor doesn't wait for the mail server)
        admins_later(
            f"New contact: {obj.name}",
            f"Name: {obj.name}\nEmail: {obj.email}\nPhone: {obj.phone}\nCountry: {obj.country}\n"
            f"Submit request: {'Yes' if obj.is_request else 'No'}\n\nMessage:\n{obj.message}\n\n"
            f"Source: {obj.source}\nUser agent: {obj.user_agent}",
        )
        send_later(
            "Thanks for contacting IN-TA Solutions",
            f"Hi {obj.name},\n\nThanks for reaching out. We've received your message and will get back to you shortly.\n\n"
            f"Summary:\nName: {obj.name}\nEmail: {obj.email}\nPhone: {obj.phone}\nCountry: {obj.country}\n\n"
            f"Message:\n{obj.message}\n\n— IN-TA Solutions",
            settings.DEFAULT_FROM_EMAIL,
            [obj.email],
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({'detail': 'Message received'}, status=status.HTTP_201_CREATED, headers=headers)


class ChatViewSet(viewsets.GenericViewSet):
    """The website robot's chats. POST starts one (the form in the chat: name, phone or email) and returns its id and
    token; POST <id>/append/ adds to it, only with that token (the browser that started it keeps it for the visit).
    Nobody can read them here: they're in the admin (Contact > Robot chats)."""
    queryset = ChatConversation.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        self.throttle_scope = 'chat' if self.action == 'append' else 'forms'
        return super().get_throttles()

    def create(self, request):
        serializer = ChatStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chat = serializer.save(token=secrets.token_urlsafe(24), source=str(request.data.get('source', ''))[:200])
        # the team hears about it at once (in the background)
        admins_later(
            f"New chat with the website robot: {chat.name}",
            '\n'.join([
                f"Name: {chat.name}",
                f"Phone / WhatsApp: {chat.phone or '-'}",
                f"Email: {chat.email or '-'}",
                f"Started on: {chat.source or '-'}",
                f"Pages they had looked at: {chat.pages or '-'}",
                '',
                'The conversation keeps filling in the admin: Contact > Robot chats.',
            ]),
        )
        return Response({'id': chat.id, 'token': chat.token}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def append(self, request, pk=None):
        chat = ChatConversation.objects.filter(pk=pk).first()
        token = str(request.data.get('token', ''))
        if not chat or not token or not secrets.compare_digest(token, chat.token):
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # new messages: who said it, what, and when (cut to size; a conversation keeps its last 400)
        added = []
        for m in (request.data.get('messages') or [])[:40]:
            if not isinstance(m, dict):
                continue
            role = 'visitor' if m.get('role') == 'visitor' else 'robot'
            text = str(m.get('text', '')).strip()[:2000]
            if text:
                entry = {'role': role, 'text': text, 'at': str(m.get('at', ''))[:40]}
                if m.get('action'):
                    entry['action'] = str(m['action'])[:80]
                added.append(entry)
        chat.messages = (chat.messages or []) + added
        chat.messages = chat.messages[-400:]

        # what the robot has understood so far, and how to reach them if they typed it in the chat
        lead = request.data.get('lead') or {}
        if isinstance(lead, dict):
            for field, size in (('service', 200), ('need', 2000), ('business', 200), ('timeline', 120), ('budget', 120)):
                value = str(lead.get(field) or '').strip()[:size]
                if value:
                    setattr(chat, field, value)
        phone = str(request.data.get('phone') or '').strip()[:32]
        if phone and len([c for c in phone if c.isdigit()]) >= 7:
            chat.phone = phone
        email = str(request.data.get('email') or '').strip()[:254]
        if email and '@' in email:
            chat.email = email
        pages = str(request.data.get('pages') or '').strip()
        if pages:
            chat.pages = pages[:4000]
        chat.save()
        return Response({'saved': len(added)})
