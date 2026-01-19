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
    1. Identify NEW actionable items (Tasks, Reminders, Shopping, Facts).
    2. Identify UPDATES to existing pending items based on the context provided.
    
    {time_context}
    
    IMPORTANT RULES:
    - Map all 'Todos', 'Jobs', or 'Actions' to the type 'Task'.
    - Allowed types: 'Task', 'Reminder', 'Shopping', 'Fact'.
    - DEDUPLICATION: Do NOT create redundant items. If two items refer to the same thing (e.g., 'buy clothes' and 'buy dresses'), MERGE them into one specific item.
    - CONSOLIDATION: Group similar actions together. Avoid listing the same intent twice with slightly different wording.
    - RELATIVE TIME: If the user says something like 'in one hour' or 'tomorrow morning', use the {time_context or 'current time'} to calculate the EXACT 'due_date' (YYYY-MM-DD HH:MM:SS) or alarm 'time' (HH:MM). Do NOT use placeholders like 'one hour from now' or 'YYYY-MM-DD'.
    - INTERVAL ALARMS: If the user says 'create 5 alarms starting at 11 am spacing 15 mins', be smart and calculate the EXACT times for each: '11:00', '11:15', '11:30', '11:45', '12:00'. Add each result as a separate entry in the 'alarms' list.
    - DUAL EXTRACTION: If a user says 'remind me to buy sausages tonight', extract BOTH a 'Shopping' item with a 'due_date' AND an 'alarm' at that same time. Use matching labels/content for linking.
    - MEETINGS: If the user says 'schedule a meeting with X at Y', extract it as a 'Meeting' item. 
      CRITICAL: You MUST extract the 'due_date' (start time) and 'end_time' as EXACT timestamps (YYYY-MM-DD HH:MM:SS) based on the context. If no duration is specified, assume 1 hour.
      Include 'location' if mentioned. For meetings, always populate 'due_date'.
    
    {pending_context}
    
    Content: "{content}"
    
    Return ONLY valid JSON in this format:
    {{
      "priority": "High/Medium/Low",
      "summary": "one sentence summary",
      "new_items": [
        {{"type": "Task/Reminder/Shopping/Fact/Meeting", "content": "detail", "due_date": "YYYY-MM-DD HH:MM:SS (optional)", "end_time": "YYYY-MM-DD HH:MM:SS (optional)", "location": "string (optional)", "reasoning": "..."}}
      ],
      "alarms": [
        {{"time": "HH:MM", "label": "Alarm label (optional)"}}
      ],
      "updates": [
        {{"id": 123, "status": "Completed/Dismissed", "reasoning": "..."}}
      ]
    }}
    Priority must be one of: 'High', 'Medium', 'Low'.
    Status must be one of: 'Pending', 'Completed', 'Dismissed'.
    
    If the user says they bought something, did something, or finished something, mark the matching ID in 'updates' as 'Completed'.
    If the user asks to create an alarm, put it in the 'alarms' list.
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