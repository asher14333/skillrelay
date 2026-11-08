# SkillRelay

**Practice coding. Explain your thinking. Know what to work on next.**

SkillRelay helps early-career developers practice explaining technical work and
turn interview feedback into a concrete next learning step. Based on SpeakCode,
it targets Code the Change YYC **Prompt 2**, particularly communication,
career readiness, and AI-assisted skilling.

## Practice, learn, and track your next step

- Five coding practice problems with a Monaco editor and Python test runner.
- Spoken or typed explanations alongside the editor, so you can explain while
  coding and running tests.
- AI rubric feedback and interview follow-up questions using Gemini or OpenAI.
- Display settings for interface/editor text size, stacked or column layouts,
  and reduced motion. Preferences apply immediately and stay in this browser.
- Three learning goals: clear explanations, technical trade-offs, and interview
  confidence.
- Six curated micro-lessons, recommended from normalized rubric gaps. Your goal
  breaks ties; lesson selection adds no extra model request.
- A retry action that preserves your explanation and code while showing a
  concrete practice prompt.
- Saved practice summaries and score comparisons for the same problem and goal.
- An opt-in live interviewer: Gemini decides whether to let you continue, ask
  a question, or generate a fresh requirement change and test inputs. Trusted
  reference functions compute expected results; AI-written test code is never run.
- Gemini-generated spoken interviewer responses, with mute, stop, replay, and
  microphone handoff. Text remains available if audio cannot play.
- Curated YouTube examples matched to the recommended lesson. The player embeds
  beside the lesson (no autoplay, captions preferred), with an Open on YouTube link.
- Reasoning replay with timestamped code/explanation checkpoints and
  evidence-linked observations.
- Focused retries with three criteria, exact before/after quotes, and a saved
  comparison summary.

Choose a goal, talk through your thinking as you solve a challenge, then review
the transcript and get session feedback. Save
your feedback, practice the recommended lesson, then save another attempt to
compare practice scores. AI scores are learning signals, not credentials.

Use a replay timestamp to inspect what you were coding and explaining at that
moment. Choose Practice this gap, write a focused answer, and compare evidence.
Replay is available during the current session; saved history keeps summaries
only. See [reasoning replay](docs/REPLAY.md) for capture and privacy details.

Choose Start live interview once and allow microphone access. Explain your
approach while coding; after about 1.5 seconds without new recognized speech,
the app finalizes the turn and asks Gemini what would help next. Useful
questions and requirement changes appear as chat bubbles beside the editor
and play through Gemini voice. Listening resumes after playback ends, with
no Check now or manual stop/start required for each turn. A continue decision
can keep the interviewer quiet. Pause interview cancels the entire live loop.

Interview input can be Voice or Text. Text turns are considered automatically
after a typing pause. If speech recognition is unavailable, typed practice
still works. Stop/replay/mute remain explicit controls; autoplay or permission
errors keep text visible. Microphone input stays off during AI generation and
playback, and late responses cannot restart a paused or hidden interview.
Chat keeps a bounded, session-only conversation; full explanation text remains
available below it for review. Nothing in the chat is added to saved summaries.

Generated changes stay within supported, parameterized contracts for the five
problems. Gemini selects timing, parameters, title, and new test inputs rather
than a fixed scenario. Server-checked requirements replace original examples
and recompute expectations. Generated IDs last one hour in the running backend;
restart/expiry may invalidate them. Return to original requirements keeps your
code and explanation when recovering from an expired change.

Curveball reviews keep runnable correctness separate from three communication
checks: understanding the requirement, explaining the implementation decision,
and explaining verification. Exact source quotes support the checks. Saved
practice labels requirement changes and compares scores only within the same
problem, goal, and variant. Raw before/after evidence stays in the session.

History is saved in this browser, up to 100 attempts. Code and transcripts are
not included in saved summaries. Cloud synchronization, portfolios, and peer
matching are future work. See the [implementation plan](docs/IMPLEMENTATION_PLAN.md)
and [demo walkthrough](docs/DEMO.md).

The interface uses a compact charcoal workspace, restrained amber actions,
a locally bundled code editor, and self-hosted Manrope typography. See [design direction](docs/DESIGN.md)
for the palette, layout decisions, and UI/UX guidance applied.

## Run locally

Use Node.js 22.14+ (the tested version), Python 3.10+, and a Gemini or OpenAI
API key. Chrome or Edge supports the inherited voice workflow.

Backend:

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set GEMINI_API_KEY in .env (the template selects Gemini).
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

### AI provider setup

For Gemini, set these values in `backend/.env`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). The
integration uses Google's [generateContent API](https://ai.google.dev/api/generate-content)
with JSON output; `GEMINI_MODEL` can select another compatible text model.

For OpenAI, set `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Optionally set
`OPENAI_MODEL` (default `gpt-4o-mini`). Only the selected provider's key is needed.
If `AI_PROVIDER` is omitted, a non-empty Gemini key selects Gemini; otherwise
OpenAI is used, preserving existing OpenAI-only setups. There is no automatic
fallback to another provider after a failed request.

AI output voice always uses Gemini TTS and the same `GEMINI_API_KEY`; it does
not use browser speech synthesis. Optional settings in `backend/.env`:

```dotenv
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
GEMINI_TTS_VOICE=Kore
```

The key needs access/quota for that audio model. Voice generation has additional
latency and quota usage. The backend caches a few short audio replies privately
for five minutes. Browser autoplay restrictions may require Replay voice.
Spoken input still uses the browser's speech recognition; only finalized text
is used by the interviewer. API keys remain on the backend.

Restart the backend after editing `.env`. The backend loads `backend/.env`
regardless of the working directory; existing shell environment variables take
precedence. No frontend `.env` or additional Python package is required. Never
put API keys in `VITE_` variables. All AI features use the same selected provider,
including replay observations, focused retries, and interview follow-ups. Code
and explanations are sent to that provider only when requesting AI features;
the local code runner does not require an API key.

The inherited runner executes submitted Python on the local machine. Use trusted
code during local development; public execution requires process isolation.

## Verify

From the repository root after installing frontend and backend dependencies:

```sh
backend/venv/bin/python -m unittest discover -s backend/tests -v
node --test frontend/src/data/*.test.js
npm --prefix frontend run build
npm --prefix frontend run lint
```

The tests mock AI calls. See [validation](docs/VALIDATION.md) for checks and
limitations, including the inherited dependency audit findings.

See [development tooling](docs/DEVELOPMENT_TOOLS.md) for the Codex design skills,
Playwright CLI setup, and the browser regression check.

## Source and event context

The backend and frontend import commits preserve the supplied source. See
[provenance](docs/SOURCE.md) and the [original README](docs/UPSTREAM_README.md).
The event runbook's rules about pre-existing application code need clarification
before using this baseline in a competition submission; details are recorded in
the [roadmap](docs/ROADMAP.md#event-context-and-provenance).
