from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from ai_provider import AIProviderError, call_model

from problems import get_problem
from learning import DEFAULT_GOAL, LEARNING_GOALS, build_learning_plan
from prompts import (
    build_analyze_prompt,
    build_interview_prompt,
    build_interview_start_prompt,
    normalize_feedback,
)
from runner import run_code
from replay import CRITERIA, DIMENSIONS, MAX_CODE, MAX_TRANSCRIPT, normalize_insights, normalize_retry, replay_prompt, retry_prompt, validate_moments
from learning import LESSONS

load_dotenv(Path(__file__).with_name(".env"))

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024


@app.errorhandler(AIProviderError)
def ai_provider_error(error):
    return jsonify({"error": str(error), "code": error.code}), error.status


@app.route("/problems", methods=["GET"])
def list_problems():
    from problems import PROBLEMS

    return jsonify(
        [
            {
                "id": p["id"],
                "slug": p["slug"],
                "title": p["title"],
                "difficulty": p["difficulty"],
            }
            for p in PROBLEMS.values()
        ]
    )


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A practice session is required"}), 400
    transcript, code = data.get("transcript", ""), data.get("code", "")
    if not isinstance(transcript, str) or not isinstance(code, str):
        return jsonify({"error": "Code and explanation must be text"}), 400
    if len(transcript) > MAX_TRANSCRIPT or len(code) > MAX_CODE:
        return jsonify({"error": "The session exceeds 12,000 code characters or 6,000 explanation characters"}), 400
    transcript, code = transcript.strip(), code.strip()
    slug = data.get("problemId", "two-sum")
    goal = data.get("learningGoal", DEFAULT_GOAL)

    if not isinstance(goal, str) or goal not in LEARNING_GOALS:
        return jsonify({"error": "Choose a supported learning goal"}), 400

    try:
        moments = validate_moments(data.get("checkpoints"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    problem = get_problem(slug) if isinstance(slug, str) else None
    if not problem:
        return jsonify({"error": f"Unknown problem: {slug}"}), 400

    try:
        result = call_model(
            (
                "You are a fair technical interviewer. Score each rubric dimension "
                "independently. Notes must match scores: max score = positive note, "
                "zero score = what was missing. Never contradict yourself. "
                "Respond with valid JSON only."
            ),
            build_analyze_prompt(problem, transcript, code) + replay_prompt(moments),
        )
        feedback = normalize_feedback(result, transcript)
        feedback["learningGoal"] = goal
        feedback["learningPlan"] = build_learning_plan(feedback, problem, goal)
        feedback["replayInsights"] = normalize_insights(result.get("replayInsights"), moments)
        feedback["focusedPractice"] = {key: {"prompt": f"For {problem['title']}: {LESSONS[key]['practicePrompt']}",
                                            "criteria": [{"id": ident, "label": label} for ident, label in checks]}
                                       for key, checks in CRITERIA.items()}
        return jsonify(feedback)
    except AIProviderError:
        raise
    except Exception:
        return jsonify({"error": "Could not get AI feedback. Please try again."}), 502


@app.route("/practice/retry", methods=["POST"])
def focused_retry():
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "A practice response is required"}), 400
    dimension = data.get("dimension")
    if not isinstance(dimension, str) or dimension not in DIMENSIONS:
        return jsonify({"error": "Choose a supported practice skill"}), 400
    slug = data.get("problemId")
    problem = get_problem(slug) if isinstance(slug, str) else None
    if not problem:
        return jsonify({"error": "Choose a supported problem"}), 400
    before, after, code = data.get("before"), data.get("after"), data.get("code", "")
    if not all(isinstance(value, str) for value in (before, after, code)) or not after.strip():
        return jsonify({"error": "An original explanation and a non-empty retry answer are required"}), 400
    if len(before) > MAX_TRANSCRIPT or len(after) > MAX_TRANSCRIPT or len(code) > MAX_CODE:
        return jsonify({"error": "The practice answer or code exceeds the session limit"}), 400
    try:
        raw = call_model("You are a careful communication coach. Return evidence-based JSON only.", retry_prompt(problem, dimension, before, after, code))
        return jsonify(normalize_retry(raw, dimension, before, after))
    except AIProviderError:
        raise
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        return jsonify({"error": "Could not compare the practice answers. Try again."}), 502


@app.route("/interview/start", methods=["POST"])
def interview_start():
    data = request.get_json() or {}
    transcript = data.get("transcript", "").strip()
    code = data.get("code", "").strip()
    slug = data.get("problemId", "two-sum")

    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    problem = get_problem(slug)
    if not problem:
        return jsonify({"error": f"Unknown problem: {slug}"}), 400

    try:
        result = call_model(
            (
                "You are a senior engineer conducting interview follow-ups. "
                "Ask one probing question. Respond with valid JSON only."
            ),
            build_interview_start_prompt(problem, transcript, code),
        )
        return jsonify({"question": result.get("question", "")})
    except AIProviderError:
        raise
    except Exception:
        return jsonify({"error": "Could not get AI feedback. Please try again."}), 502


@app.route("/interview/respond", methods=["POST"])
def interview_respond():
    data = request.get_json() or {}
    transcript = data.get("transcript", "").strip()
    code = data.get("code", "").strip()
    slug = data.get("problemId", "two-sum")
    history = data.get("history", [])
    answer = data.get("answer", "").strip()

    if not answer:
        return jsonify({"error": "Answer is required"}), 400

    problem = get_problem(slug)
    if not problem:
        return jsonify({"error": f"Unknown problem: {slug}"}), 400

    updated_history = history + [
        {"role": "candidate", "content": answer},
    ]

    try:
        result = call_model(
            (
                "You are a senior engineer evaluating follow-up answers. "
                "Be fair and specific. Respond with valid JSON only."
            ),
            build_interview_prompt(problem, transcript, updated_history, code),
        )
        return jsonify(result)
    except AIProviderError:
        raise
    except Exception:
        return jsonify({"error": "Could not get AI feedback. Please try again."}), 502


@app.route("/run", methods=["POST"])
def run_code_route():
    data = request.get_json() or {}
    code = data.get("code", "").strip()
    slug = data.get("problemId", "two-sum")

    if not code:
        return jsonify({"error": "No code provided"}), 400

    result = run_code(slug, code)
    if "error" in result and "results" not in result:
        return jsonify(result), 400

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)
