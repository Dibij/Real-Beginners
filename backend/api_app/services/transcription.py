import os
from faster_whisper import WhisperModel
import logging
import sys

logger = logging.getLogger(__name__)

# Initialize whisper model once
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        try:
            logger.info("--- LOADING WHISPER MODEL ---")
            whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
            logger.info("--- WHISPER MODEL LOADED ---")
            sys.stdout.flush()
        except Exception as e:
            logger.error(f"!!! Error loading whisper model: {e} !!!")
            sys.stdout.flush()
    return whisper_model

def transcribe_audio(file_path):
    """Transcribes a single audio file and returns the text."""
    logger.info(f"--- STARTING TRANSCRIPTION: {file_path} ---")
    sys.stdout.flush()
    model = get_whisper_model()
    if not model:
        logger.error("!!! No Whisper model available !!!")
        return ""
    
    if not os.path.exists(file_path):
        logger.error(f"!!! File not found: {file_path} !!!")
        return ""

    try:
        segments, _ = model.transcribe(file_path)
        text = " ".join([seg.text for seg in segments]).strip()
        logger.info(f"--- TRANSCRIPTION FINISHED: '{text}' ---")
        sys.stdout.flush()
        return text
    except Exception as e:
        logger.error(f"!!! Transcription error in service: {e} !!!")
        sys.stdout.flush()
        return ""
