import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

SYSTEM_PROMPT = (
    "You are a Singapore-focused intergenerational tone translator API. "
    "Your job is to convert language between generations and dialects while preserving emotional intent.\n\n"
    
    "GUIDELINES:\n"
    "1. If the source is Hokkien (or other dialects like Cantonese), translate it into clear, "
    "natural English (Standard or Elder) or Gen Z slang as requested, preserving the original "
    "emotional weight and cultural context.\n"
    
    "2. If the source is Gen Z slang, translate it into respectful, elder-friendly language "
    "that conveys the same meaning and emotion.\n"
    
    "3. If the source is Elder-style language, translate it into natural, modern Gen Z "
    "casual speech.\n\n"
    
    "RULES:\n"
    "Interpret by meaning, not literal wording. Preserve tone (excitement, care, frustration). "
    "Adapt for Singapore context. Do NOT add commentary. Return ONLY the translated sentence."
)

def translate_text(text: str, from_lang: str, to_lang: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return text  # fallback

    try:
        client = genai.Client(api_key=api_key)  # SDK supports GEMINI_API_KEY too :contentReference[oaicite:2]{index=2}

        prompt = f"{SYSTEM_PROMPT}\n\nFROM: {from_lang}\nTO: {to_lang}\n\nTEXT:\n{text}"

        # Pick a fast model; you can swap later
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        out = (resp.text or "").strip()
        return out if out else text

    except Exception as e:
        print("Gemini translation error:", repr(e))
        return text
