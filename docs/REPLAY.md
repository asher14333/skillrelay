# Reasoning replay and focused retries

## Learner journey

1. Choose a challenge and explain your approach while coding.
2. Code edits and typed explanations produce checkpoints after a short pause.
   Finalized speech updates, microphone start, runs, and run results also produce
   checkpoints. Running tests flushes pending edit checkpoints first.
3. Stop speech, review the transcript, and get session feedback.
4. Inspect an observation and select its timestamp to see the code and
   explanation captured at that point. The replay viewer is read-only and does
   not replace the working code.
5. Choose Practice this gap to work on one rubric dimension. Read the three
   criteria, write a focused answer, and compare it with the original text.
6. Review exact before/after evidence, return to session feedback, and save or
   update the practice summary.

## Capture boundaries

Replay contains up to 16 checkpoints. The starting point is retained. When the
limit is reached, older code-only snapshots are removed before explanation and
test-result events; if necessary, older interior checkpoints are removed.
The latest checkpoints are retained and checkpoint IDs remain stable.

Each checkpoint contains a stable ID, elapsed milliseconds, kind, code,
transcript, and optional passed/total test counts. Code is capped at 12,000
characters and explanation text at 6,000 per snapshot. Analysis rejects final
input beyond those limits rather than silently evaluating a truncated answer.

These are arrival-time checkpoints, not video, audio recordings, keystroke
playback, or word-level alignment. Paused code and typing are sampled after
1.1 seconds; explicit run/review actions flush pending changes. No raw audio
is retained by the application. Browser speech services have their own behavior.

## Evidence contract

`POST /analyze` accepts optional `checkpoints`. Existing clients may omit them.
The server validates chronology, IDs, event types, sizes, and run counts before
calling the model. The existing analysis call receives bounded code diffs and
explanations from those checkpoints and may return up to three observations.

An observation must reference a submitted checkpoint, name a supported rubric
dimension, and contain at least one exact code or transcript quote. Invented
quotes and unknown checkpoints are discarded. A verified quote establishes the
source text, not the correctness of the AI interpretation; feedback remains
AI practice guidance.

The analysis response adds `replayInsights` and `focusedPractice`. A response
without valid observations still permits browsing the actual checkpoints.

## Focused retry API

`POST /practice/retry` accepts:

```json
{
  "problemId": "two-sum",
  "dimension": "spaceComplexity",
  "code": "the code captured at the selected moment",
  "before": "the explanation captured at that moment",
  "after": "the learner's focused retry answer"
}
```

An empty original explanation is supported when no explanation had been
captured at that point. The retry answer must be non-empty. Each of the six
dimensions has three curated criteria. The server validates model results and
computes supported-criterion counts itself; a claimed success without an exact
supporting quote cannot receive credit. Missing criteria return a retryable
error. Results can improve, decline, or remain unchanged.

The focused retry currently uses typed input. Voice remains available for the
combined coding session. One extra model call is made only when the learner
chooses Compare explanations.

## Persistence and privacy

Code/transcript replay and before/after quotes stay in memory for the current
session. They are sent to the backend/model when the learner requests feedback.
Reloading clears replay, so inspect it before leaving the session.

Saved browser history continues to omit raw code, transcripts, and checkpoints.
It may include only the retry dimension, before/after supported counts, total,
and assessment timestamp. Updating an existing saved practice replaces that
summary under the same attempt ID, without adding a duplicate history row.

## Verification and remaining human work

Automated checks cover timestamp/ID validation, quote verification, malformed
model responses, non-improving retries, API compatibility, bounded checkpoint
retention, and summary-only persistence. Browser verification uses a clearly
labeled temporary model fixture; it does not establish live model quality.

Before presenting, verify live feedback with an API key and microphone behavior
on the demo browser. Ask actual learners to try the flow and report their real
feedback. No learner outcome study has been performed, and event eligibility
for inherited application code still requires organizer clarification.
