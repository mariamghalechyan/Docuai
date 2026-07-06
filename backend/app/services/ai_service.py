import json
import urllib.request
import urllib.error
from app.core.config import settings

GEMINI_API_KEY = settings.GEMINI_API_KEY
MODEL = "gemini-2.5-flash"
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"


def _call_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the text response."""
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    }).encode("utf-8")

    req = urllib.request.Request(
        BASE_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else str(e)
        print(f"[GEMINI RAW ERROR {e.code}] {body}")
        if e.code == 429:
            raise Exception("This demo runs on a free-tier AI quota that's temporarily exhausted. Please try again in a few minutes.")
        raise


def summarise_document(raw_text: str) -> str:
    prompt = (
        "Summarise the following business document in 3-4 sentences. "
        "Focus on what type of document it is, who the key parties are, "
        "the main purpose, and any critical dates or amounts.\n\n"
        f"DOCUMENT:\n{raw_text[:8000]}"
    )
    return _call_gemini(prompt)


def clean_json_response(text: str) -> str:
    """Helper to strip markdown blocks if Gemini accidentally includes them."""
    text = text.strip()
    if text.startswith("```"):
        # Split out the markdown code block identifiers
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
    return text.strip()


def extract_fields(raw_text: str) -> list[dict]:
    prompt = (
        "Extract all key structured fields from this business document. "
        "Return ONLY a raw JSON array, no other conversational text, no markdown backticks. "
        "Each item must have: field_name (string), field_value (string), confidence (float 0-1).\n\n"
        f"DOCUMENT:\n{raw_text[:8000]}\n\n"
        "Return ONLY valid JSON array layout example:\n"
        '[{"field_name": "invoice_date", "field_value": "2024-03-15", "confidence": 0.98}]'
    )
    text = _call_gemini(prompt)
    cleaned_text = clean_json_response(text)
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        return []


def answer_question(raw_text: str, history: list[dict], question: str) -> str:
    """Answer a user's question about the document, using prior chat history for context."""
    history_text = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    prompt = (
        "You are DocuAI, a friendly assistant helping someone understand a specific "
        "business document. Respond naturally to greetings and small talk. "
        "For questions about the document's content, answer using only information "
        "found in the document below — if the answer genuinely isn't there, say so "
        "clearly instead of guessing.\n\n"
        f"DOCUMENT:\n{raw_text[:8000]}\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n"
        f"New message: {question}\n\n"
        "Reply in a natural, conversational tone."
    )
    return _call_gemini(prompt)


def detect_risk_flags(raw_text: str) -> list[dict]:
    prompt = (
        "Analyse this business document for risks, anomalies, and red flags. "
        "Return ONLY a raw JSON array, no other conversational text, no markdown backticks. "
        "Each item must have: flag_type (string), severity ('low'|'medium'|'high'), description (string).\n\n"
        "If the document looks clean, return an empty array [].\n\n"
        f"DOCUMENT:\n{raw_text[:8000]}\n\n"
        "Return ONLY valid JSON array layout example:\n"
        '[{"flag_type": "missing_field", "severity": "high", "description": "No payment due date found"}]'
    )
    text = _call_gemini(prompt)
    cleaned_text = clean_json_response(text)
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        return []