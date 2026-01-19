"""
Web Search Service using Google Custom Search API.
Fetches search results, scrapes page content, and summarizes with Ollama.
"""
import os
import requests
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

GOOGLE_SEARCH_API_KEY = os.getenv('GOOGLE_SEARCH_API_KEY', '')
SEARCH_ENGINE_ID = os.getenv('SEARCH_ENGINE_ID', '')
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')


def perform_web_search(query: str, num_results: int = 5) -> dict:
    """
    Perform a Google Custom Search, fetch page content, and return summarized results.
    
    Args:
        query: The search query string
        num_results: Number of results to fetch (max 10)
    
    Returns:
        dict with 'query', 'results', and 'summary' keys
    """
    if not GOOGLE_SEARCH_API_KEY or not SEARCH_ENGINE_ID:
        logger.error("Google Search API credentials not configured")
        return {
            'query': query,
            'results': [],
            'summary': 'Search unavailable: API not configured'
        }
    
    try:
        # Call Google Custom Search API
        search_url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': GOOGLE_SEARCH_API_KEY,
            'cx': SEARCH_ENGINE_ID,
            'q': query,
            'num': min(num_results, 10)
        }
        
        logger.info(f"--- WEB SEARCH: '{query}' ---")
        response = requests.get(search_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract results
        results = []
        items = data.get('items', [])[:num_results]
        
        # Deep Fetch: Get content for top 5
        logger.info(f"--- FETCHING CONTENT FOR {len(items)} PAGES ---")
        for item in items:
            url = item.get('link', '')
            raw_content = _fetch_page_content(url)
            
            # Refine content usage with LLM to prevent garbage
            # We summarize EACH page content to be relevant to the query
            refined_content = _refine_content_with_llm(query, raw_content, item.get('title', ''))
            
            results.append({
                'title': item.get('title', ''),
                'url': url,
                'snippet': item.get('snippet', ''),
                'content': refined_content  # Now contains relevant extracted text
            })
        
        if not results:
            return {
                'query': query,
                'results': [],
                'summary': f'No results found for "{query}"'
            }
        
        # Summarize results with Ollama (Final synthesis)
        summary = _summarize_results(query, results)
        
        logger.info(f"--- SEARCH COMPLETE: Found {len(results)} results ---")
        return {
            'query': query,
            'results': results,
            'summary': summary
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Search API error: {e}")
        return {
            'query': query,
            'results': [],
            'summary': f'Search failed: {str(e)}'
        }
    except Exception as e:
        logger.error(f"Unexpected search error: {e}")
        return {
            'query': query,
            'results': [],
            'summary': f'Search error: {str(e)}'
        }


def _fetch_page_content(url: str) -> str:
    """Fetch and extract main text from a URL."""
    try:
        if not url:
            return ""
        
        # User agent to avoid blocking
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=5) # Increased timeout slightly
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Aggressive cleanup of boilerplate
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript', 'meta', 'link', 'svg', 'button', 'form', 'aside']):
                element.decompose()
            
            # Remove often useless classes/ids
            bad_selectors = ['.menu', '.sidebar', '.ad', '.advertisement', '.social', '.comments', '.cookie', '.popup', '.login', '.signup']
            for selector in bad_selectors:
                for element in soup.select(selector):
                    element.decompose()

            text = soup.get_text(separator=' ', strip=True)
            # Normalize whitespace
            import re
            text = re.sub(r'\s+', ' ', text)
            
            return text[:6000] # Fetch more context for the LLM to process
        return ""
    except Exception as e:
        logger.warning(f"Failed to fetch content from {url}: {e}")
        return ""

def _refine_content_with_llm(query: str, raw_text: str, title: str) -> str:
    """
    Use Ollama to extract ONLY the relevant information from a raw webpage dump.
    Removes navigation menus, legal disclaimers, and irrelevant text.
    """
    if not raw_text or len(raw_text) < 100:
        return raw_text # Too short to refine

    try:
        prompt = f"""
        You are a content cleaner. Your goal is to extract the main relevant content from the raw webpage text below.
        
        Search Query: "{query}"
        Page Title: "{title}"
        
        Raw Text:
        "{raw_text[:4000]}"...
        
        Instructions:
        1. Extract ONLY information relevant to the Search Query and Page Title.
        2. Remove navigation menus, footers, copyright notices, cookie warnings, login prompts, and sidebars.
        3. Remove "Read more", "Share this", "Subscribe" type text.
        4. Organize the extracted info into clear paragraphs.
        5. If the text is unrelated (e.g., just error messages or login screen), return "Content not accessible."
        6. Do not start with "Here is the refined content". Just give the content.
        
        Refined Content:
        """
        
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "mistral:latest",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_ctx": 4096,
                    "temperature": 0.1 # Low temp for factual extraction
                }
            },
            timeout=120 # Fast enough for per-page processing? Might need tuning.
        )
        
        if response.ok:
            cleaned = response.json().get('response', '').strip()
            return cleaned if len(cleaned) > 50 else raw_text[:500] + "..."
        return raw_text[:1000] + "..." # Fallback
        
    except Exception as e:
        logger.error(f"Content cleaning error: {e}")
        return raw_text[:1000] + "..."


def _summarize_results(query: str, results: list) -> str:
    """Use Ollama to summarize search results into a detailed answer."""
    try:
        # Build context from results with rich content
        context_parts = []
        for i, r in enumerate(results, 1):
            content_source = r['content'] if r.get('content') and len(r['content']) > 100 else r['snippet']
            context_parts.append(f"Source {i}: **{r['title']}**\nURL: {r['url']}\nContent: {content_source}")
            
        context = "\n\n".join(context_parts)
        
        prompt = f"""You are a smart research assistant. Your goal is to provide a structured, context-aware answer based on the search results for "{query}".

Search Data:
{context}

Instructions:
1. Identify the core question or intent behind the search.
2. Structure your answer in the most effective way for the user's intent.
   - If it's a "How-to", provide steps.
   - If it's a comparison or conditional, use "If/Then" scenarios.
   - If it's a direct question, provide a direct answer with context.
3. Synthesize the top 5 results into a single coherent response.
4. Do NOT simply list the results; interpret them.
5. Keep it concise (under 200 words).

Summary:"""

        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_ctx": 8192, # Increased context for deep content
                    "temperature": 0.3
                }
            },
            timeout=90 # Increased timeout for generation
        )
        
        if response.ok:
            summary = response.json().get('response', '').strip()
            return summary if summary else "Results found but summarization failed."
        else:
            logger.error(f"Ollama summarization failed: {response.status_code}")
            return "Results found. See sources for details."
            
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return "Results found. See sources for details."


def detect_search_intent(text: str) -> list:
    """
    Detect search intent phrases in text and extract queries.
    Returns a list of search queries.
    """
    import re
    
    # Patterns to detect search intent
    patterns = [
        r"(?:search\s+(?:for|about)?)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:find\s+(?:out|information|info)?\s*(?:about)?)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:look\s+up)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:google)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:what\s+is|what\s+are|who\s+is|how\s+to)\s+(.+?)(?:\?|$|\.)",
        r"(?:research)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:tell\s+me\s+about)\s+['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
        r"(?:ask\s+google)\s+(?:about)?\s*['\"]?(.+?)['\"]?(?:\.|$|,|\?)",
    ]
    
    queries = []
    text_lower = text.lower()
    
    for pattern in patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            query = match.strip()
            if query and len(query) > 2 and query not in queries:
                queries.append(query)
    
    return queries[:2]  # Limit to 2 searches per note for performance
