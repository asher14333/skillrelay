# SkillRelay

**Practice skills. Explain your thinking. Connect with people who help you grow.**

SkillRelay is a new project based on the supplied SpeakCode source, with a
proposed Code the Change YYC direction around **Prompt 2: in-demand skills and
meaningful professional networks**. Suggested GitHub repository name: `skillrelay`.

## What works in the inherited baseline

- Five coding practice problems with a Monaco editor and Python test runner.
- Spoken explanations with transcript review.
- AI rubric feedback and interview follow-up questions.

The application currently retains SpeakCode branding. Personalized learning
plans, practice history, portfolios, and peer matching are planned enhancements.
See the [proposed roadmap](docs/ROADMAP.md).

## Run locally

Use Node.js compatible with the locked Vite version, Python 3.10+, and an OpenAI
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

## Source and event context

The backend and frontend import commits preserve the supplied source. See
[provenance](docs/SOURCE.md) and the [original README](docs/UPSTREAM_README.md).
The event runbook's rules about pre-existing application code need clarification
before using this baseline in a competition submission; details are recorded in
the [roadmap](docs/ROADMAP.md#event-context-and-provenance).
