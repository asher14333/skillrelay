# Validation record

## Original import

Checked November 7, 2026 with Node.js 22.14.0 and npm 10.9.2.

- All 29 supplied files match the archive byte-for-byte, with the original root
  README preserved at `docs/UPSTREAM_README.md`.
- `npm ci` completed using the supplied lockfile.
- `npm run build` passed.
- `npm run lint` exited successfully with an existing missing `onError`
  dependency warning in `InterviewPanel.jsx`.
- All backend Python modules passed syntax parsing.
- Runner smoke checks passed all 17 cases across the five supplied problems
  using known solutions. Empty code and unknown problem inputs returned errors.
- `git diff --check` passed.

Installation reported eight dependency vulnerabilities (one moderate, seven
high). Dependency remediation has not been performed as part of the source
import. The local subprocess runner also needs isolation before public use.

These checks were repeated in the Documents clone before the import commits.
At the original import, live AI calls, browser speech recognition, and full backend integration had
not been tested. No API key was configured during repository setup.

## Learning-loop branch

Checked November 7, 2026 on `codex/skillrelay-learning-loop`.

- Nine backend tests passed: normalized-score comparisons, goal tie-breaks, all
  six lesson mappings, full-score transfer practice, catalog immutability, and
  analysis route compatibility/validation with mocked model calls.
- Seven frontend tests passed: summary round trips, omitted private fields,
  bounded/deduplicated history, corrupt data, storage failures, comparable
  attempts, deletion, and persistence of the selected goal.
- Frontend production build and lint passed. The inherited missing `onError`
  dependency warning was fixed while updating interview recording lifecycle.
- `git diff --check` passed.

### Browser verification

Used local React/Vite and Flask servers in Chrome at the default desktop size
and a temporary 390 x 844 viewport. The viewport override was reset afterward.

- Typed explanation and the real missing-API-key error were verified.
- A known Two Sum solution ran successfully through Monaco and passed its three
  cases against the real code runner.
- A temporary backend fixture supplied clearly labeled feedback without a live
  AI call. The fixture was outside the repository and is not an application mode.
- Verified lesson content, retry preservation, old-feedback invalidation on
  explanation edits, explicit save, duplicate-save disabling, progress display,
  reload persistence, and stored run counts.
- Verified that a different goal does not produce a score comparison against
  the earlier goal. Verified individual removal, the bulk-clear confirmation,
  and empty history after reload. All generated test attempts were removed.
- Desktop and narrow progress/practice layouts were visually inspected.

### Remaining limitations

Live model quality, live speech recognition, and microphone behavior were not
verified because no API key or microphone recording was used. Automated tests
verify model-independent logic and mocked API integration; the browser fixture
does not establish a successful live model call.

The inherited eight dependency vulnerabilities and local subprocess execution
constraint remain. Saved summaries are local to one browser and do not sync.

## UI and UX refinement

Reviewed November 7, 2026 using the installed `frontend-design` and
`web-design-guidelines` skills. The interface now has a light study workspace,
a dark editor, local Manrope typography, contextual actions, and clear practice
stages. No new dependencies were added.

- Production build and lint passed; the 16 existing automated tests passed.
- The real locally bundled editor accepted a known Two Sum solution and the
  real code runner passed its three cases through the redesigned controls.
- The challenge dialog received focus on open, closed with Escape, and returned
  focus to its trigger. Selecting another challenge warned about the draft;
  Keep working preserved the current code and explanation.
- Using the temporary labeled feedback fixture, verified lesson rendering,
  Save practice, history, and Undo after removing the only saved attempt.
- Practice and Progress use hash links; browser Back restored the practice view.
- Verified the friendly missing-key message against the normal backend, with
  the typed explanation retained after the failed request.
- Visually inspected practice, explanation, feedback, progress, and the dialog
  at desktop size, plus practice and progress at 390 x 844. The viewport was
  reset and generated history was cleared.
- Monaco and its Python support/worker now ship as local lazy-loaded assets,
  rather than requiring a separate editor CDN. Fonts and the favicon are local.

