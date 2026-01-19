import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from api_app.middleware import JWTAuthMiddlewareStack
import api_app.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voice_notes_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            api_app.routing.websocket_urlpatterns
        )
    ),
})
