import json
import requests
import logging
import sys

logger = logging.getLogger(__name__)

def extract_action_items(content, pending_items=[], current_time=None):
    """
    Calls local Ollama (Mistral) to extract entities and update state.
    pending_items: List of current pending ActionItem dicts.
    current_time: String representing the current server time for relative calculations.
    """
    logger.info(f"--- AI EXTRACTION STARTING FOR CONTENT: '{content[:100]}...' ---")
    sys.stdout.flush()
    url = "http://localhost:11434/api/generate"
    
    pending_context = ""
    if pending_items:
        logger.info(f"--- PROVIDING CONTEXT: {len(pending_items)} pending items ---")
        pending_context = "Current pending items (context):\n" + "\n".join([f"- ID {item['id']}: {item['content']} ({item['item_type']})" for item in pending_items])

    time_context = f"Current Time: {current_time}\n" if current_time else ""

    prompt = f"""
    Analyze the note content below. Your goal is to:
    1. Identify NEW actionable items (Tasks, Reminders, Shopping, Facts, HabitLog).
    2. Identify UPDATES to existing pending items based on the context provided.
    3. Detect intents for Email and Search.
    
    {time_context}
    
    IMPORTANT RULES:
    - Map all 'Todos', 'Jobs', or 'Actions' to the type 'Task'.
    - Allowed types: 'Task', 'Reminder', 'Shopping', 'Fact', 'StudyNote', 'Meeting', 'Habit'.
    - HABITS: If the user says 'I read 3 pages', 'I ran 2km', 'Finished 1 lesson', extract it as 'Habit'. 
      Include 'habit_name' (e.g., Reading), 'value' (e.g., 3), and 'unit' (e.g., pages).
    - STUDY NOTES: If the user says 'I learnt that...', 'I discovered...', or 'Today I found out...', extract it as 'StudyNote'.
    - EMAIL SHORTCUTS (HARDCODED):
      - If user says 'email shriya', recipient is 'shriyaawale2007@gmail.com'.
      - If user says 'email leti' or 'email lettuce', recipient is 'lettuce.cya@gmail.com'.
    - DEDUPLICATION: Do NOT create redundant items.
    - RELATIVE TIME: Calculate EXACT timestamps.
    
    {pending_context}
    
    Content: "{content}"
    
    Return ONLY valid JSON in this format:
    {{
      "priority": "High/Medium/Low",
      "summary": "one sentence summary",
      "new_items": [
        {{
          "type": "Task/Reminder/Shopping/Fact/Meeting/Habit/StudyNote", 
          "content": "detail", 
          "due_date": "YYYY-MM-DD HH:MM:SS (optional)",
          "habit_name": "string (optional)", 
          "value": 0 (optional), 
          "unit": "string (optional)"
        }}
      ],
      "email_intent": {{
        "detected": true/false,
        "recipient": "email_address",
        "subject": "string",
        "body": "string"
      }},
      "search_intent": {{
        "detected": true/false,
        "queries": ["query1", "query2"]
      }},
      "alarms": [
        {
          "time": "HH:MM", 
          "label": "string"
        }
      ],
      "updates": [...]
    }}
    """
    try:
        logger.info("--- CALLING OLLAMA ---")
        sys.stdout.flush()
        res = requests.post(url, json={
            "model": "mistral:latest",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=180)
        res.raise_for_status()
        data = res.json()
        raw_response = data.get('response', '{}')
        logger.info(f"--- OLLAMA RAW RESPONSE: {raw_response} ---")
        analysis = json.loads(raw_response)
        logger.info(f"--- PARSED ANALYSIS: Found {len(analysis.get('new_items', []))} new items, {len(analysis.get('alarms', []))} alarms, {len(analysis.get('updates', []))} updates ---")
        sys.stdout.flush()
        return analysis
    except Exception as e:
        logger.error(f"!!! AI extraction error: {e} !!!")
        sys.stdout.flush()
        return {"priority": "Low", "new_items": [], "alarms": [], "updates": [], "summary": "Note processed"}
