from rest_framework import serializers
from .models import ChatConversation, ContactMessage


class ContactSerializer(serializers.ModelSerializer):
    honeypot = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = ContactMessage
        fields = ('id', 'name', 'email', 'phone', 'country', 'message', 'is_request', 'source', 'honeypot', 'created_at')
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'phone': {'required': True},
            'country': {'required': True},
        }

    def validate_honeypot(self, value):
        # simple anti-spam: if honeypot filled, reject
        if value and value.strip() != '':
            raise serializers.ValidationError('Spam detected')
        return value

    def validate_message(self, value):
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError('Message is too short')
        return value

    def validate_phone(self, value):
        # very small sanity check: length
        if not value or len(value.strip()) < 7:
            raise serializers.ValidationError('Please provide a valid mobile number')
        return value

    def validate_country(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Please select country')
        return value

    def create(self, validated_data):
        # drop honeypot before creating model
        validated_data.pop('honeypot', None)
        return super().create(validated_data)

class ChatStartSerializer(serializers.ModelSerializer):
    """The form that opens a robot chat: who they are and how to reach them."""
    honeypot = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = ChatConversation
        fields = ('name', 'phone', 'email', 'pages', 'source', 'honeypot')

    def validate_honeypot(self, value):
        if value and value.strip():
            raise serializers.ValidationError('Spam detected')
        return value

    def validate_name(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Please tell us your name')
        return value.strip()

    def validate(self, data):
        # a way to reach them: a phone number (WhatsApp or call) or an email address
        phone = (data.get('phone') or '').strip()
        if phone and len([c for c in phone if c.isdigit()]) < 7:
            raise serializers.ValidationError({'phone': 'Please provide a valid phone number'})
        if not phone and not (data.get('email') or '').strip():
            raise serializers.ValidationError({'phone': 'Please give us a phone number or an email address'})
        data.pop('honeypot', None)
        return data
