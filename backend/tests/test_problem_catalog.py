"""Keep the practice UI, API catalog, and executable examples in agreement."""

import ast
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from problems import PROBLEMS
from runner import run_code


SOLUTIONS = {
    "two-sum": """class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for index, value in enumerate(nums):
            if target - value in seen:
                return [seen[target - value], index]
            seen[value] = index
""",
    "valid-parentheses": """class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        pairs = {')': '(', ']': '[', '}': '{'}
        for bracket in s:
            if bracket in pairs:
                if not stack or stack.pop() != pairs[bracket]:
                    return False
            else:
                stack.append(bracket)
        return not stack
""",
    "contains-duplicate": """class Solution:
    def hasDuplicate(self, nums: List[int]) -> bool:
        return len(set(nums)) != len(nums)
""",
    "best-time-to-buy-and-sell-stock": """class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        minimum = prices[0]
        profit = 0
        for price in prices[1:]:
            profit = max(profit, price - minimum)
            minimum = min(minimum, price)
        return profit
""",
    "maximum-subarray": """class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        current = best = nums[0]
        for number in nums[1:]:
            current = max(number, current + number)
            best = max(best, current)
        return best
""",
}


class ProblemCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        output = subprocess.run(
            ["node", "--input-type=module", "-e",
             "import {problems} from './frontend/src/data/problems.js'; console.log(JSON.stringify(problems))"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True, timeout=10,
        )
        cls.frontend = {item["slug"]: item for item in json.loads(output.stdout)}

    def test_all_problem_metadata_agrees_between_ui_and_backend(self):
        self.assertEqual(set(self.frontend), set(PROBLEMS))
        self.assertEqual(set(SOLUTIONS), set(PROBLEMS))
        for slug, problem in PROBLEMS.items():
            with self.subTest(problem=slug):
                for key in ("id", "slug", "title", "difficulty"):
                    self.assertEqual(self.frontend[slug][key], problem[key])

    def test_visible_cases_match_the_cases_executed_by_the_runner(self):
        for slug, problem in PROBLEMS.items():
            with self.subTest(problem=slug):
                inputs = [{key: case[key] for key in problem["args"]} for case in problem["test_cases"]]
                self.assertEqual(self.frontend[slug]["testCases"], inputs)

    def test_starter_methods_and_parameter_names_match_the_runner(self):
        for slug, problem in PROBLEMS.items():
            with self.subTest(problem=slug):
                tree = ast.parse(self.frontend[slug]["starterCode"])
                solution = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Solution")
                method = next(node for node in solution.body if isinstance(node, ast.FunctionDef) and node.name == problem["method"])
                self.assertEqual([arg.arg for arg in method.args.args], ["self", *problem["args"]])

    def test_real_runner_accepts_known_solutions_for_every_challenge(self):
        for slug, code in SOLUTIONS.items():
            with self.subTest(problem=slug):
                result = run_code(slug, code)
                self.assertNotIn("error", result, result)
                self.assertTrue(result["all_passed"], result)
                expected = len(PROBLEMS[slug]["test_cases"])
                self.assertEqual(result["passed"], expected)
                self.assertEqual(result["total"], expected)


if __name__ == "__main__":
    unittest.main()
