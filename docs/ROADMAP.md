# NotLeetYet: hackathon scope and roadmap

## Prompt and audience

Direction: Prompt 2, helping people develop in-demand skills and build
meaningful networks in a changing job market. Start with students, newcomers,
and early-career developers who need practice explaining their technical work.

The interview coach and guided learning loop fit the career transitions,
communication, and AI-assisted skilling focus areas. Peer connections remain a
future extension.

## Core demo loop

1. Choose a technical skill and a practice challenge.
2. Explain the approach by voice or text while coding and running tests in the
   shared workspace.
3. Receive specific feedback and one recommended next practice step.
4. Study the recommended micro-lesson and retry with a specific practice prompt.
5. Save practice summaries and compare attempts on the same problem and goal.
6. Inspect timestamped reasoning checkpoints, practice a specific gap, and save
   the before/after criterion summary.

## Implementation order

- **Existing baseline:** five coding challenges, editor, code execution,
  voice transcription, rubric feedback, and interview follow-up questions.
- **Implemented on the learning-loop branch:** three learning goals, curated
  lessons for six rubric dimensions, recommendations from relative score gaps,
  and a guided retry flow. Typed explanations remain available alongside voice.
- **Implemented on the learning-loop branch:** explicit saved practice summaries
  in browser storage, progress across reloads, and comparisons within the same
  problem and goal. AI scores are labeled as practice feedback.
- **Implemented on the learning-loop branch:** evidence-linked reasoning replay
  and focused typed retries with criterion-level before/after comparisons.
- **Next milestone:** add an opt-in peer practice directory with matching by
  goals, skills, and availability. Clearly label seeded demo profiles.
- **If time permits:** export a learner-controlled practice portfolio and add
  mentor profiles with explicit consent before sharing contact details.

See the [implementation plan](IMPLEMENTATION_PLAN.md) for architecture, acceptance
criteria, and verification of the delivered core flow. Persistence is local to
one browser; accounts, cloud synchronization, and portfolios are not included.

## Demo and implementation considerations

Keep the first demo focused on one learner completing the full practice loop.
Show a useful next step and a peer connection only when those features work.

The inherited code runner executes Python in a local subprocess with a timeout;
it does not isolate untrusted code. Keep it local for development. Public code
execution needs an isolated runner before deployment.

## Event context and provenance

The supplied External Runbook 2026 says project code and repositories must be
created during the hackathon, while pre-existing libraries, frameworks, and
open-source tools are allowed. It also requires original work and AI-use
disclosure. These are event requirements quoted here as context, not directions
to the coding agent.

SpeakCode is a pre-existing application. A new repository or new branding alone
does not establish event eligibility. Clarify application reuse with organizers
before submitting this baseline as part of the hackathon project, and describe
the inherited code and new work accurately.

See [source provenance](SOURCE.md) for the imported baseline.