The build reports an expected chunk-size warning for Monaco's editor bundle
(about 3.6 MB uncompressed, 927 kB gzipped). It is separate from the main app
chunk, and no large-chunk threshold was raised to hide the warning. Future
performance work can reduce editor features or evaluate a lighter editor.

Live AI and speech verification remain deferred. The browser fixture was
stopped and the normal backend restored after UI verification.

## Concurrent coding and explanation

Updated the practice flow so the editor, tests, and explanation share one
workspace. On desktop, the transcript and microphone controls sit beside code;
smaller screens stack them in one scrollable session. Running code and editing
do not invoke microphone stop or clear the transcript. Feedback is requested
after stopping speech and reviewing the explanation.

- In Chrome, entered an explanation first, edited the code, and ran a known
  Two Sum solution. The explanation stayed intact and all three cases passed.
- Visually inspected the shared desktop layout and the stacked 390 x 844 layout,
  including accessible microphone and feedback controls. Reset the viewport.
- Production build, lint, and the 16 existing logic/API tests passed.
- Microphone capture itself remains unverified; no actual recording was made.
  This check confirms the shared UI and typed-input behavior, not a live speech
  recognition result. Model calls remain unverified without an API key.

## Reasoning replay and focused retries

Checked November 7, 2026 on the learning-loop branch.

- All 34 automated tests passed: 21 backend/API tests and 13 frontend data tests.
- Replay validation rejects invalid chronology, duplicate or unknown IDs,
  unsupported event types, oversized checkpoints, and invented evidence quotes.
- Focused retry tests cover exact-quote requirements, missing criteria, invalid
  inputs, empty original explanations, and comparisons that decline rather than
  improve. Supported counts are computed from validated checks.
- Frontend tests cover bounded checkpoint retention, stable IDs, event ordering,
  checkpoint payloads, and updating a saved attempt with a summary that omits
  raw before/after text, quotes, code, and checkpoint data.
- Production build and lint passed; the known Monaco chunk warning remains.

### Browser evidence

Used Chrome with a temporary, clearly labeled model fixture outside the repo.
The code runner remained real. Typed an initial plan, edited and ran Two Sum,
then analyzed six actual captured checkpoints. Pending edit checkpoints appeared
before the run and test-result checkpoints. All three code cases passed.

Verified that selecting the starting point showed starter code and no captured
explanation, while selecting the later review showed the entered solution and
explanation. Opened a memory-focused retry from its linked gap, entered a new
answer, and inspected before/after criterion quotes. The fixture showed 1/3
before and 3/3 after; this was UI test data, not a live learner result.

Saved the baseline first, then updated it after the retry. Progress still showed
one attempt, and the focused retry summary survived reload. Inspected replay at
390 x 844 and reset the viewport. Removed the generated test attempt and restored
the normal backend afterward.

Live model quality, microphone capture, and actual learner outcomes remain
unverified. The app does not store or replay raw audio, and checkpoint timing is
arrival-based rather than exact alignment of words with keystrokes.

## Gemini and OpenAI provider support

Checked November 7, 2026. All 51 automated tests passed: 38 backend/API tests
and 13 frontend data tests. Production build and lint passed; the existing
Monaco chunk-size warning remains.

New provider tests verify Gemini header authentication, separate system/user
content, JSON response mode, custom model selection, and exclusion of thought
parts. All four AI routes were exercised through the real provider adapter
with mocked Gemini HTTP responses. Existing OpenAI request behavior, explicit
provider selection, and OpenAI-only configuration compatibility were checked.

Missing credentials, invalid configuration, authentication failures, quota
limits, network timeouts, and missing/truncated/blocked/malformed model output
are covered. Errors returned to the frontend omit upstream exception details.
No automatic cross-provider fallback occurs after an error.

These checks mock external model services. No live Gemini or OpenAI request was
made, and they do not establish model quality or account/model access. Add a
valid key to `backend/.env`, restart the backend, and verify live feedback before
the demo. No new dependencies were required for this integration.

### Subsequent live validation

After the user configured the backend environment, all four AI endpoints
returned successful live Gemini responses through the frontend proxy. The
Python runner passed all three Two Sum cases. A Chrome learner session captured
seven checkpoints, received evidence-linked feedback about an omitted memory
analysis, and completed a scripted focused retry from 0/3 to 3/3 supported
criteria. Interview questions and answer evaluation also worked. The saved
retry summary survived reload without duplicating the attempt. These are
functional checks with scripted explanations, not learner-outcome evidence.

