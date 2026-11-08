"""Validate request and interview model shapes before they reach the UI."""

import math

from flask import request

from curveballs import get_problem_variant
from replay import MAX_CODE, MAX_TRANSCRIPT


class RequestValidationError(ValueError):
    pass


def request_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise RequestValidationError("Send a JSON object with your practice input.")
    return data


def text_field(data, name, *, required=False, limit=MAX_TRANSCRIPT):
    value = data.get(name, "")
    if not isinstance(value, str):
        raise RequestValidationError(f"{name} must be text.")
    if len(value) > limit:
        raise RequestValidationError(f"{name} exceeds the {limit:,}-character limit.")
    value = value.strip()
    if required and not value:
        raise RequestValidationError(f"{name} is required.")
    return value


def problem_context(data):
    try:
        return get_problem_variant(data.get("problemId", "two-sum"), data.get("curveballId"))
    except ValueError as exc:
        raise RequestValidationError(str(exc)) from exc


def practice_context(data, *, transcript_required=False):
    problem = problem_context(data)
    transcript = text_field(data, "transcript", required=transcript_required)
    code = text_field(data, "code", limit=MAX_CODE)
    return problem, transcript, code


def conversation_history(data):
    history = data.get("history", [])
    if not isinstance(history, list) or len(history) > 9:
        raise RequestValidationError("Follow-up history must contain at most nine messages.")
    result = []
    for message in history:
        if not isinstance(message, dict) or message.get("role") not in ("interviewer", "candidate", "evaluation"):
            raise RequestValidationError("Follow-up history contains an invalid message.")
        content = text_field(message, "content", required=True)
        result.append({"role": message["role"], "content": content})
    question_count = sum(message["role"] == "interviewer" for message in result)
    if question_count == 0 or question_count > 3:
        raise RequestValidationError("Answer one of the interviewer's three follow-up questions.")
    if not result or result[-1]["role"] != "interviewer":
        raise RequestValidationError("The latest follow-up message must be an interviewer question.")
    return result, question_count


def _model_text(value, label, *, limit=2400):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f"The interviewer returned an invalid {label}. Please try again.")
    return value.strip()


def normalize_question(raw):
    if not isinstance(raw, dict):
        raise ValueError("The interviewer returned an invalid response. Please try again.")
    return {"question": _model_text(raw.get("question"), "question")}


def normalize_followup(raw, answer, question_count):
    if not isinstance(raw, dict) or not isinstance(raw.get("answerEvaluation"), dict):
        raise ValueError("The interviewer did not evaluate the answer. Please try again.")
    evaluation = raw["answerEvaluation"]
    feedback = _model_text(evaluation.get("feedback"), "answer evaluation")
    score = evaluation.get("score")
    if score is not None and (type(score) not in (int, float) or not math.isfinite(score) or not 0 <= score <= 10):
        raise ValueError("The interviewer returned an invalid score. Please try again.")
    quote = evaluation.get("quote")
    quote = quote if isinstance(quote, str) and quote.strip() and quote in answer and len(quote) <= 2000 else None
    if question_count < 3 and type(raw.get("complete")) is not bool:
        raise ValueError("The interviewer returned an incomplete response. Please try again.")
    complete = question_count >= 3 or raw.get("complete") is True
    question = None if complete else _model_text(raw.get("nextQuestion"), "next question")
    note = raw.get("overallNote")
    note = note.strip()[:2400] if complete and isinstance(note, str) and note.strip() else None
    return {"complete": complete, "answerEvaluation": {"score": score, "feedback": feedback, "quote": quote},
            "nextQuestion": question, "overallNote": note}
