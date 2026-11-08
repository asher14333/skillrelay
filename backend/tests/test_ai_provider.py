import io
import json
import os
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ai_provider
import app
from replay import CRITERIA


def gemini_response(value, **changes):
    candidate = {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(value)}]}, **changes}
    return {"candidates": [candidate]}


def http_response(value):
    return io.BytesIO(json.dumps(value).encode())


class ProviderConfigurationTests(unittest.TestCase):
    def test_existing_openai_only_setup_is_preserved(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-only"}, clear=True):
            self.assertEqual(ai_provider.provider_config(), ("openai", "test-only", "gpt-4o-mini"))

    def test_gemini_is_preferred_when_both_keys_exist(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "gemini-test", "OPENAI_API_KEY": "openai-test"}, clear=True):
            self.assertEqual(ai_provider.provider_config(), ("gemini", "gemini-test", "gemini-3.8-flash"))

    def test_explicit_provider_and_model_override_auto_selection(self):
        with patch.dict(os.environ, {"AI_PROVIDER": " OPENAI ", "OPENAI_API_KEY": " test-only ",
                                    "GEMINI_API_KEY": "other", "OPENAI_MODEL": "custom-model"}, clear=True):
            self.assertEqual(ai_provider.provider_config(), ("openai", "test-only", "custom-model"))

    def test_invalid_configuration_fails_without_network_or_fallback(self):
        for env in ({}, {"AI_PROVIDER": "unknown"}, {"AI_PROVIDER": "gemini", "OPENAI_API_KEY": "other"},
                    {"AI_PROVIDER": "gemini", "GEMINI_API_KEY": " "},
                    {"GEMINI_API_KEY": "test-only", "GEMINI_MODEL": "../somewhere?key=secret"}):
            with self.subTest(env=env), patch.dict(os.environ, env, clear=True), \
                    patch.object(ai_provider, "urlopen") as network, patch.object(ai_provider, "OpenAI") as other:
                with self.assertRaises(ai_provider.AIProviderError) as error:
                    ai_provider.call_model("system", "user")
                self.assertEqual(error.exception.code, "AI_NOT_CONFIGURED")
                network.assert_not_called()
                other.assert_not_called()


class GeminiTransportTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"AI_PROVIDER": "gemini", "GEMINI_API_KEY": "private-test-key",
                                          "GEMINI_MODEL": "custom-gemini-model"}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_request_uses_header_auth_system_prompt_and_json_mode(self):
        with patch.object(ai_provider, "urlopen", return_value=http_response(gemini_response({"question": "Why?"}))) as network:
            self.assertEqual(ai_provider.call_model("Coach in JSON", "My explanation"), {"question": "Why?"})
        request = network.call_args.args[0]
        self.assertEqual(request.full_url, "https://generativelanguage.googleapis.com/v1beta/models/custom-gemini-model:generateContent")
        self.assertNotIn("private-test-key", request.full_url)
        self.assertEqual(request.get_header("X-goog-api-key"), "private-test-key")
        self.assertEqual(network.call_args.kwargs["timeout"], 45)
        data = json.loads(request.data)
        self.assertEqual(data["systemInstruction"]["parts"][0]["text"], "Coach in JSON")
        self.assertEqual(data["contents"][0], {"role": "user", "parts": [{"text": "My explanation"}]})
        self.assertEqual(data["generationConfig"]["responseMimeType"], "application/json")

    def test_text_parts_are_joined_and_thoughts_excluded(self):
        response = gemini_response(None, content={"parts": [{"text": "internal reasoning", "thought": True},
                                                           {"text": '{"ok":'}, {"text": "true}"}]})
        with patch.object(ai_provider, "urlopen", return_value=http_response(response)):
            self.assertEqual(ai_provider.call_model("s", "u"), {"ok": True})

    def test_blocked_truncated_missing_and_non_object_answers_are_rejected(self):
        responses = [None, [], {}, {"promptFeedback": {"blockReason": "SAFETY"}},
                     gemini_response({}, finishReason="SAFETY"), gemini_response({}, finishReason="MAX_TOKENS"),
                     gemini_response({}, content={}), gemini_response([]),
                     gemini_response({}, content={"parts": [{"text": "not JSON"}]}),
                     gemini_response({}, content={"parts": [{"text": "{}", "thought": True}]})]
        for response in responses:
            with self.subTest(response=response), patch.object(ai_provider, "urlopen", return_value=http_response(response)):
                with self.assertRaises(ai_provider.AIProviderError) as error:
                    ai_provider.call_model("s", "u")
                self.assertEqual(error.exception.code, "AI_INVALID_RESPONSE")

    def test_non_json_http_body_is_rejected(self):
        with patch.object(ai_provider, "urlopen", return_value=io.BytesIO(b"<html>upstream error</html>")):
            with self.assertRaises(ai_provider.AIProviderError) as error:
                ai_provider.call_model("s", "u")
        self.assertEqual(error.exception.code, "AI_INVALID_RESPONSE")

    def test_errors_are_actionable_and_never_expose_upstream_details(self):
        for status, code in ((400, "AI_UNAVAILABLE"), (401, "AI_AUTH_ERROR"), (403, "AI_AUTH_ERROR"),
                             (404, "AI_MODEL_NOT_FOUND"), (429, "AI_RATE_LIMITED"), (503, "AI_UNAVAILABLE")):
            upstream = HTTPError("https://example.invalid", status, "private-test-key secret response", {}, None)
            with self.subTest(status=status), patch.object(ai_provider, "urlopen", side_effect=upstream), \
                    patch.object(ai_provider, "OpenAI") as fallback:
                with self.assertRaises(ai_provider.AIProviderError) as error:
                    ai_provider.call_model("s", "u")
                self.assertEqual(error.exception.code, code)
                self.assertNotIn("private-test-key", str(error.exception))
                fallback.assert_not_called()

    def test_connection_errors_and_timeouts_are_retryable(self):
        for error in (URLError("private-test-key"), TimeoutError("private-test-key")):
            with self.subTest(error=type(error)), patch.object(ai_provider, "urlopen", side_effect=error):
                with self.assertRaises(ai_provider.AIProviderError) as caught:
                    ai_provider.call_model("s", "u")
                self.assertEqual(caught.exception.code, "AI_CONNECTION_ERROR")
                self.assertNotIn("private-test-key", str(caught.exception))


class OpenAITransportTests(unittest.TestCase):
    def test_existing_completion_contract_and_configured_model(self):
        response = SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content='{"question":"Why?"}'))])
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only", "OPENAI_MODEL": "custom-model"}, clear=True), \
                patch.object(ai_provider, "OpenAI") as factory, patch.object(ai_provider, "urlopen") as gemini:
            client = factory.return_value.__enter__.return_value
            client.chat.completions.create.return_value = response
            self.assertEqual(ai_provider.call_model("system", "user"), {"question": "Why?"})
            factory.assert_called_once_with(api_key="test-only", timeout=45, max_retries=0)
            self.assertEqual(client.chat.completions.create.call_args.kwargs["model"], "custom-model")
            self.assertEqual(client.chat.completions.create.call_args.kwargs["response_format"], {"type": "json_object"})
            gemini.assert_not_called()

    def test_refused_or_truncated_openai_answer_is_rejected(self):
        response = SimpleNamespace(choices=[SimpleNamespace(finish_reason="length", message=SimpleNamespace(content="{}"))])
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-only"}, clear=True), patch.object(ai_provider, "OpenAI") as factory:
            factory.return_value.__enter__.return_value.chat.completions.create.return_value = response
            with self.assertRaises(ai_provider.AIProviderError) as error:
                ai_provider.call_model("s", "u")
            self.assertEqual(error.exception.code, "AI_INVALID_RESPONSE")

    def test_openai_auth_quota_and_connection_errors_are_sanitized(self):
        request = SimpleNamespace(method="POST", url="https://api.openai.com/v1/chat/completions")
        errors = [(ai_provider.APIStatusError("secret", response=SimpleNamespace(status_code=status, request=request, headers={}), body=None), code)
                  for status, code in ((401, "AI_AUTH_ERROR"), (429, "AI_RATE_LIMITED"), (503, "AI_UNAVAILABLE"))]
        errors.append((ai_provider.APIConnectionError(message="secret", request=request), "AI_CONNECTION_ERROR"))
        for upstream, code in errors:
            with self.subTest(code=code), patch.dict(os.environ, {"OPENAI_API_KEY": "test-only"}, clear=True), \
                    patch.object(ai_provider, "OpenAI") as factory:
                factory.return_value.__enter__.return_value.chat.completions.create.side_effect = upstream
                with self.assertRaises(ai_provider.AIProviderError) as error:
                    ai_provider.call_model("s", "u")
                self.assertEqual(error.exception.code, code)
                self.assertNotIn("secret", str(error.exception))


class ProviderRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app.app.test_client()
        base = {"problemId": "two-sum", "transcript": "I find two array indices with a hash map in one pass.", "code": "seen = {}"}
        self.requests = [
            ("/analyze", base),
            ("/practice/retry", {"problemId": "two-sum", "dimension": "clarity", "before": "before", "after": "after"}),
            ("/interview/start", base),
            ("/interview/respond", {**base, "history": [{"role": "interviewer", "content": "Why a map?"}], "answer": "My answer"}),
        ]

    def test_all_four_routes_work_with_gemini_and_keep_response_contracts(self):
        raw = {"rubric": {key: {"score": 0} for key in ("problemUnderstanding", "bruteForce", "optimization", "timeComplexity", "spaceComplexity", "clarity")},
               "question": "Why a map?", "nextQuestion": "What about duplicates?", "complete": False,
               "answerEvaluation": {"score": 5, "feedback": "Test feedback.", "quote": None},
               "checks": [{"id": ident, "before": {"met": False, "quote": None, "note": "Missing"},
                           "after": {"met": True, "quote": "after", "note": "Supported"}}
                          for ident, _ in CRITERIA["clarity"]], "summary": "Test fixture", "nextStep": "Practice"}
        with patch.dict(os.environ, {"AI_PROVIDER": "gemini", "GEMINI_API_KEY": "test-only"}, clear=True), \
                patch.object(ai_provider, "urlopen", side_effect=lambda *a, **kw: http_response(gemini_response(raw))) as network:
            results = [self.client.post(path, json=payload) for path, payload in self.requests]
        self.assertEqual([result.status_code for result in results], [200] * 4)
        self.assertIn("learningPlan", results[0].json)
        self.assertIn("replayInsights", results[0].json)
        self.assertEqual(results[1].json["afterMet"], 3)
        self.assertEqual(results[2].json["question"], "Why a map?")
        self.assertEqual(results[3].json["nextQuestion"], "What about duplicates?")
        self.assertEqual(network.call_count, 4)

    def test_missing_selected_key_returns_consistent_configuration_error(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "gemini", "OPENAI_API_KEY": "other"}, clear=True), \
                patch.object(ai_provider, "urlopen") as network:
            for path, payload in self.requests:
                with self.subTest(path=path):
                    response = self.client.post(path, json=payload)
                    self.assertEqual(response.status_code, 503)
                    self.assertEqual(response.json["code"], "AI_NOT_CONFIGURED")
                    self.assertIn("GEMINI_API_KEY", response.json["error"])
            network.assert_not_called()

    def test_provider_rate_limit_propagates_through_every_ai_route(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-only"}, clear=True), \
                patch.object(ai_provider, "urlopen", side_effect=HTTPError("https://example.invalid", 429, "secret", {}, None)):
            for path, payload in self.requests:
                with self.subTest(path=path):
                    response = self.client.post(path, json=payload)
                    self.assertEqual(response.status_code, 429)
                    self.assertEqual(response.json["code"], "AI_RATE_LIMITED")
                    self.assertNotIn("secret", response.json["error"])

    def test_unexpected_errors_do_not_return_credentials_or_raw_messages(self):
        with patch.object(app, "call_model", side_effect=RuntimeError("secret credentials")):
            for path, payload in self.requests:
                with self.subTest(path=path):
                    response = self.client.post(path, json=payload)
                    self.assertEqual(response.status_code, 502)
                    self.assertNotIn("secret", response.json["error"])


if __name__ == "__main__":
    unittest.main()
