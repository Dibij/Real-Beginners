from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, UserProfileView, NoteListCreateView, NoteDetailView,
    ActionItemListView, ActionItemUpdateView, ActionItemHistoryListView,
    CategoryListView, GoogleLoginView, TagListView, NoteAudioDeleteView,
    SearchResultListView, NotificationListView, NotificationMarkReadView,
    AlarmListCreateView, AlarmDetailView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/google-login/', GoogleLoginView.as_view(), name='google_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    
    path('notes/', NoteListCreateView.as_view(), name='note_list_create'),
    path('notes/<int:pk>/', NoteDetailView.as_view(), name='note_detail'),
    path('notes/audio/<int:pk>/', NoteAudioDeleteView.as_view(), name='audio-delete'),
    path('action-items/', ActionItemListView.as_view(), name='action-item-list'),
    path('action-items/<int:pk>/', ActionItemUpdateView.as_view(), name='action-item-detail'),
    path('action-items/history/', ActionItemHistoryListView.as_view(), name='action-item-history'),
    
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('tags/', TagListView.as_view(), name='tag_list'),
    path('web-search-results/', SearchResultListView.as_view(), name='web-search-results'),
    path('alarms/', AlarmListCreateView.as_view(), name='alarm-list-create'),
    path('alarms/<int:pk>/', AlarmDetailView.as_view(), name='alarm-detail'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
]
