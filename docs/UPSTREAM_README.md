# SpeakCode

Voice-first AI coding interview coach. Practice explaining LeetCode solutions out loud, write code, run test cases, and get rubric-based feedback with interview follow-ups.

## Features

- **5 problems** — Two Sum, Valid Parentheses, Contains Duplicate, Best Time to Buy and Sell Stock, Maximum Subarray
- **Monaco editor** — syntax highlighting, line numbers, LeetCode-style Run console
- **Rubric scoring** — 6-dimension breakdown with quote-backed strengths
- **Interview follow-up mode** — AI asks up to 3 probing follow-up questions
- **Voice explanation** — Web Speech API with transcript review

## Prerequisites

- Node.js 18+
- Python 3.10+
- OpenAI API key
- Chrome or Edge (for Web Speech API)

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add OPENAI_API_KEY to .env
python app.py
```

Backend runs at `http://127.0.0.1:5001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API

**GET /problems** — list available problems

**POST /run** — `{ "code": "...", "problemId": "two-sum" }`

**POST /analyze** — `{ "transcript": "...", "code": "...", "problemId": "two-sum" }`

Returns rubric breakdown, quote-backed strengths, and improvements.

**POST /interview/start** — `{ "transcript": "...", "code": "...", "problemId": "two-sum" }`

**POST /interview/respond** — `{ "history": [...], "answer": "...", ... }`

## Workflow

1. Pick a problem from the dropdown
2. Write your solution in the Monaco editor
3. Click **Run** to test against cases
4. Click **Start Explanation** and explain your approach
5. Click **Analyze Interview** for rubric feedback
6. Open **Interview** tab for follow-up questions
