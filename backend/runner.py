import json
import subprocess
import sys
import tempfile
from pathlib import Path

from curveballs import get_problem_variant

RUN_TIMEOUT_SECONDS = 5
RESULT_MARKER = "__SKILLRELAY_RESULTS__="

VALIDATORS = {
    "equals": """
def validate(result, expected, case):
    if result != expected:
        return False, f"Expected {expected!r}, got {result!r}"
    return True, None
""",
    "two_sum": """
def validate(result, expected, case):
    nums = case["nums"]
    target = case["target"]
    if not isinstance(result, list):
        return False, f"Expected list, got {type(result).__name__}"
    if expected == []:
        return (True, None) if result == [] else (False, "Expected [] when no matching pair exists")
    if len(result) != 2:
        return False, f"Expected 2 indices, got {len(result)}"
    i, j = result
    if i == j:
        return False, "Cannot use the same index twice"
    if not (0 <= i < len(nums) and 0 <= j < len(nums)):
        return False, f"Index out of bounds: {result}"
    if nums[i] + nums[j] != target:
        return False, f"{nums[i]} + {nums[j]} != {target}"
    return True, None
""",
}

HARNESS_TEMPLATE = '''
from typing import List
import json

{user_code}

{validator_code}

TEST_CASES = {test_cases}
METHOD = "{method}"
ARGS = {args}

def format_input(case):
    parts = []
    for arg in ARGS:
        parts.append(f"{{arg}} = {{case[arg]!r}}")
    return ", ".join(parts)

results = []
solution = Solution()

for index, case in enumerate(TEST_CASES):
    expected = case["expected"]
    entry = {{
        "case": index + 1,
        "input": format_input(case),
        "expected": expected,
    }}
    try:
        call_args = []
        for arg in ARGS:
            val = case[arg]
            call_args.append(list(val) if isinstance(val, list) else val)
        result = getattr(solution, METHOD)(*call_args)
        entry["output"] = result
        passed, message = validate(result, expected, case)
        entry["passed"] = passed
        if not passed:
            entry["error"] = message
    except Exception as exc:
        entry["passed"] = False
        entry["output"] = None
        entry["error"] = str(exc)
    results.append(entry)

print("{result_marker}" + json.dumps(results))
'''


def run_code(slug: str, code: str, curveball_id=None) -> dict:
    try:
        problem = get_problem_variant(slug, curveball_id)
    except ValueError as exc:
        return {"error": str(exc)}

    if not code.strip():
        return {"error": "No code provided"}

    validator = problem.get("validator", "equals")
    validator_code = VALIDATORS.get(validator, VALIDATORS["equals"])

    harness = HARNESS_TEMPLATE.format(
        user_code=code,
        validator_code=validator_code,
        test_cases=repr(problem["test_cases"]),
        method=problem["method"],
        args=repr(problem["args"]),
        result_marker=RESULT_MARKER,
    )

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(harness)
        tmp_path = tmp.name

    try:
        completed = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"error": f"Execution timed out after {RUN_TIMEOUT_SECONDS}s"}
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()
        return {"error": stderr or "Code failed to run"}

    try:
        # A learner's print() diagnostics are useful during practice and must
        # not make an otherwise correct solution look like a runner failure.
        _, marker, payload = completed.stdout.rpartition(RESULT_MARKER)
        if not marker:
            return {"error": "Code did not return test results"}
        results = json.loads(payload.strip())
    except json.JSONDecodeError:
        return {"error": "Could not parse execution output"}

    if not isinstance(results, list) or len(results) != len(problem["test_cases"]) or any(not isinstance(item, dict) for item in results):
        return {"error": "Code returned incomplete test results"}

    passed_count = sum(1 for r in results if r.get("passed"))
    return {
        "results": results,
        "passed": passed_count,
        "total": len(results),
        "all_passed": passed_count == len(results),
    }
