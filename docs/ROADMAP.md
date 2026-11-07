# SkillRelay: proposed hackathon scope

## Prompt and audience

Proposed direction: Prompt 2, helping people develop in-demand skills and build
meaningful networks in a changing job market. Start with students, newcomers,
and early-career developers who need practice explaining their technical work.

The existing interview coach fits the career transitions and communication focus
area. Personalized practice and peer connections are proposed extensions.

## Core demo loop

1. Choose a technical skill and a practice challenge.
2. Solve the challenge and explain the approach by voice or text.
3. Receive specific feedback and one recommended next practice step.
4. Save a practice summary as evidence of progress.
5. Find a compatible practice partner using learning goals and availability.

## Implementation order

- **Existing baseline:** five coding challenges, editor, code execution,
  voice transcription, rubric feedback, and interview follow-up questions.
- **First enhancement:** turn feedback into a short, actionable learning plan;
  keep typed explanations available alongside voice.
- **Second enhancement:** persist practice history and show progress across
  sessions. Label AI feedback as practice feedback, rather than certification.
- **Third enhancement:** add an opt-in peer practice directory with matching by
  goals, skills, and availability. Clearly label seeded demo profiles.
- **If time permits:** export a learner-controlled practice portfolio and add
  mentor profiles with explicit consent before sharing contact details.

Only the existing baseline is implemented at repository creation. The features
above are a proposal, not completed functionality.

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
