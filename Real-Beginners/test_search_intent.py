
import re

def detect_search_intent(text: str) -> list:
    """
    Detect search intent phrases in text and extract queries.
    Returns a list of search queries.
    """
    
    # Patterns to detect search intent
    patterns = [
        r"(?:search\s+(?:for|about)?)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:find\s+(?:out|information|info)?\s*(?:about)?)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:look\s+up)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:google)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:what\s+is|what\s+are|who\s+is|how\s+to)\s+(.+?)(?:\?|$|\.)",
    ]
    
    queries = []
    text_lower = text.lower()
    
    for pattern in patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            query = match.strip()
            if query and len(query) > 2 and query not in queries:
                queries.append(query)
    
    return queries[:2]

test_phrases = [
    "I want to search for the history of Nepal",
    "search for best laptops 2024",
    "can you find out about quantum computing",
    "i need to look up who is the president of usa",
    "google the price of bitcoin",
    "what is the capital of france",
    "Search for something without punctuation" 
]

print("Testing Search Intent Detection:")
for phrase in test_phrases:
    print(f"Phrase: '{phrase}' -> Detected: {detect_search_intent(phrase)}")
