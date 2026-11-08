# NotLeetYet learning loop: implementation plan

_The project was called SkillRelay when this plan was written._

Branch: `codex/skillrelay-learning-loop`

Base: `c7a703f` on `main`. Created November 7, 2026.

## 1. Product outcome

Help an early-career developer turn an interview practice attempt into a
specific skill-building activity, then retain evidence of their practice.

The core journey is:

**Choose a goal -> code while explaining -> receive feedback -> study a
targeted micro-lesson -> retry -> save and review progress.**

This extends the existing SpeakCode interview coach toward Prompt 2's career
readiness, communication, and AI-assisted skilling focus areas. It does not
claim job-placement results or independently verified credentials.

## 2. Starting point

The application already includes five Python challenges, Monaco editing, a
local code runner, spoken or typed explanations, six-dimension feedback, and
AI interview follow-ups. The frontend is React/Vite and the backend is Flask.

Current gaps are learner goals, a concrete lesson after feedback, saved attempt
summaries, and a way to revisit prior practice. The UI still says SpeakCode.
The original application code is preserved in the import commits.

## 3. Scope and boundaries

### Core delivery

- Three learner goals: explain clearly, explain trade-offs, and build interview
  confidence. Keep onboarding to one lightweight selector.
- A short, curated lesson for each of the six existing rubric dimensions.
- A next lesson selected from the learner's weakest normalized rubric score.
  Use the selected goal to break ties; explain the recommendation in the UI.
- A visible retry action that returns the learner to their current problem and
  explanation with the recommended practice prompt available.
- Explicitly saved practice summaries stored in this browser.
- A progress view with attempt count, practice scores, dimension breakdowns,
  and the latest change on the same problem under the same goal.
- Accessible typed input, clear loading/error states, and SkillRelay branding.
- Focused backend and frontend logic tests plus a manual browser check.

### Later work

Peer or mentor matching, accounts, cloud synchronization, job-market feeds,
certificates, and shareable portfolios are separate milestones. A complete
learning loop takes priority over expanding into networking.

## 4. Learner experience and acceptance criteria

### A. Choose a goal

The learner can select a goal before analyzing their explanation. Each option
has a plain-language description. The choice persists in this browser. A goal
change affects the next analysis rather than relabeling an existing result.

Acceptance: all three choices work with both typed and spoken explanations;
existing problem selection and code execution continue to work.

### B. Code and explain in one session

The editor, code tests, and explanation are available together. Starting the
microphone keeps the editor visible; editing and running code do not stop the
microphone or erase the transcript. Spoken or typed reasoning can be added
throughout the attempt. Stop voice input and review the transcript before
requesting feedback on the session's final code and explanation.

On desktop, the explanation sits beside the editor. Smaller screens stack the
editor and explanation within the same workspace. No separate post-coding
explanation step is required.

### C. Get feedback and a lesson

Retain the current six rubric dimensions. Add a learning-plan object to the
analysis response, derived from the normalized feedback rather than a second
AI request. Each lesson contains:

- target dimension, title, and approximate duration;
- the reason this lesson was recommended;
- two or three concrete learning steps;
- an explanation practice prompt;
- a learner self-check; and
- a retry or transfer-practice action.

Compare `score / max` rather than raw scores because dimensions have different
maximum values. For equal deficits, apply the goal's ordered dimension
priorities, with a deterministic final ordering. If every dimension is full,
recommend transfer practice rather than inventing a weakness.

Acceptance: a low complexity score yields the appropriate complexity lesson;
goal priorities resolve ties consistently; a full-score attempt receives a
positive next challenge. One analysis still requires only one model call.

### D. Retry deliberately

The lesson remains visible when the learner returns to the explanation tab.
Retrying preserves their code and current explanation so they can revise it.
The new analysis receives a fresh result and recommendation. Stale feedback
must not be saved against a different problem, explanation, code, or goal.

Acceptance: a learner can complete feedback -> lesson -> revision -> feedback
without re-entering code or losing their explanation.

### E. Save and review practice

Saving is explicit. Store a summary containing a generated attempt ID,
timestamp, problem identifier/title, learner goal, score, normalized rubric,
recommended lesson, and code-run counts when the run corresponds to the
analyzed code. Do not persist source code, transcripts, or API credentials.

Use a versioned localStorage document, validate it when reading, and cap saved
history at 100 attempts. A duplicate click on the same analysis must not add
another entry. If storage is full or unavailable, show an actionable message
and keep the current practice usable.

Acceptance: history survives reload; malformed saved data does not crash the
app; empty history has a useful first-practice action; learners can remove an
attempt or clear saved practice with a clear confirmation for bulk deletion.

### F. Show progress honestly

Show saved practice count, distinct problems practiced, and latest score. Show
score change only between the latest two attempts on the same problem and
learning goal. Label the comparison as AI practice feedback, not a validated
measurement of employability or a guaranteed improvement.

Acceptance: a single attempt has no fabricated trend; switching problems or
goals does not produce an invalid comparison; scores remain understandable
without relying on color alone.

## 5. Backend design

Add `backend/learning.py` with the goal catalog, six curated lessons, and a pure
`build_learning_plan(feedback, problem, goal)` function. Keep selection and
content deterministic and testable without an API key.

Extend `POST /analyze` with optional `learningGoal` and default to the clear
explanations goal for existing clients. Reject unsupported goals with a 400
response before invoking the model. Preserve the current response keys and
add `learningPlan` and `learningGoal`.

