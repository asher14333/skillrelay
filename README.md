# NotLeetYet

**Not leet yet? Talk through it until you are.**

You can solve the problem and still bomb the interview, because interviews grade how you *explain* your thinking, not just whether your code runs. NotLeetYet is a practice workspace for that part: solve a coding problem, talk (or type) through your approach, and get feedback on your explanation, a lesson for your biggest gap, and a way to track your progress.

Built for Code the Change YYC, **Prompt 2** (career readiness and AI-assisted skill building).

---

## What it does

**Practice**
- Solve coding problems in a real code editor.
- Explain your approach by **voice or text** while you code, then run your Python against the test cases.

**Get feedback**
- AI scores your explanation on 6 interview skills: problem understanding, brute force, optimization, time complexity, space complexity and clarity.
- Every score quotes the **exact words** from your explanation that earned it.
- A summary shows your score, your biggest gaps and each skill at a glance.

**Improve**
- One short **recommended lesson** for your biggest gap, with a curated example video.
- **Focused retry**: practice just that one skill and compare the evidence before and after.
- **Checkpoint replay**: see your code and explanation at each moment of the session.
- **Progress**: save attempts and track your score and skills over time.

**Live interview mode**
- An AI interviewer that listens while you code, asks follow-up questions out loud and throws **curveball requirement changes** with matching test cases.

**Accessible, private, transparent**
- Voice or keyboard, keyboard shortcuts, and adjustable text size, layout and motion.
- History stays in your browser. Code and transcripts are never saved.
- AI scores are learning signals, not credentials.

## How a session works

1. Pick a problem and your learning focus.
2. Write your solution and explain it out loud (or type).
3. Run the tests, then click **Get session feedback**.
4. Read your scores and evidence, then practice the recommended lesson or a focused retry.
5. Save the attempt and compare it with your next one in **Progress**.

---

## Quick start

**You'll need:**
- Node.js 22+
- Python 3.10+
- A Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey)), or an OpenAI key
- Chrome or Edge, for voice input

### 1. Start the backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- Windows (PowerShell): `.\venv\Scripts\Activate.ps1`
- macOS / Linux: `source venv/bin/activate`

Then install, configure and run:

```bash
pip install -r requirements.txt
```

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead.

Open `backend/.env` and paste your key after `GEMINI_API_KEY=`, then start the server:

```bash
python app.py
```

The backend runs at `http://127.0.0.1:5001`.

### 2. Start the frontend (in a second terminal)

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**.

> **Tip:** The code editor and test runner work without an API key. Only the AI features (feedback, lessons, retries, live interview) need one.

---

## Configuration

All settings live in `backend/.env`. Restart the backend after changing them.

| Setting | What it does | Default |
|---|---|---|
| `AI_PROVIDER` | `gemini` or `openai` | `gemini` |
| `GEMINI_API_KEY` | Your Gemini key (also used for the interviewer's voice) | (none) |
| `GEMINI_MODEL` | Gemini text model | `gemini-3.8-flash` |
| `OPENAI_API_KEY` | Only needed if `AI_PROVIDER=openai` | (none) |
| `OPENAI_MODEL` | OpenAI model | `gpt-4o-mini` |
| `GEMINI_TTS_MODEL` | Voice model for the live interviewer | `gemini-3.1-flash-tts-preview` |
| `GEMINI_TTS_VOICE` | Interviewer voice | `Kore` |

Good to know:
- **API keys stay on the backend.** Never put them in the frontend or in `VITE_` variables.
- **One provider at a time.** All AI features use the provider you choose, and there's no automatic fallback.
- **The interviewer's voice always uses Gemini**, even when text features use OpenAI. Without access to the voice model, replies still appear as text.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl` + `Enter` | Run code |
| `Ctrl` + `Shift` + `Enter` | Get session feedback |
| `Alt` + `Shift` + `M` | Start or stop the mic (Practice) or interview (Live) |
| `Alt` + `Shift` + `L` | Switch between Practice and Live interview |
| `Esc` | Stop the AI voice |

On a Mac, use `⌘` instead of `Ctrl`. You can turn shortcuts off in **Display settings**.

---

## Project structure

```
backend/              Flask API: AI feedback, lessons, retries, live interviewer, code runner
  app.py              API routes (starts the server on port 5001)
  ai_provider.py      Gemini / OpenAI client
  runner.py           Runs submitted Python against the test cases
  tests/              Backend unit tests
frontend/             React + Vite app
  src/App.jsx         Main workspace
  src/components/     UI components (feedback, progress, live interviewer, ...)
  src/data/           Problems, lessons, shortcuts, local storage (+ unit tests)
  tests/              Browser regression scripts (Playwright)
shared/               Curveball definitions shared by frontend and backend
```

## Running the tests

From the repository root, after installing dependencies:

```bash
npm --prefix frontend test
```

```bash
npm --prefix frontend run lint
```

```bash
npm --prefix frontend run build
```

Backend tests (Windows; on macOS/Linux use `backend/venv/bin/python`):

```bash
backend\venv\Scripts\python -m unittest discover -s backend/tests
```

The tests mock all AI calls, so they don't need an API key or use any quota.

---

## Privacy and safety

- **Your history stays in your browser:** up to 100 saved attempts, with only scores and summaries. Code and transcripts are never saved.
- **What's sent to the AI provider:** your code and explanation, only when you use an AI feature (feedback, retry, follow-up, live interview).
- **Run it locally only.** The code runner executes submitted Python directly on your machine. It isn't sandboxed, so only run it locally with code you trust.
