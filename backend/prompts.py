import re

RUBRIC_DIMENSIONS = [
    ("problemUnderstanding", "Problem Understanding", 2),
    ("bruteForce", "Brute Force Approach", 2),
    ("optimization", "Optimized Approach", 2),
    ("timeComplexity", "Time Complexity", 1),
    ("spaceComplexity", "Space Complexity", 1),
    ("clarity", "Communication Clarity", 2),
]

RUBRIC_MAX = {key: max_score for key, _, max_score in RUBRIC_DIMENSIONS}

STARTER_MARKERS = ("# Write your solution here", "pass\n", "pass\r")

NEGATIVE_NOTE_PATTERNS = (
    "did not",
    "didn't",
    "failed",
    "no mention",
    "not mention",
    "without",
    "lack",
    "missing",
    "never",
    "unable",
)

IMPROVEMENT_TOPIC_KEYWORDS = {
    "problemUnderstanding": ("problem statement", "understand the problem", "articulate the problem", "restate the problem"),
    "bruteForce": ("brute force", "brute-force", "every pair", "o(n²)", "o(n^2)"),
    "optimization": ("optimiz", "hash map", "hashmap", "better approach"),
    "timeComplexity": ("time complexity", "time complex", "o(n) time", "runtime"),
    "spaceComplexity": ("space complexity", "space complex", "extra space", "memory"),
    "clarity": ("clearer", "filler", "structure", "unclear", "articulate"),
}


def is_starter_code(code: str) -> bool:
    return not code or any(marker in code for marker in STARTER_MARKERS)


def quote_in_transcript(quote: str | None, transcript: str) -> bool:
    if not quote or not transcript:
        return False
    return quote.strip().lower() in transcript.lower()


def fix_note(score: float, max_score: float, note: str) -> str:
    note = (note or "").strip()
    is_full = score >= max_score
    is_zero = score <= 0

    if is_full and any(p in note.lower() for p in NEGATIVE_NOTE_PATTERNS):
        return "Clearly addressed this dimension."

    if is_zero and not note:
        return "Not addressed in the explanation."

    if is_zero and not any(p in note.lower() for p in NEGATIVE_NOTE_PATTERNS + ("not", "no ")):
        return f"Not adequately covered. {note}"

    return note


def transcript_supports_dimension(key: str, transcript: str) -> bool:
    t = transcript.lower()
    words = t.split()

    if key == "bruteForce":
        return any(
            k in t
            for k in (
                "brute",
                "force",
                "every pair",
                "nested",
                "o(n²)",
                "o(n^2)",
                "n squared",
                "quadratic",
                "two loop",
                "double loop",
            )
        )
    if key == "timeComplexity":
        return any(
            k in t
            for k in (
                "time complexity",
                "time complex",
                "o(n)",
                "o(1)",
                "o(n²)",
                "o(n^2)",
                "linear time",
                "constant time",
                "quadratic time",
                "one pass",
                "single pass",
            )
        )
    if key == "spaceComplexity":
        return any(
            k in t
            for k in (
                "space complexity",
                "space complex",
                "extra space",
                "memory",
                "o(n) space",
                "auxiliary",
            )
        )
    if key == "optimization":
        return any(
            k in t
            for k in ("hash", "optim", "map", "set", "pointer", "sort", "complement")
        )
    if key == "problemUnderstanding":
        return len(words) >= 12 and any(
            k in t for k in ("array", "target", "sum", "indices", "find", "return", "number")
        )
    if key == "clarity":
        blah_count = len(re.findall(r"\bblah\b", t))
        filler_ratio = blah_count / max(len(words), 1)
        return filler_ratio < 0.15 and len(words) >= 15

    return False


def apply_transcript_caps(rubric: dict, transcript: str) -> None:
    for key, _, max_score in RUBRIC_DIMENSIONS:
        if transcript_supports_dimension(key, transcript):
            continue
        item = rubric[key]
        if item["score"] > 0:
            item["score"] = 0
            item["quote"] = None
            item["note"] = "Not addressed in the explanation."


def improvement_conflicts_with_rubric(text: str, rubric: dict) -> bool:
    lower = text.lower()
    for key, keywords in IMPROVEMENT_TOPIC_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            item = rubric.get(key, {})
            if item.get("score", 0) >= item.get("max", 0):
                return True
    return False


def normalize_feedback(result: dict, transcript: str) -> dict:
    raw_rubric = result.get("rubric") or {}
    rubric = {}

    for key, label, max_score in RUBRIC_DIMENSIONS:
        item = raw_rubric.get(key) or {}
        try:
            score = float(item.get("score", 0))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(max_score, score))

        quote = item.get("quote")
        if quote and not quote_in_transcript(quote, transcript):
            quote = None

        rubric[key] = {
            "score": score,
            "max": max_score,
            "quote": quote,
            "note": fix_note(score, max_score, item.get("note", "")),
        }

    apply_transcript_caps(rubric, transcript)

    # Re-sync notes after caps
    for key, _, max_score in RUBRIC_DIMENSIONS:
        item = rubric[key]
        item["note"] = fix_note(item["score"], max_score, item["note"])

    total = sum(item["score"] for item in rubric.values())

    strengths = []
    for item in result.get("strengths") or []:
        if isinstance(item, str):
            text, quote = item, None
        else:
            text = item.get("text", "")
            quote = item.get("quote")
        if quote and not quote_in_transcript(quote, transcript):
            quote = None
        if text:
            strengths.append({"text": text, "quote": quote})

    improvements = []
    for item in result.get("improvements") or []:
        text = item if isinstance(item, str) else item.get("text", "")
        if not text:
            continue
        if improvement_conflicts_with_rubric(text, rubric):
            continue
        improvements.append({"text": text, "quote": None})

    # Add improvements for any dimension not at full marks
    existing = {i["text"].lower() for i in improvements}
    dimension_hints = {
        "problemUnderstanding": "Restate the problem clearly before diving into your solution.",
        "bruteForce": "Explain the brute force approach and why it is inefficient.",
        "optimization": "Walk through your optimized approach step by step.",
        "timeComplexity": "State the time complexity and justify it.",
        "spaceComplexity": "Discuss the space complexity.",
        "clarity": "Structure your explanation more clearly with less filler.",
    }
    all_improvement_text = " ".join(i["text"].lower() for i in improvements)
    for key, _, max_score in RUBRIC_DIMENSIONS:
        item = rubric[key]
        if item["score"] < max_score:
            if any(kw in all_improvement_text for kw in IMPROVEMENT_TOPIC_KEYWORDS.get(key, ())):
                continue
            hint = dimension_hints[key]
            if hint.lower() not in existing:
                improvements.append({"text": hint, "quote": None})
                existing.add(hint.lower())
                all_improvement_text += " " + hint.lower()

    return {
        "score": round(total, 1),
        "passed": total >= 7,
        "rubric": rubric,
        "strengths": strengths[:4],
        "improvements": improvements[:4],
    }


