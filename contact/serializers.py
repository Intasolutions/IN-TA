from rest_framework import serializers
from .models import ContactMessage


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