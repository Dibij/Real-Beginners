from rest_framework import generics, permissions, status, response, pagination
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .models import Note, Category, Tag, NoteAudio, ActionItem, ActionItemHistory, SearchResult, Notification, Alarm, GoogleOAuthToken
from .serializers import UserSerializer, NoteSerializer, CategorySerializer, TagSerializer, ActionItemSerializer, ActionItemHistorySerializer, AlarmSerializer
from django.utils import timezone
from datetime import timedelta
from .utils import derive_key, encrypt_content, decrypt_content
from .services.transcription import transcribe_audio
from .services.ai_engine import extract_action_items
from .services.web_search import perform_web_search, detect_search_intent
from .services.email_webhook import detect_email_intent, trigger_email_webhook
from .services.google_calendar import get_google_flow, REDIRECT_URI, create_calendar_event
from django.shortcuts import redirect
import logging
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

logger = logging.getLogger(__name__)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        queryset = Note.objects.filter(user=user, deleted_at__isnull=True).order_by('-created_at')
        
        # Filtering by category if provided
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Search functionality (Safe from SQL injection via Django ORM)
        search_query = self.request.query_params.get('notessearch', '').strip()
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(content__icontains=search_query) |
                Q(summary__icontains=search_query)
            )

        # Decrypt content for the response
        for note in queryset:
            try:
                key = derive_key(user.username + "secret") 
                note.content = decrypt_content(note.content, key)
            except:
                pass 
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        initial_content = self.request.data.get('content', '')
        if isinstance(initial_content, list):
            initial_content = initial_content[0]
            
        # Initial save to get the note ID (instant response)
        logger.info(f"--- CREATING NOTE FOR USER: {user.username} ---")
        key = derive_key(user.username + "secret")
        encrypted_content = encrypt_content(initial_content or "Processing...", key)
        note = serializer.save(user=user, content=encrypted_content, summary="Processing...")
        logger.info(f"--- NOTE CREATED: ID {note.id} ---")

        # Save audio files immediately (fast operation)
        audio_files = self.request.FILES.getlist('audio_files')
        audio_paths = []
        for audio_file in audio_files:
            audio_obj = NoteAudio.objects.create(note=note, audio_file=audio_file)
            audio_paths.append(audio_obj.audio_file.path)
        
        # Spawn background thread for heavy processing
        import threading
        thread = threading.Thread(
            target=self._process_note_async,
            args=(note.id, user.id, audio_paths, initial_content)
        )
        thread.start()
        
        logger.info(f"--- NOTE {note.id} SAVED, PROCESSING IN BACKGROUND ---")

    def _process_note_async(self, note_id, user_id, audio_paths, initial_content):
        """Background processing for transcription and AI extraction."""
        import time
        from django.db import connection
        connection.close()  # Close stale connections for thread safety
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            note = Note.objects.get(id=note_id)
            key = derive_key(user.username + "secret")
            
            # Transcribe all audio files
            transcripts = []
            for audio_path in audio_paths:
                text = transcribe_audio(audio_path)
                if text:
                    transcripts.append(text)
            
            # Build final content
            final_content = initial_content or ""
            if transcripts:
                full_transcript = " ".join(transcripts)
                logger.info(f"--- ASYNC TRANSCRIPT: '{full_transcript[:100]}...' ---")
                
                if initial_content and initial_content not in ["Audio Recording", "Processing...", "Transcribing..."]:
                    import re
                    clean_initial = re.sub(r'[^a-zA-Z0-9]', '', initial_content.lower())
                    clean_full = re.sub(r'[^a-zA-Z0-9]', '', full_transcript.lower())
                    if clean_initial in clean_full:
                        final_content = full_transcript
                    else:
                        final_content = f"{initial_content}\n\nTranscription:\n{full_transcript}"
                else:
                    final_content = full_transcript
                
                note.content = encrypt_content(final_content, key)
                
                # AI Extraction
                logger.info("--- ASYNC AI EXTRACTION ---")
                current_time_str = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
                pending_items = ActionItem.objects.filter(user=user, status='Pending').values('id', 'content', 'item_type')
                ai_results = extract_action_items(full_transcript, list(pending_items), current_time=current_time_str)
                logger.info(f"--- AI RESULTS: {ai_results} ---")
                
                note.priority = ai_results.get('priority', 'Low').lower()
                note.summary = ai_results.get('summary', 'Processed voice note')
                
                # Process Updates
                for update in ai_results.get('updates', []):
                    item_id = update.get('id')
                    new_status = update.get('status')
                    reasoning = update.get('reasoning', f"AI updated status to {new_status}")
                    if item_id and new_status:
                        item_to_update = ActionItem.objects.filter(id=item_id, user=user).first()
                        if item_to_update and item_to_update.status != new_status:
                            old_status = item_to_update.status
                            item_to_update.status = new_status
                            item_to_update.save()
                            ActionItemHistory.objects.create(
                                user=user, note=note,
                                action_item_content=item_to_update.content,
                                item_type=item_to_update.item_type,
                                action_type='Status Changed',
                                details=f"AI marked as {new_status} (prev: {old_status})",
                                reasoning=reasoning
                            )
                
                # Create Alarms First (so we can link them)
                created_alarms = {} # label_time: id
                for alarm in ai_results.get('alarms', []):
                    time_val = alarm.get('time')
                    label_val = alarm.get('label', 'Alarm')
                    logger.info(f"--- CREATING ALARM: {time_val} - {label_val} ---")
                    
                    # Deduplication check
                    existing_alarm = Alarm.objects.filter(
                        user=user,
                        time=time_val,
                        label=label_val,
                        is_active=True
                    ).first()

                    if not existing_alarm:
                        try:
                            new_alarm = Alarm.objects.create(
                                user=user,
                                time=time_val,
                                label=label_val
                            )
                            created_alarms[f"{label_val}_{time_val}"] = new_alarm
                        except Exception as e:
                            logger.error(f"Failed to create alarm: {e}")
                    else:
                        logger.info(f"Duplicate Alarm skipped: {time_val}")
                        created_alarms[f"{label_val}_{time_val}"] = existing_alarm

                # Create New Items and link to alarms if applicable
                for item in ai_results.get('new_items', []):
                    due_date_str = item.get('due_date')
                    due_date_val = None
                    if due_date_str and "optional" not in due_date_str.lower() and "yyyy" not in due_date_str.lower():
                        from django.utils.dateparse import parse_datetime
                        try:
                            due_date_val = parse_datetime(due_date_str)
                            if not due_date_val:
                                logger.warning(f"Failed to parse due_date: {due_date_str}")
                        except Exception as e:
                            logger.error(f"Error parsing due_date: {e}")

                    # Deduplication check
                    content = item.get('content', '')
                    item_type = item.get('type', 'Task')
                    existing_item = ActionItem.objects.filter(
                        user=user, 
                        item_type=item_type, 
                        content=content, 
                        due_date=due_date_val,
                        status='Pending'
                    ).exists()

                    if not existing_item:
                        # Try to find a matching alarm to link
                        linked_alarm = None
                        if due_date_val:
                            time_str = due_date_val.strftime('%H:%M')
                            # Look in created_alarms or DB
                            linked_alarm = created_alarms.get(f"{content}_{time_str}") or created_alarms.get(f"Alarm_{time_str}")
                        
                        # Handle specific meeting fields
                        end_time_val = None
                        end_time_str = item.get('end_time')
                        if end_time_str and "optional" not in end_time_str.lower():
                            try:
                                end_time_val = parse_datetime(end_time_str)
                            except: pass
                        
                        loc_val = item.get('location')

                        ai_item = ActionItem.objects.create(
                            user=user, note=note,
                            item_type=item_type,
                            content=content,
                            due_date=due_date_val,
                            end_time=end_time_val,
                            location=loc_val,
                            linked_alarm=linked_alarm,
                            status='Pending'
                        )
                        
                        # Google Calendar Sync for Meetings
                        if item_type == 'Meeting' and due_date_val:
                            logger.info(f"--- SYNCING MEETING TO GOOGLE CALENDAR: {content} ---")
                            create_calendar_event(
                                user=user,
                                summary=content,
                                start_time=due_date_val,
                                end_time=end_time_val,
                                location=loc_val
                            )

                        ActionItemHistory.objects.create(
                            user=user, note=note,
                            action_item_content=ai_item.content,
                            item_type=ai_item.item_type,
                            action_type='Added by AI',
                            details=f"Extracted from note {note.id}",
                            reasoning=item.get('reasoning', "Extracted from voice note")
                        )
                    else:
                         logger.info(f"Duplicate ActionItem skipped: {content}")
            else:
                note.summary = "Voice note (no transcription)"
            
            note.save()
            
            # Email Intent Detection
            if transcripts:
                if detect_email_intent(full_transcript):
                    logger.info("Detected Intent: Email")
                    trigger_email_webhook(full_transcript)
                
                # Check search if not email (or both?) - Assuming independent checks
                search_queries = detect_search_intent(full_transcript)
                if search_queries:
                    logger.info("Detected Intent: Search")
                    for query in search_queries:
                        search_result = perform_web_search(query)
                        if search_result.get('results'):
                            SearchResult.objects.create(
                                user=user,
                                note=note,
                                query=query,
                                results=search_result.get('results', []),
                                summary=search_result.get('summary', '')
                            )
                            # Create Notification
                            Notification.objects.create(
                                user=user,
                                type='search',
                                title=f"Search Completed: {query[:30]}...",
                                message=f"Found {len(search_result.get('results', []))} results for your query. Click to view details.",
                                link='/dashboard'
                            )
                else:
                    if not detect_email_intent(full_transcript):
                         logger.info("Detected Intent: None")

            logger.info(f"--- NOTE {note_id} PROCESSING COMPLETE ---")
        except Exception as e:
            logger.error(f"--- ERROR PROCESSING NOTE {note_id}: {e} ---")

