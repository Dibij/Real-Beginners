from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Category, Note, Tag, UserPreference, NoteAudio, ActionItem, 
    ActionItemHistory, SearchResult, Notification, Alarm, Habit, HabitLog
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class NoteAudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteAudio
        fields = ('id', 'audio_file', 'created_at')

class NoteSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False
    )
    tags = serializers.SerializerMethodField()
    audios = NoteAudioSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = ('id', 'title', 'content', 'summary', 'category', 'category_id', 'priority', 'audios', 'tags', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'audios')

    def get_tags(self, obj):
        return [tag.name for tag in Tag.objects.filter(notetag__note=obj)]

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = '__all__'

class ActionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionItem
        fields = (
            'id', 'item_type', 'content', 'status', 'due_date', 
            'end_time', 'location', 'linked_alarm', 'created_at', 'updated_at', 'ai_feedback', 'note'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class AlarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alarm
        fields = ('id', 'time', 'label', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')

class ActionItemHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionItemHistory
        fields = ('id', 'note', 'action_item_content', 'item_type', 'action_type', 'details', 'reasoning', 'created_at')
        read_only_fields = ('id', 'created_at')

class SearchResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchResult
        fields = ('id', 'note', 'query', 'results', 'summary', 'created_at')
        read_only_fields = ('id', 'created_at')

class HabitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitLog
        fields = '__all__'

class HabitSerializer(serializers.ModelSerializer):
    logs = HabitLogSerializer(many=True, read_only=True)
    class Meta:
        model = Habit
        fields = ('id', 'name', 'goal', 'created_at', 'logs')

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


