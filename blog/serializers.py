from rest_framework import serializers

from home.models import SiteSettings
from home.site_text import text_of
from services.models import Service

from .models import Blog, Subscriber


class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = ['id', 'slug', 'title','date', 'tag', 'image', 'link', 'content', 'meta_title', 'meta_description', 'focus_keyword', 'image_alt', 'updated_at']


class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ['id', 'name', 'email', 'phone', 'company', 'interest', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please tell us your name.')
        return value

    def validate_phone(self, value):
        value = value.strip()
        digits = sum(c.isdigit() for c in value)
        if value and (digits < 7 or digits > 15 or any(c not in '+0123456789 ()-' for c in value)):
            raise serializers.ValidationError('Please enter a valid number.')
        return value

    def validate_interest(self, value):
        """One of the form's options ("What do you need?" in Page wording), a service on the website (a service's page
        offers its own name), or an option an older version of the form offered."""
        value = value.strip()
        needs = {n.strip().lower(): n.strip() for n in text_of(SiteSettings.load().page_text, 'enquiry_needs').split(',') if n.strip()}
        if value.lower() in needs:
            return needs[value.lower()]  # as the option is written
        if (
            value in Subscriber.OLD_INTERESTS
            or Service.objects.filter(is_active=True, title=value).exists()
        ):
            return value
        raise serializers.ValidationError('Please pick one of the options.')

    def validate(self, attrs):
        # The form asks for a business email; pages built before it did send only a phone number, which still works
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError({'email': 'Please enter your business email.'})
        return attrs