def build_analyze_prompt(problem: dict, transcript: str, code: str) -> str:
    code_section = ""
    if code and not is_starter_code(code):
        code_section = f"\n\nCandidate's code:\n```\n{code}\n```"

    rubric_spec = "\n".join(
        f"  {key} (max {max_score}): {label}"
        for key, label, max_score in RUBRIC_DIMENSIONS
    )

    return f"""You are a senior software engineer scoring a coding interview explanation.

Problem: {problem["title"]}
{problem["description"]}

Candidate explanation (evaluate ONLY what is here):
\"\"\"
{transcript}
\"\"\"{code_section}

Score these dimensions independently (total max = 10):
{rubric_spec}

Scoring guide per dimension:
- 0 = not mentioned or completely wrong
- partial = mentioned briefly or with gaps (use appropriate fraction of max)
- max = clearly and correctly explained

MANDATORY consistency rules (violations are errors):
1. If score equals max, "note" MUST be positive (what they did well). NEVER say "did not" or "failed" in a max-score note.
2. If score is 0, "note" MUST say what was missing. Do not give max score with a negative note.
3. "quote" must be an EXACT substring of the candidate explanation, or null.
4. Do NOT give credit for something not in the transcript. If they said "blah blah" or filler, score clarity 0 and overall low.
5. "score" in the response MUST equal the sum of all rubric dimension scores.
6. "improvements" must ONLY cover dimensions that did NOT receive full marks. Never suggest improving something already scored at max.
7. Each strength needs a real quote from the transcript.

Return JSON:
{{
  "rubric": {{
    "problemUnderstanding": {{ "score": 0, "quote": null, "note": "..." }},
    "bruteForce": {{ "score": 0, "quote": null, "note": "..." }},
    "optimization": {{ "score": 0, "quote": null, "note": "..." }},
    "timeComplexity": {{ "score": 0, "quote": null, "note": "..." }},
    "spaceComplexity": {{ "score": 0, "quote": null, "note": "..." }},
    "clarity": {{ "score": 0, "quote": null, "note": "..." }}
  }},
  "strengths": [{{ "text": "...", "quote": "..." }}],
  "improvements": [{{ "text": "..." }}]
}}

Return ONLY valid JSON."""


def build_interview_prompt(problem: dict, transcript: str, history: list, code: str) -> str:
    code_section = ""
    if code and not is_starter_code(code):
        code_section = f"\n\nCandidate's code:\n```\n{code}\n```"

    history_text = ""
    if history:
        history_text = "\n\nFollow-up conversation so far:\n"
        for msg in history:
            if msg.get("role") == "evaluation":
                history_text += f"Feedback: {msg['content']}\n"
                continue
            role = "Interviewer" if msg["role"] == "interviewer" else "Candidate"
            history_text += f"{role}: {msg['content']}\n"

    interviewer_count = sum(
        1 for msg in history if msg.get("role") == "interviewer"
    )
    at_limit = interviewer_count >= 3

    return f"""You are a senior engineer conducting a live coding interview follow-up.

Problem: {problem["title"]}
{problem["description"]}

Candidate's initial explanation:
{transcript}{code_section}{history_text}

Your task:
- Evaluate the candidate's latest answer (the last Candidate message).
- If fewer than 3 follow-ups have been asked and the answer warrants more probing, ask ONE new follow-up question.
- If 3 questions have already been asked ({interviewer_count} so far), set complete=true and do not ask another question.
{"- You have already asked 3 questions. Set complete=true." if at_limit else ""}

Return JSON:
{{
  "complete": <boolean>,
  "answerEvaluation": {{
    "score": <1-10 or null>,
    "feedback": "<brief feedback or null>",
    "quote": "<exact phrase from latest answer or null>"
  }},
  "nextQuestion": "<next question or null if complete>",
  "overallNote": "<summary when complete, else null>"
}}

Return ONLY valid JSON."""


def build_interview_start_prompt(problem: dict, transcript: str, code: str) -> str:
    code_section = ""
    if code and not is_starter_code(code):
        code_section = f"\n\nCandidate's code:\n```\n{code}\n```"

    return f"""You are a senior engineer starting the follow-up portion of a coding interview.

Problem: {problem["title"]}
{problem["description"]}

Candidate's initial explanation:
{transcript}{code_section}

Ask ONE insightful follow-up question based on gaps or interesting choices in their explanation.

Return JSON:
{{ "question": "<follow-up question>" }}

Return ONLY valid JSON."""