class ActionItemListView(generics.ListCreateAPIView):
    serializer_class = ActionItemSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = ActionItem.objects.filter(user=self.request.user).order_by('-created_at')
        item_type = self.request.query_params.get('type', '').strip()
        status = self.request.query_params.get('status', '').strip()
        if item_type:
            # Handle Todo/Task merge
            if item_type.lower() in ['todo', 'task']:
                queryset = queryset.filter(item_type='Task')
            else:
                queryset = queryset.filter(item_type=item_type)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        # Allow manual creation without a note
        item = serializer.save(user=self.request.user)
        # Auto-create alarm if due_date is provided manually and not already linked
        if item.due_date and not item.linked_alarm:
            time_val = item.due_date.time()
            # Check for existing alarm at this time to avoid redundancy
            alarm = Alarm.objects.filter(user=item.user, time=time_val, is_active=True).first()
            if not alarm:
                alarm = Alarm.objects.create(
                    user=item.user,
                    time=time_val,
                    label=f"Reminder: {item.content[:30]}"
                )
            item.linked_alarm = alarm
            item.save()

class ActionItemUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ActionItemSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ActionItem.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        item = serializer.save()
        if old_status != item.status:
            ActionItemHistory.objects.create(
                user=self.request.user,
                action_item_content=item.content,
                item_type=item.item_type,
                action_type='Status Changed',
                details=f"Status changed from {old_status} to {item.status}"
            )
        else:
            ActionItemHistory.objects.create(
                user=self.request.user,
                action_item_content=item.content,
                item_type=item.item_type,
                action_type='Modified',
                details="Content or other details updated"
            )

    def perform_destroy(self, instance):
        ActionItemHistory.objects.create(
            user=self.request.user,
            action_item_content=instance.content,
            item_type=instance.item_type,
            action_type='Deleted',
            details="Item removed"
        )
        # Linked deletion
        if instance.linked_alarm:
            instance.linked_alarm.delete()
        instance.delete()

