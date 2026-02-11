import os
import base64
import io
from dotenv import load_dotenv
from google import genai
from google.genai import types # Add this import

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

def transcribe_and_process_audio(audio_base64: str, target_lang: str, should_translate: bool) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "ERROR_MISSING_API_KEY"

    try:
        client = genai.Client(api_key=api_key)
        audio_bytes = base64.b64decode(audio_base64)
        
        if should_translate:
            prompt_text = (
                f"Transcribe this audio. The speaker may use English or Singaporean dialects "
                f"like Hokkien, Cantonese, or Mandarin. Translate the content into {target_lang}. "
                "Preserve the emotional intent and Singaporean context. Return ONLY the translation."
            )
        else:
            prompt_text = "Transcribe this English audio into text. Return only the transcription."

        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt_text),
                        types.Part.from_bytes(data=audio_bytes, mime_type="audio/webm")
                    ]
                )
            ]
        )
        return (response.text or "").strip()
    except Exception as e:
        error_msg = repr(e)
        print("Voice processing error:", error_msg)
        if "429" in error_msg or "Quota" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return "ERROR_QUOTA_EXCEEDED"
        return "ERROR_PROCESSING_AUDIO"