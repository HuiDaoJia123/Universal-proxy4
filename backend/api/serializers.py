# backend/api/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, BlacklistRecord, AuditApplication, Announcement


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = '__all__'


class BlacklistRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reporter = UserSerializer(read_only=True)

    class Meta:
        model = BlacklistRecord
        fields = '__all__'


class AuditApplicationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reviewer = UserSerializer(read_only=True)

    class Meta:
        model = AuditApplication
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    """公告序列化器"""
    announcement_type_display = serializers.CharField(source='get_announcement_type_display', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'announcement_type', 'announcement_type_display', 'title', 'content',
                  'status', 'priority', 'created_at', 'updated_at']