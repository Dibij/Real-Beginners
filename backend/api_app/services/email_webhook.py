
import requests
import logging
import re

logger = logging.getLogger(__name__)

WEBHOOK_URL = "http://localhost:5678/webhook-test/5b0c6d0b-65af-4b50-bad0-e31eb2240a98"

def detect_email_intent(text: str) -> bool:
    """
    Detect if the text contains an intent to write an email.
    Matches phrases like "write an email to", "send an email to", etc.
    """
    if not text:
        return False
        
    text_lower = text.lower()
    patterns = [
        r"(?:write|rite)\s+(?:an\s+)?email\s+to",
        r"send\s+(?:an\s+)?email\s+to",
        r"draft\s+(?:an\s+)?email\s+for",
    ]
    
    for pattern in patterns:
        if re.search(pattern, text_lower):
            return True
            
    return False

def trigger_email_webhook(text: str, recipient: str = None) -> bool:
    """
    Send the transcribed text to the email webhook.
    """
    try:
        logger.info(f"--- TRIGGERING EMAIL WEBHOOK TO {recipient} ---")
        payload = {"text": text, "recipient": recipient}
        response = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"--- WEBHOOK SENT SUCCESSFULLY: {response.status_code} ---")
            return True
        else:
            logger.error(f"--- WEBHOOK FAILED: {response.status_code} - {response.text} ---")
            return False
            
    except Exception as e:
        logger.error(f"--- WEBHOOK ERROR: {e} ---")
        return False
