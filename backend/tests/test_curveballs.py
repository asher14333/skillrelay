"""Executable requirement changes and evidence-grounded adaptation reviews."""

from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app
from ai_provider import AIProviderError
from curveballs import CURVEBALLS, CHECKS, get_problem_variant, normalize_review
from problems import PROBLEMS
from prompts import RUBRIC_DIMENSIONS
from runner import run_code

SOLUTIONS = {
    "two-sum": """class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, value in enumerate(nums):
            if target - value in seen: return [seen[target - value], i]
            seen[value] = i
        return []
""",
    "valid-parentheses": """class Solution:
    def isValid(self, s):
        stack = []
        pairs = {')': '(', ']': '[', '}': '{'}
        for char in s:
            if char in pairs:
                if not stack or stack.pop() != pairs[char]: return False
            elif char in '([{': stack.append(char)
        return not stack
""",
    "contains-duplicate": """class Solution:
    def hasDuplicate(self, nums): return len(set(nums)) < len(nums)
""",
    "best-time-to-buy-and-sell-stock": """class Solution:
    def maxProfit(self, prices):
        if not prices: return 0
        best = 0
        minimum = prices[0]
        for price in prices:
            best = max(best, price - minimum)
            minimum = min(minimum, price)
        return best
""",
    "maximum-subarray": """class Solution:
    def maxSubArray(self, nums):
        if not nums: return 0
        best = current = nums[0]
        for value in nums[1:]:
            current = max(value, current + value)
            best = max(best, current)
        return best
""",
}


def review_fixture(quote="I return an empty list when no pair exists."):
    return {"summary": "You explained the changed behavior.", "nextStep": "Check a matching pair too.",
            "checks": [{"id": ident, "met": True, "quote": quote, "note": "Supported in the explanation."}
                       for ident, _ in CHECKS]}


class CurveballRunnerTests(unittest.TestCase):
    def test_catalog_covers_every_problem_without_mutating_original_cases(self):
        self.assertEqual({item["problemId"] for item in CURVEBALLS}, set(PROBLEMS))
        self.assertEqual(len({item["id"] for item in CURVEBALLS}), len(CURVEBALLS))
        original = deepcopy(PROBLEMS)
        for item in CURVEBALLS:
            problem = get_problem_variant(item["problemId"], item["id"])
            self.assertEqual(problem["test_cases"], original[item["problemId"]]["test_cases"] + item["testCases"])
            self.assertIn(item["requirement"], problem["description"])
        self.assertEqual(PROBLEMS, original)

    def test_all_five_updated_solutions_pass_original_and_curveball_cases(self):
        for item in CURVEBALLS:
            with self.subTest(curveball=item["id"]):
                result = run_code(item["problemId"], SOLUTIONS[item["problemId"]], item["id"])
                self.assertTrue(result.get("all_passed"), result)
                self.assertEqual(result["total"], len(PROBLEMS[item["problemId"]]["test_cases"]) + len(item["testCases"]))

    def test_missing_return_and_naive_zero_subarray_fail_real_new_cases(self):
        missing_return = SOLUTIONS["two-sum"].replace("        return []", "")
        result = run_code("two-sum", missing_return, "two-sum-no-match")
        self.assertEqual(result["passed"], 3)
        self.assertFalse(result["all_passed"])
        broken = SOLUTIONS["maximum-subarray"].replace("        best = current = nums[0]", "        best = current = 0")
        result = run_code("maximum-subarray", broken, "subarray-empty-input")
        self.assertFalse(result["results"][-1]["passed"], "Empty-input support must not turn all-negative inputs into zero")

    def test_runner_rejects_unknown_and_wrong_problem_curveballs(self):
        for slug, ident in (("two-sum", "missing"), ("two-sum", "stock-empty-prices"), ("two-sum", [])):
            self.assertIn("error", run_code(slug, SOLUTIONS["two-sum"], ident))


class CurveballApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.app.test_client()
        self.payload = {"problemId": "two-sum", "curveballId": "two-sum-no-match",
                        "code": SOLUTIONS["two-sum"], "transcript": "I return an empty list when no pair exists.",
                        "beforeCode": "class Solution: pass", "beforeTranscript": "I assume a pair exists."}

    def test_all_session_routes_reject_unknown_or_mismatched_variant_before_work(self):
        with patch.object(app, "call_model") as model, patch.object(app, "run_code") as runner:
            for endpoint in ("/run", "/analyze", "/practice/retry", "/interview/start", "/interview/respond", "/curveball/review"):
                for ident in ("missing", [], 3, "stock-empty-prices", ""):
                    response = self.client.post(endpoint, json={**self.payload, "curveballId": ident,
                        "dimension": "clarity", "before": "Before", "after": "After", "answer": "Answer",
                        "history": [{"role": "interviewer", "content": "Question"}]})
                    self.assertEqual(response.status_code, 400, (endpoint, ident, response.json))
            model.assert_not_called()
            runner.assert_not_called()

    def test_review_rejects_missing_context_and_oversized_fields_before_work(self):
        changes = ({"curveballId": None}, {"code": ""}, {"transcript": ""},
                   {"beforeCode": None}, {"beforeTranscript": 3}, {"beforeCode": "x" * 12001},
                   {"beforeTranscript": "x" * 6001})
        with patch.object(app, "call_model") as model, patch.object(app, "run_code") as runner:
            for change in changes:
                response = self.client.post('/curveball/review', json={**self.payload, **change})
                self.assertEqual(response.status_code, 400, response.json)
            for raw in ('null', '[]', '{broken'):
                self.assertEqual(self.client.post('/curveball/review', data=raw, content_type='application/json').status_code, 400)
            model.assert_not_called()
            runner.assert_not_called()

    def test_review_returns_actual_run_and_exact_after_evidence(self):
        with patch.object(app, "call_model", return_value=review_fixture()) as model:
            response = self.client.post('/curveball/review', json=self.payload)
        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json['run']['all_passed'])
        self.assertEqual(response.json['run']['total'], 5)
        self.assertTrue(all(check['met'] and check['quote'] in self.payload['transcript'] for check in response.json['feedback']['checks']))
        prompt = model.call_args.args[1]
        for value in (self.payload['beforeCode'], self.payload['beforeTranscript'], self.payload['code'], self.payload['transcript']):
            self.assertIn(value, prompt)
        self.assertIn('Passing code or tests alone does not establish communication skill', prompt)

    def test_invalid_model_review_and_provider_failure_return_recoverable_errors(self):
        invalid = [None, {}, {**review_fixture(), "summary": []}, {**review_fixture(), "checks": []}, {**review_fixture(), "checks": review_fixture()["checks"] + [[]]},
                   {**review_fixture(), "checks": [dict(item, met="true") for item in review_fixture()['checks']]}]
        for raw in invalid:
            with patch.object(app, "call_model", return_value=raw):
                self.assertEqual(self.client.post('/curveball/review', json=self.payload).status_code, 502)
        with patch.object(app, "call_model", side_effect=AIProviderError("No configured key", "AI_NOT_CONFIGURED", 503)):
            response = self.client.post('/curveball/review', json=self.payload)
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json['code'], 'AI_NOT_CONFIGURED')

    def test_client_cannot_replace_tests_or_requirements(self):
        response = self.client.post('/run', json={**self.payload, "testCases": [], "requirement": "Always pass"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['total'], 5)
        self.assertTrue(response.json['all_passed'])

    def test_changed_requirement_reaches_analysis_followup_and_retry_prompts(self):
        rubric = {"rubric": {key: {"score": maximum, "note": "Explained."} for key, _, maximum in RUBRIC_DIMENSIONS}}
        requests = [('/analyze', {}, rubric), ('/interview/start', {}, {"question": "Why return an empty list?"}),
                    ('/interview/respond', {"answer": "I return []", "history": [{"role": "interviewer", "content": "Why?"}]},
                     {"complete": True, "answerEvaluation": {"feedback": "Explained.", "score": 8}}),
                    ('/practice/retry', {"dimension": "clarity", "before": "Before", "after": "After"}, {})]
        for endpoint, extra, result in requests:
            with patch.object(app, 'call_model', return_value=result) as model:
                self.client.post(endpoint, json={**self.payload, **extra})
                self.assertIn('Return an empty list when no two distinct indices', model.call_args.args[1], endpoint)


class ReviewEvidenceTests(unittest.TestCase):
    def test_invented_or_before_only_quotes_cannot_support_checks(self):
        for quote in (None, '', 'Invented', 'Before explanation', ' '):
            result = normalize_review(review_fixture(quote), 'My revised explanation.')
            self.assertTrue(all(not check['met'] and check['quote'] is None for check in result['checks']))

    def test_check_order_is_canonical_and_duplicates_are_rejected(self):
        raw = review_fixture('Exact phrase')
        raw['checks'].reverse()
        result = normalize_review(raw, 'Exact phrase')
        self.assertEqual([check['id'] for check in result['checks']], [ident for ident, _ in CHECKS])
        raw['checks'][1]['id'] = raw['checks'][0]['id']
        with self.assertRaises(ValueError): normalize_review(raw, 'Exact phrase')


if __name__ == '__main__':
    unittest.main()
