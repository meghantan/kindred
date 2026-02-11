from flask import Flask, request, jsonify
from flask_cors import CORS
from translation import translate_text,transcribe_and_process_audio

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/translate")
def translate():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    from_lang = data.get("fromLang") or "unknown"
    to_lang = data.get("toLang") or "unknown"

    if not text:
        return jsonify({"error": "text required"}), 400

    translated = translate_text(text, from_lang, to_lang)
    return jsonify({"translated": translated})

@app.post("/transcribe")
def transcribe():
    data = request.get_json(silent=True) or {}
    audio_data = data.get("audio")
    target_lang = data.get("toLang") or "Standard English"
    should_translate = data.get("shouldTranslate", False)
    
    if not audio_data:
        return jsonify({"error": "audio required"}), 400

    text = transcribe_and_process_audio(audio_data, target_lang, should_translate)
    
    # Catch specific errors and return proper HTTP status codes
    if text == "ERROR_QUOTA_EXCEEDED":
        return jsonify({"error": "API rate limit exceeded. Please wait 10 seconds and try again."}), 429
    elif text == "ERROR_PROCESSING_AUDIO":
        return jsonify({"error": "Failed to process audio."}), 500
    elif text == "ERROR_MISSING_API_KEY":
         return jsonify({"error": "Gemini API key is missing on the server."}), 500

    return jsonify({"text": text})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
