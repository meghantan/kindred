import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT_EXTRACT = (
    "You are a profile analysis AI. Given a user's post content, identify specific hobbies, "
    "interests, or skills mentioned. Return only a comma-separated list of lowercase tags. "
    "If none are found, return 'none'."
)

SYSTEM_PROMPT_MATCH = (
    "Compare the following Event details with a list of family members and their interests. "
    "Identify which members would be most interested in this event based on their hobbies. "
    "Return only the names of the top 3 matches as a comma-separated list."
)

def extract_interests_from_post(content: str) -> list:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return []
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{SYSTEM_PROMPT_EXTRACT}\n\nPOST CONTENT: {content}"
        )
        tags = resp.text.strip().lower()
        if tags == 'none': return []
        return [t.strip() for t in tags.split(',')]
    except Exception as e:
        print(f"Profiling error: {e}")
        return []

def suggest_matches(event_title: str, event_desc: str, members_data: list) -> list:
    # members_data: list of dicts with {'name': str, 'interests': [str]}
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return []
    try:
        client = genai.Client(api_key=api_key)
        context = "\n".join([f"{m['name']}: {', '.join(m.get('interests', []))}" for m in members_data])
        prompt = f"{SYSTEM_PROMPT_MATCH}\n\nEVENT: {event_title} - {event_desc}\n\nMEMBERS:\n{context}"
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return [n.strip() for n in resp.text.split(',')]
    except Exception as e:
        print(f"Matching error: {e}")
        return []