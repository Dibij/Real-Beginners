import os
# Allow scope changes (Google often returns more scopes than requested if previously granted)
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from api_app.models import GoogleOAuthToken
import logging

logger = logging.getLogger(__name__)

# Use a configurable redirect URI for the backend callback
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback/")

# Scopes needed for Google Calendar
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
]

def get_google_flow():
    """Builds a Google Flow object for OAuth."""
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

def get_user_credentials(user):
    """Retrieves and refreshes user credentials from the database."""
    try:
        token_obj = GoogleOAuthToken.objects.get(user=user)
        creds = Credentials(
            token=token_obj.access_token,
            refresh_token=token_obj.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=token_obj.scopes.split(',')
        )

        if not creds.valid:
            if creds.expired and creds.refresh_token:
                logger.info(f"Refreshing Google token for {user.email}")
                creds.refresh(Request())
                token_obj.access_token = creds.token
                token_obj.expires_at = timezone.now() + timedelta(seconds=creds.expiry.timestamp() - timezone.now().timestamp())
                token_obj.save()
            else:
                return None
        return creds
    except GoogleOAuthToken.DoesNotExist:
        return None

def create_calendar_event(user, summary, start_time, end_time=None, description="", location=""):
    """Creates an event in the user's primary Google Calendar."""
    creds = get_user_credentials(user)
    if not creds:
        logger.warning(f"No valid Google credentials for {user.email}")
        return None

    try:
        service = build('calendar', 'v3', credentials=creds)
        
        if not end_time:
            # Default to 1 hour after start
            from django.utils.dateparse import parse_datetime
            if isinstance(start_time, str):
                dt_start = parse_datetime(start_time)
            elif isinstance(start_time, (timezone.datetime, timezone.datetime)): # Handle both
                dt_start = start_time
            else:
                dt_start = start_time # Assume it's a datetime-like object
            end_time = (dt_start + timedelta(hours=1))
        
        # Ensure they are ISO strings
        if not isinstance(start_time, str):
            start_time = start_time.isoformat()
        if not isinstance(end_time, str):
            end_time = end_time.isoformat()

        event = {
            'summary': summary,
            'location': location,
            'description': description,
            'start': {
                'dateTime': start_time,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'UTC',
            },
        }

        event = service.events().insert(calendarId='primary', body=event).execute()
        logger.info(f"Created Calendar event: {event.get('htmlLink')}")
        return event
    except Exception as e:
        logger.error(f"Failed to create Google Calendar event: {e}")
        return None

def list_calendar_events(user, max_results=10):
    """Lists upcoming events from the user's primary Google Calendar."""
    creds = get_user_credentials(user)
    if not creds:
        return []

    try:
        service = build('calendar', 'v3', credentials=creds)
        now = timezone.now().isoformat()
        events_result = service.events().list(
            calendarId='primary', timeMin=now,
            maxResults=max_results, singleEvents=True,
            orderBy='startTime'
        ).execute()
        return events_result.get('items', [])
    except Exception as e:
        logger.error(f"Failed to list Google Calendar events: {e}")
        return []