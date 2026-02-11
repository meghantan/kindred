from flask import Flask, request, jsonify
from flask_cors import CORS
from translation import translate_text
from ai_agent import summarize_hobbies, match_jio_to_users
from profiler import extract_interests_from_post, suggest_matches

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

@app.get("/health")
def health():
    return {"ok": True}

# Translation Route
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

from hobby import extract_interests_from_post, suggest_matches

@app.post("/analyze-post")
def analyze_post():
    data = request.get_json(silent=True) or {}
    content = data.get("content", "")
    interests = extract_interests_from_post(content)
    return jsonify({"interests": interests})

@app.post("/suggest-jio-matches")
def suggest_jio_matches():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")
    desc = data.get("description", "")
    members = data.get("members", []) # Array of {name, interests}
    suggestions = suggest_matches(title, desc, members)
    return jsonify({"suggestions": suggestions})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

