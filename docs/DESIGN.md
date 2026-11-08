# SkillRelay interface direction

## Brief

A professional practice workspace for early-career developers learning to
explain technical work. The main action is deliberate practice, so the interface
should feel closer to a focused study environment than a promotional landing
page. Preserve the existing goal, code, explanation, lesson, and progress flow.

## Design tokens

- Canvas: mist `#F3F6F8`.
- Surface: white `#FFFFFF`.
- Text: ink `#182B3A`.
- Primary action: deep teal `#116B64`.
- Supporting accent: pale teal `#E4F1EE`.
- Editor: midnight blue `#152433`.

Use Manrope, hosted locally under its OFL license, for navigation, body text, and
headings. Hierarchy comes from size and weight rather than several font families.
Keep a monospace face inside code and examples. Body text stays left aligned,
with readable line lengths and visible focus states.

## Layout exploration

Option A: add a permanent sidebar. This would use valuable horizontal space and
duplicate a navigation system with only two destinations.

Option B, selected: a quiet top navigation and a split practice workspace.
The challenge stays visible beside the learner's work. On mobile, stack the
challenge and workspace; constrain the reading panel rather than the page.

```text
+-------------------------------------------------------------+
| SkillRelay             Practice  Progress                    |
+-------------------------------------------------------------+
| Make your thinking clear.          Learning focus [select]   |
| Solve. Explain. Learn what to practice next.                 |
+----------------------+--------------------------------------+
| Challenge / Change   | 1 Solve | 2 Explain | 3 Feedback      |
| Two Sum              |                                      |
| Requirements         | Editor / explanation / next lesson   |
| Examples             |                                      |
| Explanation guide    | Contextual primary action            |
+----------------------+--------------------------------------+
```

## Review against the brief

The previous dark green surfaces and bright green buttons gave every element
similar weight. Remove the gradient banner, repeated uppercase labels, and
decorative arrows. Use a light reading surface and a dark editor because they
serve different tasks. Keep teal concentrated on the active step and primary
action. The memorable element is the split study workspace, not decoration.

## Interaction improvements

- Place actions beside the work they affect: run with code, record/analyze with
  the explanation, save/retry with feedback.
- Label the three main stages as a real sequence and keep follow-ups separate.
- Give the challenge picker a native dialog, close control, Escape support,
  focus management, and clear notice when changing a challenge discards a draft.
- Use real hash links for Practice and Progress so browser navigation works.
- Provide a skip link, form labels, visible keyboard focus, and reduced motion.
- Add an undo action for individual history removal; preserve confirmation for
  clearing the entire history.
- Show useful empty states without fabricated progress, streaks, or charts.

## References applied

- `frontend-design` from `anthropics/skills`.
- `web-design-guidelines` from `vercel-labs/agent-skills`.
- Manrope from Google Fonts, distributed under the SIL Open Font License.

The interface guidelines are applied to this app's relevant surfaces; they do
not authorize unrelated account, hosting, or publication changes.

## Delivered review

The initial pass was visually checked in Chrome on desktop and at 390 px width.
Refinements removed nested example borders, kept test inputs/results compact,
and moved recording/feedback actions into the explanation step. The native
challenge dialog and history Undo were checked interactively. See
[validation](VALIDATION.md) for evidence and remaining limitations.
