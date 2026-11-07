import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI

from problems import get_problem
from prompts import (
    build_analyze_prompt,
    build_interview_prompt,
    build_interview_start_prompt,
    normalize_feedback,
)
from runner import run_code

load_dotenv()

app = Flask(__name__)
CORS(app)


def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def call_openai(system: str, user: str) -> dict:
    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


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
    data = request.get_json() or {}
    transcript = data.get("transcript", "").strip()
    code = data.get("code", "").strip()
    slug = data.get("problemId", "two-sum")

    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    problem = get_problem(slug)
    if not problem:
        return jsonify({"error": f"Unknown problem: {slug}"}), 400

    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"error": "OPENAI_API_KEY is not configured"}), 500

    try:
        result = call_openai(
            (
                "You are a fair technical interviewer. Score each rubric dimension "
                "independently. Notes must match scores: max score = positive note, "
                "zero score = what was missing. Never contradict yourself. "
                "Respond with valid JSON only."
            ),
            build_analyze_prompt(problem, transcript, code),
        )
        return jsonify(normalize_feedback(result, transcript))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"error": "OPENAI_API_KEY is not configured"}), 500

    try:
        result = call_openai(
            (
                "You are a senior engineer conducting interview follow-ups. "
                "Ask one probing question. Respond with valid JSON only."
            ),
            build_interview_start_prompt(problem, transcript, code),
        )
        return jsonify({"question": result.get("question", "")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"error": "OPENAI_API_KEY is not configured"}), 500

    updated_history = history + [
        {"role": "candidate", "content": answer},
    ]

    try:
        result = call_openai(
            (
                "You are a senior engineer evaluating follow-up answers. "
                "Be fair and specific. Respond with valid JSON only."
            ),
            build_interview_prompt(problem, transcript, updated_history, code),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
