import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from learning import DEFAULT_GOAL, LEARNING_GOALS, LESSONS, build_learning_plan
from prompts import RUBRIC_DIMENSIONS


def feedback(ratio=1):
    return {"rubric": {
        key: {"score": maximum * ratio, "max": maximum}
        for key, _, maximum in RUBRIC_DIMENSIONS
    }}


class LearningPlanTests(unittest.TestCase):
    problem = {"title": "Two Sum"}

    def test_compares_ratios_instead_of_raw_scores(self):
        result = feedback()
        result["rubric"]["clarity"]["score"] = 0.8
        result["rubric"]["timeComplexity"]["score"] = 0.5
        self.assertEqual(build_learning_plan(result, self.problem)["dimension"], "clarity")

    def test_each_goal_breaks_ties_by_its_priority(self):
        for goal, priorities in LEARNING_GOALS.items():
            with self.subTest(goal=goal):
                plan = build_learning_plan(feedback(0.5), self.problem, goal)
                self.assertEqual(plan["dimension"], priorities[0])
                self.assertEqual(plan["action"], "retry")

    def test_each_dimension_has_a_specific_lesson(self):
        for key, lesson in LESSONS.items():
            with self.subTest(key=key):
                result = feedback()
                result["rubric"][key]["score"] = 0
                plan = build_learning_plan(result, self.problem)
                self.assertEqual(plan["id"], lesson["id"])
                self.assertIn("Two Sum", plan["practicePrompt"])
                self.assertGreaterEqual(len(plan["steps"]), 2)

    def test_full_scores_receive_transfer_practice(self):
        plan = build_learning_plan(feedback(), self.problem)
        self.assertEqual(plan["action"], "transfer")
        self.assertIsNone(plan["dimension"])

    def test_invalid_goal_is_rejected(self):
        with self.assertRaises(ValueError):
            build_learning_plan(feedback(), self.problem, "made-up")

    def test_callers_cannot_mutate_catalog_steps(self):
        plan = build_learning_plan(feedback(0), self.problem)
        plan["steps"].append("mutation")
        self.assertNotIn("mutation", LESSONS["clarity"]["steps"])


class AnalyzeLearningTests(unittest.TestCase):
    def setUp(self):
        import app
        self.module = app
        self.client = app.app.test_client()
        self.request = {
            "problemId": "two-sum",
            "transcript": "I will find two array indices that sum to the target number and return them using a hash map in one pass with linear time and extra space.",
            "code": "class Solution: pass",
        }

    def test_default_goal_preserves_existing_analysis_fields(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(
            self.module, "call_model", return_value=feedback(0)
        ) as model:
            response = self.client.post("/analyze", json=self.request)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        for key in ("score", "rubric", "strengths", "improvements", "passed"):
            self.assertIn(key, data)
        self.assertEqual(data["learningGoal"], DEFAULT_GOAL)
        self.assertEqual(data["learningPlan"]["dimension"], "clarity")
        model.assert_called_once()

    def test_selected_goal_reaches_recommendation(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "test-only"}), patch.object(
            self.module, "call_model", return_value=feedback(0)
        ):
            response = self.client.post("/analyze", json={
                **self.request, "learningGoal": "technical-tradeoffs",
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["learningPlan"]["dimension"], "timeComplexity")

    def test_invalid_goals_fail_before_model_call(self):
        for goal in ("unknown", [], None, 3):
            with self.subTest(goal=goal), patch.object(self.module, "call_model") as model:
                response = self.client.post("/analyze", json={**self.request, "learningGoal": goal})
                self.assertEqual(response.status_code, 400)
                model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