Example request addition:

```json
{ "learningGoal": "clear-explanations" }
```

The learning plan includes a stable lesson ID and rubric dimension, a title,
minutes, reason, steps, practice prompt, self-check, and action kind (`retry`
or `transfer`). The backend owns lesson content and selection. Browser storage
does not become a source of truth for server scoring.

## 6. Frontend design

- Keep `App.jsx` as the practice coordinator and preserve the existing editor,
  test console, transcript, and interview components.
- Add goal metadata, a learning-plan card, and a dedicated progress panel.
- Add a small storage module with pure validation and comparison helpers.
- Save an immutable snapshot of each analysis alongside its request inputs in
  memory. Save/retry controls use that snapshot, not mutable current fields.
- Invalidate analysis and code-run associations on relevant input edits.
- Keep state updates from late requests from attaching to another problem.
- Add narrow layout rules for smaller screens and visible keyboard focus.
- Use a local browser storage explanation near save/history controls.

No new chart library, state management framework, database, or frontend routing
dependency is needed for the first version.

## 7. Delivery sequence and commit boundaries

| Step | Commit scope | Completion evidence |
| --- | --- | --- |
| 1 | This plan | Scope, architecture, acceptance criteria, and demo are reviewable |
| 2 | Backend learning goals and lessons | Deterministic lesson tests; analysis route tests with mocked AI |
| 3 | Browser practice storage | Tests for validation, duplicates, limits, and valid comparisons |
| 4 | Goal, lesson, retry, and progress UI | Build/lint and manual practice/history checks |
| 5 | Validation and docs | Recorded results, setup instructions, and demo walkthrough |

Keep each implementation commit coherent and preserve the inherited source
history. Push the feature branch for review; merging remains a separate action.

## 8. Verification plan

### Automated checks

- Backend: lowest normalized score, deterministic tie-breaks, each goal,
  all-full-score transfer practice, and invalid goal handling.
- API: default-goal compatibility, additive response fields, and errors before
  model invocation. Mock external model calls; do not spend API credits in tests.
- Storage: valid round trip, corrupt/unrecognized data, bounded history,
  duplicate IDs, unavailable storage, deletion, and same-problem/goal comparison.
- Run the existing known-solution smoke checks across all 17 challenge cases
  when backend integration changes could affect execution.
- Frontend production build and lint; inspect warnings introduced by this work.
- `git diff --check` and a clean final working tree.

### Browser checks

Use a real local frontend/backend session. If no API key is configured, verify
the missing-key error and separately use a clearly disclosed test fixture for
the feedback/history flow; record that live AI was not verified. Never present
fixture data as a successful live model request.

Check goal selection, typed explanation, lesson display, retry preservation,
save once, reload persistence, progress view, deletion, empty state, and a
narrow viewport. Check that editing input prevents saving stale feedback.

## 9. Demo sequence

1. Explain the learner problem: knowing code does not automatically mean being
   able to explain it clearly during an interview.
2. Select a learning goal and a challenge; enter a working solution.
3. Run the cases and give a short spoken or typed explanation.
4. Show rubric feedback and why one specific micro-lesson was chosen.
5. Use the lesson to revise the explanation, then analyze again.
6. Save practice and show the history after reload. Describe score changes as
   practice signals, with no promise that a second attempt must score higher.

The useful outcome is one learner leaving with a concrete next learning step
and a record of their practice. Any seeded demonstration must be labeled.

## 10. Known constraints and release decisions

- The inherited Python runner executes code in a local subprocess. Keep this
  prototype local; public untrusted execution needs an isolated runner.
- AI feedback quality remains a dependency. Existing keyword-based score caps
  may need separate calibration across different problems and explanation
  styles. Do not claim these scores constitute validated assessment.
- Browser storage belongs to one browser profile, may be cleared, and does not
  synchronize. Explain this before users rely on it.
- The inherited dependency audit reports eight vulnerabilities. Track them
  separately from learning features and avoid a blind breaking dependency fix.
- Inherited application reuse still needs organizer clarification under the
  supplied event rules. Original work and AI assistance must be described
  accurately. This plan does not resolve event eligibility.
- Judges need access to the prototype and repository, plus the required demo
  and submission materials. Publishing, broadening repository visibility, and
  merging are separate decisions.

## 11. Implementation record

Completed on this branch:

- `bd864e7`: detailed plan and acceptance criteria.
- `d22b291`: goal-based curated lesson selection and backend/API tests.
- `8ad2fd8`: validated browser summaries and comparison/storage tests.
- `a1be052`: SkillRelay goal, lesson, retry, save, and progress UI; recording
  stops when its interview panel is inactive.

The core journey is implemented. Nine backend and seven frontend tests pass;
production build and lint pass. Browser checks covered typed input, the real
runner, lessons and save/retry flows using labeled feedback, persistence,
deletion, invalidation, and narrow layouts. See [validation](VALIDATION.md).

Deferred verification: live AI feedback and live microphone/speech recognition.
The API key was absent, so the browser feedback/history checks used an external,
temporary fixture, not a shipped demo feature. Peer matching, cloud accounts,
and portfolios remain outside this core delivery.

Reasoning replay and focused retries were subsequently implemented on the same
branch. See [replay design and contracts](REPLAY.md) for checkpoint retention,
evidence validation, the retry API, and privacy boundaries. The current suite
has 21 backend and 13 frontend tests. Replay and retry UI checks used labeled
model fixtures; live model quality and microphone capture remain unverified.