class AlarmListCreateView(generics.ListCreateAPIView):
    serializer_class = AlarmSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Alarm.objects.filter(user=self.request.user).order_by('time')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AlarmDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AlarmSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Alarm.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        # Linked deletion: find all ActionItems pointing to this alarm
        instance.linked_items.all().delete() 
        instance.delete()

class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        obj = super().get_object()
        key = derive_key(self.request.user.username + "secret")
        try:
            obj.content = decrypt_content(obj.content, key)
        except:
            pass
        return obj

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        content = self.request.data.get('content')
        if content:
            key = derive_key(self.request.user.username + "secret")
            encrypted_content = encrypt_content(content, key)
            serializer.save(content=encrypted_content)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (permissions.IsAuthenticated,)

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken

from django.conf import settings

class GoogleLoginView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return response.Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Specify the CLIENT_ID of the app that accesses the backend:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
            
            email = idinfo['email']
            username = idinfo.get('name', email.split('@')[0])
            
            user, created = User.objects.get_or_create(email=email, defaults={'username': username})
            if created:
                user.set_unusable_password()
                user.save()
            
            refresh = RefreshToken.for_user(user)
            return response.Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        except ValueError:
            return response.Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

class GoogleCalendarAuthView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        flow = get_google_flow()
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        request.session['google_oauth_state'] = state
        return response.Response({'authorization_url': authorization_url})

