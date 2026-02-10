from flask import Flask, request, jsonify
from flask_cors import CORS
from translation import translate_text

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
