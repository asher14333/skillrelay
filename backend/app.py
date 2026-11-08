from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from ai_provider import AIProviderError, call_model

from curveballs import normalize_review, review_prompt
from adaptive import checkpoint_prompt, normalize_checkpoint
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
from validation import RequestValidationError, conversation_history, normalize_followup, normalize_question, practice_context, problem_context, request_object, text_field

load_dotenv(Path(__file__).with_name(".env"))

app = Flask(__name__)
# The development UI normally uses Vite's same-origin /api proxy. Only the
# known local UI origins may call this loopback API directly from a browser.
# This is an origin boundary, not a sandbox for submitted Python code.
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024


@app.errorhandler(AIProviderError)
def ai_provider_error(error):
    return jsonify({"error": str(error), "code": error.code}), error.status


@app.errorhandler(RequestValidationError)
def request_validation_error(error):
    return jsonify({"error": str(error)}), 400


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "This practice request is too large. Shorten the code or explanation."}), 413


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
    goal = data.get("learningGoal", DEFAULT_GOAL)

    if not isinstance(goal, str) or goal not in LEARNING_GOALS:
        return jsonify({"error": "Choose a supported learning goal"}), 400

    try:
        moments = validate_moments(data.get("checkpoints"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    problem = problem_context(data)

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
    data = request_object()
    if not isinstance(data, dict):
        return jsonify({"error": "A practice response is required"}), 400
    dimension = data.get("dimension")
    if not isinstance(dimension, str) or dimension not in DIMENSIONS:
        return jsonify({"error": "Choose a supported practice skill"}), 400
    problem = problem_context(data)
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


@app.route("/interview/checkpoint", methods=["POST"])
def interview_checkpoint():
    data = request_object()
    problem, transcript, code = practice_context(data)
    allow_curveball = data.get("allowCurveball", True)
    if type(allow_curveball) is not bool:
        raise RequestValidationError("allowCurveball must be true or false.")
    if "curveballId" in problem:
        allow_curveball = False
    history = data.get("history", [])
    if not isinstance(history, list) or len(history) > 5:
        raise RequestValidationError("Live interview history must contain at most five turns.")
    turns = []
    for turn in history:
        if not isinstance(turn, dict) or turn.get("kind") not in ("question", "continue", "curveball"):
            raise RequestValidationError("Live interview history contains an invalid turn.")
        turns.append({"kind": turn["kind"], "text": text_field(turn, "text", required=True, limit=1200)})
    try:
        raw = call_model(
            "You are a careful live coding interviewer. Decide timing from evidence and return structured JSON only.",
            checkpoint_prompt(problem, code, transcript, turns, allow_curveball),
        )
        return jsonify(normalize_checkpoint(raw, problem, allow_curveball))
    except AIProviderError:
        raise
    except ValueError as exc:
        return jsonify({"error": str(exc), "code": "AI_INVALID_RESPONSE"}), 502
    except Exception:
        return jsonify({"error": "Could not check this interview moment. Your code and explanation are still here; try again."}), 502


@app.route("/interview/start", methods=["POST"])
def interview_start():
    data = request_object()
    problem, transcript, code = practice_context(data, transcript_required=True)

    try:
        result = call_model(
            (
                "You are a senior engineer conducting interview follow-ups. "
                "Ask one probing question. Respond with valid JSON only."
            ),
            build_interview_start_prompt(problem, transcript, code),
        )
        return jsonify(normalize_question(result))
    except AIProviderError:
        raise
    except Exception:
        return jsonify({"error": "Could not get AI feedback. Please try again."}), 502


@app.route("/interview/respond", methods=["POST"])
def interview_respond():
    data = request_object()
    problem, transcript, code = practice_context(data)
    answer = text_field(data, "answer", required=True)
    history, question_count = conversation_history(data)

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
        return jsonify(normalize_followup(result, answer, question_count))
    except AIProviderError:
        raise
    except Exception:
        return jsonify({"error": "Could not get AI feedback. Please try again."}), 502


@app.route("/run", methods=["POST"])
def run_code_route():
    data = request_object()
    problem, _, code = practice_context(data)
    if not code:
        raise RequestValidationError("Code is required.")
    result = run_code(problem["slug"], code, problem["curveballId"]) if "curveballId" in problem else run_code(problem["slug"], code)
    if "error" in result and "results" not in result:
        return jsonify(result), 400

    return jsonify(result)


@app.route("/curveball/review", methods=["POST"])
def review_curveball():
    data = request_object()
    problem, transcript, code = practice_context(data, transcript_required=True)
    if "curveballId" not in problem:
        raise RequestValidationError("Start an interview curveball before reviewing your adaptation.")
    if not code:
        raise RequestValidationError("Code is required.")
    before_code = text_field(data, "beforeCode", limit=MAX_CODE)
    before_transcript = text_field(data, "beforeTranscript")
    run = run_code(problem["slug"], code, problem["curveballId"])
    if "error" in run and "results" not in run:
        return jsonify(run), 400
    try:
        raw = call_model(
            "You are a careful interview communication coach. Review evidence fairly. Return JSON only.",
            review_prompt(problem, before_code, before_transcript, code, transcript, run),
        )
        return jsonify({"run": run, "feedback": normalize_review(raw, transcript)})
    except AIProviderError:
        raise
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        return jsonify({"error": "Could not review the requirement change. Your code and explanation are still available; try again."}), 502


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)