class GoogleCalendarCallbackView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        state = request.GET.get('state')
        code = request.GET.get('code')
        
        # In a real app, you'd match state from session here
        # For simplicity in this demo, we'll proceed if code exists
        if not code:
            return response.Response({'error': 'No code provided'}, status=400)

        flow = get_google_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials

        # Get the user from state or some other mechanism
        # Since this is a redirect, we might need to handle user mapping
        # Let's assume the user is still logged in if we can use session
        # Otherwise, we might need to pass a token in state
        user = request.user if request.user.is_authenticated else None
        
        if not user:
             # Fallback: maybe find user by email from creds
             idinfo = id_token.verify_oauth2_token(creds.id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
             user = User.objects.get(email=idinfo['email'])

        GoogleOAuthToken.objects.update_or_create(
            user=user,
            defaults={
                'access_token': creds.token,
                'refresh_token': creds.refresh_token,
                'expires_at': timezone.now() + timedelta(seconds=creds.expiry.timestamp() - timezone.now().timestamp()),
                'scopes': ','.join(creds.scopes)
            }
        )

        return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/calendar?sync=success")

class GoogleCalendarStatusView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        is_connected = GoogleOAuthToken.objects.filter(user=request.user).exists()
        return response.Response({'is_connected': is_connected})

class GoogleCalendarEventsView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .services.google_calendar import list_calendar_events
        events = list_calendar_events(request.user)
        return response.Response(events)

class TagListView(generics.ListAPIView):
    serializer_class = TagSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

class NoteAudioDeleteView(generics.DestroyAPIView):
    queryset = NoteAudio.objects.all()
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        obj = super().get_object()
        if obj.note.user != self.request.user:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to delete this recording.")
        return obj
class ActionItemHistoryListView(generics.ListAPIView):
    serializer_class = ActionItemHistorySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Return last 50 history items
        return ActionItemHistory.objects.filter(user=self.request.user).order_by('-created_at')[:50]


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class SearchResultListView(generics.ListAPIView):
    """List search results for the authenticated user."""
    from .serializers import SearchResultSerializer
    serializer_class = SearchResultSerializer
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Return all search results (paginated)
        return SearchResult.objects.filter(user=self.request.user).order_by('-created_at')


class NotificationListView(generics.ListAPIView):
    """List unread notifications for the user."""
    from .serializers import NotificationSerializer
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user, is_read=False).order_by('-created_at')

class NotificationMarkReadView(generics.UpdateAPIView):
    """Mark a notification as read."""
    from .serializers import NotificationSerializer
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)
    queryset = Notification.objects.all()

    def perform_update(self, serializer):
        serializer.save(is_read=True)
