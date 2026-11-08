"""JSON generation for the configured provider. Credentials stay server-side."""

import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI


TIMEOUT_SECONDS = 45
DEFAULT_MODELS = {"gemini": "gemini-3.8-flash", "openai": "gpt-4o-mini"}


class AIProviderError(Exception):
    def __init__(self, message, code="AI_UNAVAILABLE", status=502):
        super().__init__(message)
        self.code = code
        self.status = status


def provider_config():
    # Preserve existing OpenAI-only installations; prefer Gemini when both keys
    # are present unless the provider is explicitly selected.
    provider = os.getenv("AI_PROVIDER", "").strip().lower()
    if not provider:
        provider = "gemini" if os.getenv("GEMINI_API_KEY", "").strip() else "openai"
    if provider not in DEFAULT_MODELS:
        raise AIProviderError("Set AI_PROVIDER to gemini or openai in backend/.env.", "AI_NOT_CONFIGURED", 503)
    prefix = provider.upper()
    key = os.getenv(f"{prefix}_API_KEY", "").strip()
    if not key:
        raise AIProviderError(f"{prefix}_API_KEY is not configured in backend/.env.", "AI_NOT_CONFIGURED", 503)
    model = os.getenv(f"{prefix}_MODEL", "").strip() or DEFAULT_MODELS[provider]
    if not re.fullmatch(r"[A-Za-z0-9._-]+", model):
        raise AIProviderError(f"Set {prefix}_MODEL to a model ID, without a URL or models/ prefix.", "AI_NOT_CONFIGURED", 503)
    return provider, key, model


def _upstream_error(provider, status):
    label = "Gemini" if provider == "gemini" else "OpenAI"
    if status in (401, 403):
        return AIProviderError(f"{label} rejected the API key or access. Check the backend configuration.", "AI_AUTH_ERROR")
    if status == 429:
        return AIProviderError(f"{label} quota or rate limit reached. Check your quota or try again later.", "AI_RATE_LIMITED", 429)
    if status == 404:
        return AIProviderError(f"{label} model was not found. Check {provider.upper()}_MODEL in backend/.env.", "AI_MODEL_NOT_FOUND")
    return AIProviderError(f"{label} could not complete the request. Check your configuration and try again.")


def _json_object(text):
    try:
        result = json.loads(text)
    except (TypeError, ValueError):
        raise AIProviderError("AI returned an invalid response. Please try again.", "AI_INVALID_RESPONSE") from None
    if not isinstance(result, dict):
        raise AIProviderError("AI returned an invalid response. Please try again.", "AI_INVALID_RESPONSE")
    return result


def _gemini(system, user, key, model):
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    request = Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            envelope = json.load(response)
    except HTTPError as exc:
        error = _upstream_error("gemini", exc.code)
        exc.close()
        raise error from None
    except (TimeoutError, URLError):
        raise AIProviderError("Could not reach Gemini in time. Your practice is still here; try again.", "AI_CONNECTION_ERROR") from None
    except (ValueError, UnicodeError):
        raise AIProviderError("Gemini returned an invalid response. Please try again.", "AI_INVALID_RESPONSE") from None

    if not isinstance(envelope, dict):
        raise AIProviderError("Gemini returned an invalid response. Please try again.", "AI_INVALID_RESPONSE")
    candidates = envelope.get("candidates")
    if not isinstance(candidates, list) or not candidates or not isinstance(candidates[0], dict):
        raise AIProviderError("Gemini returned no usable answer. Please revise your explanation and try again.", "AI_INVALID_RESPONSE")
    candidate = candidates[0]
    if candidate.get("finishReason") != "STOP":
        raise AIProviderError("Gemini could not finish the answer. Please try again.", "AI_INVALID_RESPONSE")
    content = candidate.get("content")
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        raise AIProviderError("Gemini returned no usable answer. Please try again.", "AI_INVALID_RESPONSE")
    # Never include a model's optional thought parts in the app's feedback.
    text = "".join(part["text"] for part in parts
                   if isinstance(part, dict) and not part.get("thought") and isinstance(part.get("text"), str))
    return _json_object(text)


def _openai(system, user, key, model):
    try:
        with OpenAI(api_key=key, timeout=TIMEOUT_SECONDS, max_retries=0) as client:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                response_format={"type": "json_object"},
            )
        if not response.choices or response.choices[0].finish_reason != "stop":
            raise AIProviderError("OpenAI could not finish the answer. Please try again.", "AI_INVALID_RESPONSE")
        return _json_object(response.choices[0].message.content)
    except APIStatusError as exc:
        raise _upstream_error("openai", exc.status_code) from None
    except (APIConnectionError, APITimeoutError):
        raise AIProviderError("Could not reach OpenAI in time. Your practice is still here; try again.", "AI_CONNECTION_ERROR") from None


def call_model(system: str, user: str) -> dict:
    provider, key, model = provider_config()
    if provider == "gemini":
        return _gemini(system, user, key, model)
    return _openai(system, user, key, model)
