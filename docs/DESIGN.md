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
| Challenge / Change   | Code & explain | Session feedback    |
| Two Sum              | Editor              | Explanation    |
| Requirements         |                     | Microphone     |
| Examples             | Tests               | Transcript     |
| Explanation guide    |                     | Get feedback   |
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
- Keep coding and explaining in one shared session, with feedback and follow-ups
  available as separate views.
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

## Codex skill polish

The follow-up pass applies Impeccable's Operate guidance and Taste's applicable
clarity, consistency, and accessibility guidance to this existing application.
It preserves the Manrope/teal study workspace rather than introducing a
marketing-page hero or decorative effects.

The feedback view now leads with the practice score and next lesson. Lesson
steps use native disclosure, keeping the practice action visible before replay
and detailed rubric evidence. Entering feedback or a focused retry moves focus
to its heading. The follow-up form has a visible answer label, an accessible
conversation log, and answer focus after the interviewer responds.

Changing the learning goal during a retry returns to Code & explain while
preserving the working explanation and code. It clears feedback for the old
goal, so the learner requests feedback for the new focus.

The Impeccable source detector reported three existing side-border warnings:
rubric quotes in `App.css`, saved-history quotes, and retry quotes in
`Learning.css`. They remain intentional quotation markers rather than
decorative card accents. The modified lesson callout no longer uses one.

See [development tooling](DEVELOPMENT_TOOLS.md) for skill locations and the
repeatable Playwright CLI check. Raw drafts and replay remain session-only;
this pass does not add draft recovery or establish learner outcomes.

## Delivered review

The initial pass was visually checked in Chrome on desktop and at 390 px width.
Refinements removed nested example borders, kept test inputs/results compact,
and placed recording/feedback controls beside the editor. The native
challenge dialog and history Undo were checked interactively. See
[validation](VALIDATION.md) for evidence and remaining limitations.
