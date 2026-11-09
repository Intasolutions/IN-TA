from rest_framework import serializers

from services.models import Service

from .models import Blog, Subscriber


class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = ['id', 'title', 'date', 'tag', 'image', 'link', 'content', 'meta_title', 'meta_description', 'focus_keyword', 'image_alt', 'updated_at']


class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ['id', 'name', 'phone', 'interest', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_interest(self, value):
        """One of the services the website lists (or an option the form offered before it listed them)."""
        value = value.strip()
        if value in Subscriber.OLD_INTERESTS or Service.objects.filter(is_active=True, title=value).exists():
            return value
        raise serializers.ValidationError('Please pick one of our services.')
