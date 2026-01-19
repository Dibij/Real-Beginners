import json
import os
import tempfile
import asyncio
import logging
import sys
from channels.generic.websocket import AsyncWebsocketConsumer
from .services.transcription import transcribe_audio

logger = logging.getLogger(__name__)

class TranscriptionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            logger.warning("WS Connection rejected: AnonymousUser")
            await self.close()
        else:
            await self.accept()
            # Create a temporary file to store audio bytes
            self.temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
            self.last_transcription_time = asyncio.get_event_loop().time()
            self.accumulated_data_size = 0
            logger.info(f"WS Connected: {self.user.username}, Temp audio: {self.temp_audio.name}")
            sys.stdout.flush()

    async def disconnect(self, close_code):
        if hasattr(self, 'temp_audio'):
            self.temp_audio.close()
            if os.path.exists(self.temp_audio.name):
                os.remove(self.temp_audio.name)
        print(f"WS Disconnected: {self.user.username if hasattr(self, 'user') else 'Unknown'}")

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            # Append audio bytes to the temp file
            self.temp_audio.write(bytes_data)
            self.temp_audio.flush()
            self.accumulated_data_size += len(bytes_data)
            
            # Periodically transcribe (roughly every 2 seconds or after 100KB)
            now = asyncio.get_event_loop().time()
            if now - self.last_transcription_time > 2.0 or self.accumulated_data_size > 102400:
                self.last_transcription_time = now
                self.accumulated_data_size = 0
                
                # Perform transcription in a thread to avoid blocking the event loop
                transcript = await asyncio.to_thread(transcribe_audio, self.temp_audio.name)
                
                if transcript:
                    await self.send(text_data=json.dumps({
                        'type': 'transcription_update',
                        'transcript': transcript,
                        'is_final': False
                    }))
        
        if text_data:
            data = json.loads(text_data)
            if data.get('type') == 'start_recording':
                # Reset temp file if re-starting within same connection
                self.temp_audio.seek(0)
                self.temp_audio.truncate()
                await self.send(text_data=json.dumps({
                    'type': 'status',
                    'message': 'Recording session initialized'
                }))
            elif data.get('type') == 'stop_recording':
                # Final transcription
                transcript = await asyncio.to_thread(transcribe_audio, self.temp_audio.name)
                await self.send(text_data=json.dumps({
                    'type': 'transcription_final',
                    'transcript': transcript or "",
                    'intent': 'create_note'
                }))
