from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    email = models.EmailField(unique=True)
    failed_login_attempts = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)
    color = models.CharField(max_length=7, null=True, blank=True) # Hex color
    icon = models.CharField(max_length=50, null=True, blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'

    def __str__(self):
        return self.name

class Note(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=255, null=True, blank=True)
    content = models.TextField() # This will be encrypted
    summary = models.TextField(null=True, blank=True) # AI generated or manual summary
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notes'
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['-created_at']),
        ]

class NoteAudio(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='audios')
    audio_file = models.FileField(upload_to='audio_notes/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'note_audios'

class Tag(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tags'
        unique_together = ('user', 'name')

class NoteTag(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        db_table = 'note_tags'
        unique_together = ('note', 'tag')

class CommandLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='command_logs')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True)
    command_text = models.TextField()
    detected_intent = models.CharField(max_length=100, null=True, blank=True)
    entities = models.JSONField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'commands_log'

class ActionItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('Task', 'Task'),
        ('Reminder', 'Reminder'),
        ('Shopping', 'Shopping'),
        ('Fact', 'Fact'),
        ('StudyNote', 'StudyNote'),
        ('Habit', 'Habit'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Completed', 'Completed'),
        ('Dismissed', 'Dismissed'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_items')
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='action_items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='Task')
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    due_date = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    linked_alarm = models.ForeignKey('Alarm', on_delete=models.SET_NULL, null=True, blank=True, related_name='linked_items')
    ai_feedback = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'action_items'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['item_type']),
        ]

    def __str__(self):
        return f"{self.item_type}: {self.content[:30]} ({self.status})"

class Alarm(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alarms')
    time = models.TimeField()
    label = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alarms'
        ordering = ['time']

    def __str__(self):
        return f"Alarm at {self.time} ({'On' if self.is_active else 'Off'})"

class ActionItemHistory(models.Model):
    ACTION_TYPES = [
        ('Added by AI', 'Added by AI'),
        ('Manually Added', 'Manually Added'),
        ('Modified', 'Modified'),
        ('Status Changed', 'Status Changed'),
        ('Deleted', 'Deleted'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_item_history')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_item_history')
    action_item_content = models.TextField() # Store content snapshot for history
    item_type = models.CharField(max_length=20)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    details = models.TextField(null=True, blank=True)
    reasoning = models.TextField(null=True, blank=True) # AI reasoning for the change
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'action_item_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action_type}: {self.action_item_content[:30]}"

class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='preferences')
    theme = models.CharField(max_length=20, default='light')
    default_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    notifications_enabled = models.BooleanField(default=True)
    auto_save_interval = models.IntegerField(default=30)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'


class SearchResult(models.Model):
    """Stores web search results triggered by voice notes."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_results')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True, related_name='search_results')
    query = models.CharField(max_length=500)
    results = models.JSONField(default=list)  # [{title, url, snippet}]
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'search_results'
        ordering = ['-created_at']

    def __str__(self):
        return f"Search: {self.query[:50]}"


class Notification(models.Model):
    """Stores system notifications for the user."""
    NOTIFICATION_TYPES = [
        ('search', 'Search Result'),
        ('system', 'System Alert'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='system')
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, null=True, blank=True)  # Optional link to resource
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type}: {self.title}"

class GoogleOAuthToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_token')
    access_token = models.TextField()
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField()
    scopes = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_oauth_tokens'

    def __str__(self):
        return f"Google Token for {self.user.email}"


class Habit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=255)
    goal = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'habits'

    def __str__(self):
        return f"{self.name} ({self.user.username})"

class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True)
    value = models.FloatField()
    unit = models.CharField(max_length=50, default='units')
    comment = models.TextField(null=True, blank=True)
    ai_feedback = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'habit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.habit.name}: {self.value} {self.unit}"
