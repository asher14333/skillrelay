import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from replay import CRITERIA, normalize_insights, normalize_retry, validate_moments
from test_learning import feedback


def moment(**changes):
    return {"id": "moment-1", "elapsedMs": 0, "kind": "code", "code": "seen = {}", "transcript": "I use a map to store each index.", **changes}


def comparison(before="My plan", after="My improved plan"):
    return {"checks": [{"id": key, "before": {"met": False, "quote": None, "note": "Not explained."},
                        "after": {"met": True, "quote": after, "note": "Explained with supporting evidence."}}
                       for key, _ in CRITERIA["clarity"]], "summary": "The retry adds supporting explanation.", "nextStep": "Try a new example."}


class ReplayValidationTests(unittest.TestCase):
    def test_valid_snapshots_and_optional_run_data_are_preserved(self):
        result = validate_moments([moment(), moment(id="moment-2", elapsedMs=2000, kind="run-result", run={"passed": 2, "total": 3})])
        self.assertEqual(result[1]["run"]["passed"], 2)
        self.assertEqual(result[0]["code"], "seen = {}")

    def test_rejects_duplicate_ids_out_of_order_time_and_invalid_fields(self):
        invalid = [[moment(), moment()], [moment(elapsedMs=20), moment(id="second", elapsedMs=10)],
                   [moment(elapsedMs=-1)], [moment(elapsedMs=float("nan"))], [moment(kind=[])],
                   [moment(code=3)], [moment(transcript="x" * 6001)],
                   [moment(run={"passed": 4, "total": 3})], [moment(elapsedMs=True)]]
        for value in invalid:
            with self.subTest(value=str(value)[:80]), self.assertRaises(ValueError):
                validate_moments(value)
        with self.assertRaises(ValueError):
            validate_moments([moment(id=str(i)) for i in range(17)])

    def test_only_known_moments_with_exact_evidence_can_be_shown(self):
        valid = {"checkpointId": "moment-1", "dimension": "spaceComplexity", "kind": "gap",
                 "observation": "Explain how the map's memory grows.", "codeQuote": "seen = {}", "transcriptQuote": "I use a map"}
        self.assertEqual(len(normalize_insights([valid], [moment()])), 1)
        invalid = [dict(valid, checkpointId="unknown"), dict(valid, codeQuote="invented code"),
                   dict(valid, transcriptQuote="invented speech"), dict(valid, codeQuote=None, transcriptQuote=None),
                   dict(valid, dimension=[]), dict(valid, checkpointId=[]), dict(valid, observation="")]
        self.assertEqual(normalize_insights(invalid, [moment()]), [])

    def test_retry_requires_exact_quote_for_every_claimed_met_criterion(self):
        raw = comparison()
        raw["checks"][0]["after"]["quote"] = "Invented improvement"
        result = normalize_retry(raw, "clarity", "My plan", "My improved plan")
        self.assertEqual(result["beforeMet"], 0)
        self.assertEqual(result["afterMet"], 2)
        self.assertFalse(result["checks"][0]["after"]["met"])
        self.assertIsNone(result["checks"][0]["after"]["quote"])

    def test_retry_can_decrease_without_forcing_a_positive_result(self):
        raw = comparison()
        for item in raw["checks"]:
            item["before"] = {"met": True, "quote": "My plan", "note": "Supported."}
            item["after"] = {"met": False, "quote": None, "note": "Missing detail."}
        result = normalize_retry(raw, "clarity", "My plan", "My improved plan")
        self.assertEqual((result["beforeMet"], result["afterMet"]), (3, 0))

    def test_missing_comparison_checks_are_errors(self):
        with self.assertRaises(ValueError):
            normalize_retry({"checks": []}, "clarity", "before", "after")


class ReplayApiTests(unittest.TestCase):
    def setUp(self):
        import app
        self.module = app
        self.client = app.app.test_client()
        self.payload = {"problemId": "two-sum", "code": "seen = {}", "transcript": "I use a map to store each index.", "checkpoints": [moment()]}

    def test_analysis_adds_verified_insights_in_the_existing_model_call(self):
        raw = feedback(0)
        raw["replayInsights"] = [{"checkpointId": "moment-1", "dimension": "spaceComplexity", "kind": "gap", "observation": "Clarify the memory trade-off.", "codeQuote": "seen = {}", "transcriptQuote": None}]
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(self.module, "call_model", return_value=raw) as model:
            response = self.client.post('/analyze', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json["replayInsights"]), 1)
        self.assertEqual(len(response.json["focusedPractice"]["clarity"]["criteria"]), 3)
        model.assert_called_once()

    def test_bad_checkpoints_and_non_object_requests_fail_before_model(self):
        with patch.object(self.module, "call_model") as model:
            for payload in ([], {**self.payload, "checkpoints": [moment(kind=[])]}, {**self.payload, "code": []}):
                self.assertEqual(self.client.post('/analyze', json=payload).status_code, 400)
            model.assert_not_called()

    def test_retry_returns_evidence_and_computed_totals(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(self.module, "call_model", return_value=comparison()) as model:
            response = self.client.post('/practice/retry', json={"problemId": "two-sum", "dimension": "clarity", "before": "My plan", "after": "My improved plan", "code": "seen = {}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["afterMet"], 3)
        model.assert_called_once()

    def test_empty_checkpoint_explanation_is_a_valid_baseline(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(self.module, "call_model", return_value=comparison()):
            response = self.client.post('/practice/retry', json={"problemId": "two-sum", "dimension": "clarity", "before": "", "after": "My improved plan"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["beforeMet"], 0)

    def test_bad_retry_inputs_never_call_model(self):
        valid = {"problemId": "two-sum", "dimension": "clarity", "before": "before", "after": "after"}
        with patch.object(self.module, "call_model") as model:
            for payload in ([], {**valid, "dimension": []}, {**valid, "after": ""}, {**valid, "after": "x" * 6001}, {**valid, "problemId": []}):
                self.assertEqual(self.client.post('/practice/retry', json=payload).status_code, 400)
            model.assert_not_called()

    def test_incomplete_model_comparison_returns_retryable_error(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(self.module, "call_model", return_value={"checks": []}):
            response = self.client.post('/practice/retry', json={"problemId": "two-sum", "dimension": "clarity", "before": "before", "after": "after"})
        self.assertEqual(response.status_code, 502)


if __name__ == '__main__':
    unittest.main()
