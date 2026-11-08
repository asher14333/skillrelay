# Full code and interface review

This is the review snapshot before the user-approved dark workspace polish.
Its light/teal theme, contrast measurements, UI scores, and three detector
warnings describe that earlier interface and are superseded by the current
[design system](DESIGN.md) and the [dark polish validation](VALIDATION.md#user-approved-dark-workspace-polish).
The functional findings and remaining product limits remain useful history;
their original test evidence has not been relabeled as a new run.

Reviewed November 7, 2026. Scope: backend/API/provider handling, scoring,
all five challenge catalogs and runner cases, frontend state and persistence,
recording lifecycle, accessibility, responsive layout, and the hackathon demo.
The existing study-workspace identity is preserved.

## Verdict

The implementation has a coherent product-specific system: learners explain
while coding, inspect actual session evidence, practice a specific gap, and
save a summary. This directly supports Prompt 2's technical communication and
AI-assisted skilling focus. Peer matching is future work, not a shipped claim.

The review uncovered real reliability problems that happy-path tests missed.
The fixes below make the local prototype more dependable. They do not prove
employment outcomes, learner improvement, competition eligibility, or safety
for publicly executing untrusted code.

## Technical UI audit before the dark polish

These are review judgments, not an accessibility certification.

| Dimension | Score | Evidence and limits |
| --- | --- | --- |
| Accessibility | 3/4 | Named fields, heading focus, live conversation log, native disclosure, visible focus, stronger placeholder contrast. Screen-reader and physical-device validation remain. |
| Performance | 3/4 | Local font and lazy editor, roughly 93 KB gzipped app bundle. Monaco remains about 927 KB gzipped with the known build warning. |
| Theming | 3/4 | Coherent light study workspace, dark editor, shared teal/neutral tokens. Legacy CSS still contains one-off values. |
| Responsive layout | 3/4 | Desktop, intermediate, and phone-width checks; larger phone test-case targets. Viewport emulation does not establish physical touch behavior. |
| Implementation integrity | 3/4 | Bounded replay, exact-source quote checks, summary-only persistence, labeled AI fixtures, no fabricated learners or networking. Remaining limits are explicit. |
| Total | 15/20 | Good prototype quality; meaningful verification still remains. |

## Findings addressed

- **P1 — Correct explanations incorrectly lost credit.** `backend/prompts.py`
  used narrow topic keywords to override model assessments. Stack solutions
  and natural-language complexity explanations could be falsely zeroed.
  Removed those keyword caps, retained a Unicode-aware empty/filler guard,
  validated rubric shape, and kept source-quote verification. Incomplete model
  assessments now fail clearly rather than inventing zero scores.
- **P1 — Malformed requests and interviewer replies could break a session.**
  `backend/validation.py` and `backend/app.py` validate JSON objects, text types,
  lengths, known problems, bounded history, nonempty questions, finite scores,
  and renderable evaluation fields. Oversized requests receive JSON errors.
  The server enforces completion after three interviewer questions.
- **P1 — Old retry responses could attach to a new task.**
  `FocusedRetry.jsx` aborts abandoned comparisons, and `App.jsx` checks the
  current task identity. Returning to the same retry keeps its draft/result.
- **P1 — Every browser origin could access the local API through CORS.**
  Allowed origins are restricted to the two documented local UI origins.
  This is defense in depth, not Python process isolation.
- **P2 — Follow-ups could mix different versions of a solution.**
  `InterviewPanel.jsx` freezes the starting code/explanation and offers an
  explicit restart with current work. Requests have timeouts/cancellation;
  malformed replies preserve the typed answer and allow retry.
- **P2 — Stop could submit before final speech arrived.** Follow-up recording
  now has starting/listening/stopping states; Submit waits for the final end
  event. Browser regression uses a simulated speech API, not a real recording.
- **P2 — Ordinary debugging prints broke runner output.** `runner.py` reads a
  marked final result payload so diagnostic stdout does not invalidate tests.
- **P2 — Accidental reset/refresh could discard working code.** Reset now has
  Undo. A dirty practice tab registers a browser navigation guard. Raw drafts
  remain session-only; the guard is not automatic draft recovery.
- **P2 — Analysis could race code execution.** Feedback waits for code checks
  to settle so the saved snapshot can include that run's actual result.
- **P2 — Small/faint text hindered reading.** Increased explanation/helper and
  evidence text sizes and improved placeholder contrast from about 2.92:1 to
  4.65:1 against its actual background. Updated muted text is about 5.25:1 on
  white. Shortened repeated instructions to preserve writing space.
- **P2 — Demo copy promised an unbuilt connection feature.** The README now
  describes the shipped learning loop. The demo includes Practice this lesson
  as a reliable fallback when no AI gap observation is returned.

The backend's direct requirements are pinned to the installed versions used
for verification. This is not a complete transitive dependency lock.

## Verification

See [validation](VALIDATION.md) and the checked-in backend and browser tests.
AI fixtures are clearly labeled; real model quality is not established by a
mocked response. Canonical solutions pass all 17 cases across the five problems,
and the two problem catalogs agree.

The original Impeccable source detector reported three quote-border warnings:
`App.css` rubric quotes, `Learning.css` saved-history quotes, and retry quotes.
These are retained as semantic quotation markers, not decorative card accents.
The detector reported no errors; its result is separate from visual judgment.

## Remaining work that matters for judging

1. Confirm the recorded pre-existing-code eligibility question and source
   provenance with organizers. The archive has no license file; do not invent
   permission or an eligibility verdict. See [source](SOURCE.md) and
   [roadmap](ROADMAP.md).
2. Have actual learners try the flow. Collect honest observations, describe
   their before/after reasoning, and explain what changed. Scripted criterion
   counts are functional evidence, not a learner study.
3. Rehearse the microphone on the demo computer. Typed explanation remains the
   complete fallback. Finish the demo video, attribution/AI disclosure, and
   judge access according to the event's actual submission requirements.
4. Before public untrusted execution, isolate the Python runner and bound its
   resources/output. Binding to loopback and restricting CORS are not a sandbox.
5. Later product hardening: opt-in draft recovery and multi-tab history merging.
   Do not quietly start persisting raw explanations/code under the existing
   summary-only privacy promise.
