# SkillRelay

**Practice skills. Explain your thinking. Connect with people who help you grow.**

SkillRelay helps early-career developers practice explaining technical work and
turn interview feedback into a concrete next learning step. Based on SpeakCode,
it targets Code the Change YYC **Prompt 2**, particularly communication,
career readiness, and AI-assisted skilling.

## Practice, learn, and track your next step

- Five coding practice problems with a Monaco editor and Python test runner.
- Spoken explanations with transcript review.
- AI rubric feedback and interview follow-up questions.
- Three learning goals: clear explanations, technical trade-offs, and interview
  confidence.
- Six curated micro-lessons, recommended from normalized rubric gaps. Your goal
  breaks ties; lesson selection adds no extra model request.
- A retry action that preserves your explanation and code while showing a
  concrete practice prompt.
- Saved practice summaries and score comparisons for the same problem and goal.

Choose a goal, solve a challenge, explain your thinking, and analyze it. Save
your feedback, practice the recommended lesson, then save another attempt to
compare practice scores. AI scores are learning signals, not credentials.

History is saved in this browser, up to 100 attempts. Code and transcripts are
not included in saved summaries. Cloud synchronization, portfolios, and peer
matching are future work. See the [implementation plan](docs/IMPLEMENTATION_PLAN.md)
and [demo walkthrough](docs/DEMO.md).

The interface uses a light reading workspace, a locally bundled dark code
editor, and self-hosted Manrope typography. See [design direction](docs/DESIGN.md)
for the palette, layout decisions, and UI/UX guidance applied.

## Run locally

Use Node.js 22.14+ (the tested version), Python 3.10+, and an OpenAI
API key. Chrome or Edge supports the inherited voice workflow.

Backend:

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENAI_API_KEY in .env.
python app.py
```

Frontend, in another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open the frontend at `http://localhost:5173`; the backend uses
`http://127.0.0.1:5001`. AI feedback requires the API key. Keep `.env` private.

The inherited runner executes submitted Python on the local machine. Use trusted
code during local development; public execution requires process isolation.

## Verify

From the repository root after installing frontend and backend dependencies:

```sh
backend/venv/bin/python -m unittest discover -s backend/tests -v
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run lint
```

The tests mock AI calls. See [validation](docs/VALIDATION.md) for checks and
limitations, including the inherited dependency audit findings.

## Source and event context

The backend and frontend import commits preserve the supplied source. See
[provenance](docs/SOURCE.md) and the [original README](docs/UPSTREAM_README.md).
The event runbook's rules about pre-existing application code need clarification
before using this baseline in a competition submission; details are recorded in
the [roadmap](docs/ROADMAP.md#event-context-and-provenance).
