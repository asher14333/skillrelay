"""Curated learning activities selected from normalized interview feedback."""

LEARNING_GOALS = {
    "clear-explanations": (
        "clarity", "problemUnderstanding", "bruteForce", "optimization",
        "timeComplexity", "spaceComplexity",
    ),
    "technical-tradeoffs": (
        "timeComplexity", "spaceComplexity", "optimization", "bruteForce",
        "problemUnderstanding", "clarity",
    ),
    "interview-confidence": (
        "problemUnderstanding", "bruteForce", "clarity", "optimization",
        "timeComplexity", "spaceComplexity",
    ),
}

DEFAULT_GOAL = "clear-explanations"

LESSONS = {
    "problemUnderstanding": {
        "id": "restate-the-problem",
        "title": "Start with the problem, not the code",
        "minutes": 3,
        "steps": [
            "Describe the input and the output in one sentence.",
            "Walk through one example and name an important constraint.",
            "Check your understanding before explaining your solution.",
        ],
        "practicePrompt": "Explain the task to a teammate who has not read it yet.",
        "selfCheck": "Could your teammate describe a correct result without seeing your code?",
    },
    "bruteForce": {
        "id": "build-a-baseline",
        "title": "Explain a simple starting solution",
        "minutes": 3,
        "steps": [
            "Describe the most direct correct approach in plain language.",
            "Use a small example to show the work it repeats.",
            "Explain which limitation motivates a better approach.",
        ],
        "practicePrompt": "Describe a baseline solution, then explain what you would improve.",
        "selfCheck": "Did you explain why the baseline works and where it becomes expensive?",
    },
    "optimization": {
        "id": "explain-the-tradeoff",
        "title": "Make your optimization understandable",
        "minutes": 4,
        "steps": [
            "Identify one repeated operation in the starting approach.",
            "Explain the data structure or technique that avoids that work.",
            "Walk through a small example and name the trade-off you made.",
        ],
        "practicePrompt": "Explain why your chosen approach improves on the baseline.",
        "selfCheck": "Could a listener explain both the benefit and the cost of your choice?",
    },
    "timeComplexity": {
        "id": "reason-about-runtime",
        "title": "Explain runtime from the work performed",
        "minutes": 3,
        "steps": [
            "Define what n represents for this problem.",
            "Count how often the main operations run as n grows.",
            "State the time complexity and justify it from those operations.",
        ],
        "practicePrompt": "Explain how your solution's work changes when the input doubles.",
        "selfCheck": "Did you justify the complexity rather than only naming a Big-O value?",
    },
    "spaceComplexity": {
        "id": "account-for-memory",
        "title": "Account for the memory your solution uses",
        "minutes": 3,
        "steps": [
            "List the extra collections, variables, and any recursion stack.",
            "Explain which of them can grow with the input.",
            "State the extra space complexity and explain the main contributor.",
        ],
        "practicePrompt": "Explain the extra memory your solution needs as the input grows.",
        "selfCheck": "Did you distinguish the input itself from the extra memory you allocate?",
    },
    "clarity": {
        "id": "structure-your-explanation",
        "title": "Give your explanation a clear structure",
        "minutes": 3,
        "steps": [
            "Open with the problem and your main idea in two short sentences.",
            "Walk through one example in the order your solution handles it.",
            "Close with why it works and its time and space costs.",
        ],
        "practicePrompt": "Give a 60-second explanation: problem, approach, example, and costs.",
        "selfCheck": "Could a listener follow your reasoning without reading your code?",
    },
}


def build_learning_plan(feedback: dict, problem: dict, goal: str = DEFAULT_GOAL) -> dict:
    """Select the lowest score/max ratio, using the learner goal to break ties."""
    if goal not in LEARNING_GOALS:
        raise ValueError("Unsupported learning goal")

    priorities = LEARNING_GOALS[goal]
    rubric = feedback["rubric"]
    dimension = min(priorities, key=lambda key: rubric[key]["score"] / rubric[key]["max"])
    item = rubric[dimension]
    if all(rubric[key]["score"] >= rubric[key]["max"] for key in priorities):
        return {
            "id": "transfer-your-skills",
            "dimension": None,
            "title": "Apply your explanation skills to another challenge",
            "minutes": 5,
            "reason": "You covered every rubric dimension in this practice attempt. Try transferring that structure to a different problem.",
            "steps": [
                "Choose a different challenge and identify what makes it different.",
                "Explain the problem, a baseline, your approach, and its costs.",
                "Use the next feedback to choose what to practice again.",
            ],
            "practicePrompt": "Apply your explanation structure to a different coding challenge.",
            "selfCheck": "Can you explain a new problem with the same level of detail?",
            "action": "transfer",
        }

    lesson = LESSONS[dimension]
    return {
        **lesson,
        "steps": list(lesson["steps"]),
        "dimension": dimension,
        "reason": (
            f"{item['label'] if 'label' in item else _dimension_label(dimension)} "
            f"scored {item['score']:g}/{item['max']:g}, one of your lowest relative scores. "
            "Your learning goal sets the priority when scores are tied."
        ),
        "practicePrompt": f"For {problem['title']}: {lesson['practicePrompt']}",
        "action": "retry",
    }


def _dimension_label(dimension: str) -> str:
    return {
        "problemUnderstanding": "Problem understanding",
        "bruteForce": "Baseline approach",
        "optimization": "Optimization",
        "timeComplexity": "Time complexity",
        "spaceComplexity": "Space complexity",
        "clarity": "Communication clarity",
    }[dimension]
