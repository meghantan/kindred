import os
import logging
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

app = Flask(__name__)
# Enable CORS so your Next.js app can talk to this server
CORS(app)

# Configuration for Google Gemini 2.5 Flash
# Note: Use the specific model ID supported in the preview environment
GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025"
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

logging.basicConfig(level=logging.INFO)

def call_gemini_api(payload):
    """Internal helper to communicate with Google Gemini."""
    if not GEMINI_API_KEY:
        raise ValueError("GOOGLE_API_KEY is missing. Check your .env file.")
        
    try:
        # Implementing exponential backoff for API calls as a best practice
        import time
        max_retries = 5
        for i in range(max_retries):
            response = requests.post(GEMINI_URL, json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                # Extract text response from Gemini's nested structure
                return data['candidates'][0]['content']['parts'][0]['text'].strip()
            elif response.status_code == 429: # Rate limit
                time.sleep(2 ** i)
                continue
            else:
                response.raise_for_status()
                
        raise Exception("Max retries exceeded")
    except Exception as e:
        logging.error(f"Gemini API Error: {str(e)}")
        raise e

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translates written Hokkien (or other) text into English."""
    data = request.json
    text = data.get('text', '')
    source_lang = data.get('from', 'Hokkien')
    
    if not text:
        return jsonify({"error": "Text is required"}), 400

    # We instruct Gemini to be a precise translator
    payload = {
        "contents": [{
            "parts": [{
                "text": f"Translate the following {source_lang} text into natural, modern English. Provide only the translation, no explanations: {text}"
            }]
        }]
    }

    try:
        translated = call_gemini_api(payload)
        return jsonify({"translatedText": translated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate/voice', methods=['POST'])
def translate_voice():
    """Handles audio files, transcribing and translating Hokkien speech."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400
    
    audio_file = request.files['audio']
    # Encode audio binary to base64 for Gemini's multimodal input
    encoded_audio = base64.b64encode(audio_file.read()).decode('utf-8')

    # Prompting Gemini to 'listen' specifically for Hokkien (Southern Min)
    payload = {
        "contents": [{
            "parts": [
                {
                    "text": "The following audio is spoken in Hokkien (Southern Min). Please transcribe what is said and translate it into clear, natural English. Return only the English translation."
                },
                {
                    "inline_data": {
                        "mime_type": "audio/webm",
                        "data": encoded_audio
                    }
                }
            ]
        }]
    }

    try:
        translated = call_gemini_api(payload)
        return jsonify({"translatedText": translated})
    except Exception as e:
        return jsonify({"error": f"Voice translation failed: {str(e)}"}), 500

if __name__ == '__main__':
    logging.info(f"Gemini Backend starting on port 8000 using model {GEMINI_MODEL}...")
    app.run(host='0.0.0.0', port=8000, debug=True)