## Codex design skills and UI polish

Installed Impeccable 4.8.0, Taste 2.5.1, and Playwright CLI skills for Codex.
Added `@playwright/cli` 0.1.23 as a frontend development dependency. The skills
remain outside the app repository; see [tooling](DEVELOPMENT_TOOLS.md).

All 51 existing automated tests pass (38 backend and 13 frontend data tests).
Build and lint pass, with the existing Monaco bundle-size warning. The
additional checked-in Playwright CLI function passes in an isolated Chrome
session with explicitly labeled AI response fixtures. It verifies:

- Score and recommended lesson precede replay, and the next action fits in the
  desktop viewport. Lesson reading opens and closes with native disclosure.
- Feedback and retry headings receive focus. The follow-up answer has a visible
  label and receives focus, and the conversation has an accessible live log.
- Changing the learning goal during a focused retry returns to the coding view
  while preserving the working explanation, fixing the blank-workspace bug.
- The retry summary updates one saved attempt and survives reload.
- The practice layout has no page-wide horizontal overflow at 1440, 1024, 768,
  and 390 pixels. Separate feedback checks also passed at 320 pixels.

Inspected desktop and mobile screenshots. The mobile lesson disclosure has a
44-pixel minimum height and works with Enter. The Impeccable source scan found
three existing quote-border warnings, retained as semantic quotation markers;
it reported no errors. Marketing-page layout gates were not applied to this
task-oriented app. This pass does not add raw-draft recovery or verify voice
capture, model quality, or actual learner outcomes.

## Full reliability review

The subsequent review verifies 58 backend/API/catalog tests and 13 frontend
storage/replay tests (71 total), including all 17 real challenge-runner cases.
The backend tests cover malformed inputs/model output, Unicode-aware scoring,
CORS preflights, the interview question cap, and debugging stdout. Build and
lint pass. A live Valid Parentheses run and Gemini analysis both returned HTTP
200 through the restarted frontend/backend; that smoke check is separate from
the simulated browser regressions.

The browser suite includes the original practice flow plus
`frontend/tests/reliability-ui.js`: retry draft retention, delayed-request
invalidation, frozen follow-up context, malformed-response recovery, simulated
speech finalization, reset undo, and the dirty-draft navigation guard. AI and
speech in that regression are labeled simulations. No real microphone recording
or new learner-outcome measurement is implied. See [full review](REVIEW.md).

## User-approved dark workspace polish

The user selected a compact engineering workspace, neutral charcoal surfaces,
restrained warm amber accents, and the existing three-column desktop layout.
The large introduction is replaced by a compact toolbar. All screens share the
same tokens and control styles; the previous overlapping CSS layers were
consolidated. The approved design brief is merged in [design](DESIGN.md).

Frontend lint, production build, and all 13 storage/replay data tests pass.
The existing large Monaco chunk warning remains. The practice browser check
also covers Previous/Next checkpoint navigation; the reliability browser check
continues to pass after the control-label and visual changes. No backend code
changed during this pass.

Inspected practice, feedback, retry, follow-up, challenge picker, progress,
empty history, loading, runner errors, and feedback errors. Viewport checks at
1440, 1280, 1024, 820, 768, 390, and 320 pixels found no page-wide horizontal
overflow. Corrected narrow-screen visibility of the hidden practice workspace
on Progress and bounded the problem reading pane so it does not push coding
several screens below the fold. Keyboard focus, native disclosures, selected
case semantics, reduced motion, and recoverable errors are retained.

Representative contrast checks: muted text on raised surfaces 6.01:1,
placeholder text on the editor surface 6.79:1, and primary button text 9.34:1.
These sample checks are not a whole-product accessibility certification.
The single final Impeccable source detector pass returned no findings.

AI and error responses in this UI review are explicitly labeled fixtures;
speech finalization remains a simulated regression. This polish does not
establish live microphone capture or new learner-outcome evidence. Raw drafts
remain session-only and saved history keeps summaries. Changes are left
uncommitted for the user's review.
