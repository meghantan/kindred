import os
import base64
import io
import tempfile
from dotenv import load_dotenv
from google import genai
from openai import OpenAI

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
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key: return text

    try:
        client = OpenAI(api_key=openai_api_key)
        prompt = f"{SYSTEM_PROMPT}\n\nFROM: {from_lang}\nTO: {to_lang}\n\nTEXT:\n{text}"
        
        # Use OpenAI's GPT-4o-mini for translation to avoid Gemini rate limits
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("OpenAI translation error:", repr(e))
        return text

def transcribe_and_process_audio(audio_base64: str, target_lang: str, should_translate: bool) -> str:
    """
    1. Transcribes audio using OpenAI Whisper (highly accurate).
    2. If translation is needed, sends text to Gemini for tone adjustment.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        return "ERROR_MISSING_OPENAI_KEY"

    try:
        # 1. Decode Base64 to a temporary file for Whisper
        audio_bytes = base64.b64decode(audio_base64)
        
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio_path = temp_audio.name

        # 2. Transcribe with OpenAI Whisper
        client = OpenAI(api_key=openai_api_key)
        
        with open(temp_audio_path, "rb") as audio_file:
            # transcription returns the raw text in the original language (e.g., Hokkien/English mix)
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                prompt="The audio may contain Singaporean English (Singlish), Mandarin, Hokkien, or Cantonese."
            )
        
        raw_text = transcription.text
        
        # Clean up temp file
        os.remove(temp_audio_path)

        # 3. If NO translation is needed, just return the text
        if not should_translate:
            return raw_text

        # 4. If translation IS needed, use Gemini to shift the tone/dialect
        # We assume the 'from_lang' is detected from the context or generic "Singlish/Dialect"
        return translate_text(raw_text, "Singlish/Dialect", target_lang)

    except Exception as e:
        print("Voice processing error:", repr(e))
        # Cleanup if file exists
        if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return "ERROR_PROCESSING_AUDIO"