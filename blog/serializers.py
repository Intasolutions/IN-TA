from rest_framework import serializers
from .models import Blog, Subscriber

class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = ['id', 'title', 'date', 'tag', 'image', 'link', 'content', 'meta_title', 'meta_description', 'focus_keyword', 'image_alt']

class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ['id', 'name', 'phone', 'interest', 'created_at']
        read_only_fields = ['id', 'created_at']
