---
name: SkillRelay
description: A focused charcoal workspace for coding and explaining technical choices.
colors:
  canvas: "#141414"
  surface: "#1c1c1c"
  raised: "#232323"
  editor: "#181818"
  hover: "#2b2b2b"
  ink: "#ededed"
  body: "#c5c5c5"
  muted: "#a0a0a0"
  border: "#343434"
  border-strong: "#505050"
  accent: "#eab86b"
  accent-hover: "#f1c887"
  accent-soft: "#30291f"
  accent-ink: "#241b0e"
  success: "#8ec5a3"
  success-soft: "#202e26"
  danger: "#ee9aab"
  danger-soft: "#35242a"
typography:
  problem-title:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  control:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.5
  supporting:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
  code:
    fontFamily: "Menlo, Consolas, Monaco, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  tag: "4px"
  control: "6px"
  panel: "8px"
spacing:
  tight: "4px"
  small: "8px"
  workspace-gap: "10px"
  compact: "12px"
  standard: "16px"
  panel: "20px"
  review: "22px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "7px 8px"
  explanation-field:
    backgroundColor: "{colors.editor}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
  navigation-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  topic-tag:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.body}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
  review-card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  test-case:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.body}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
---

# Design System: SkillRelay

## Overview

**Creative North Star: "Focused engineering tool"**

SkillRelay is a deliberate practice workspace for coding, explaining technical
choices, and reviewing session feedback. The user-approved system uses neutral
charcoal throughout, restrained warm amber, and compact controls. It keeps the
problem, code, and explanation adjacent on desktop, with the largest flexible
area reserved for code. A compact session toolbar leads directly into the work.

This document merges the existing workspace and interaction constraints with
the implemented dark system. The visual source of truth is
`frontend/src/index.css`, `App.css`, `Learning.css`, the Monaco theme in
`components/CodeEditor.jsx`, and shared behavior in `lib/motion.js`,
`components/TabIndicator.jsx`, and `components/Disclosure.jsx`. Interface copy
must continue to describe real capabilities and saved data accurately;
styling does not establish learner
outcomes or microphone capture quality.

**Key Characteristics:**

- Neutral dark surfaces separated by tone and thin borders.
- Warm amber for the primary action, selection, and keyboard focus.
- Compact, left-aligned Manrope text; monospace for code and test values.
- Actions beside the work they affect, with evidence available on demand.
- A three-column desktop workspace that becomes a naturally scrolling stack.
- Brief motion confirms navigation and newly available content without delaying work.

## Colors

Charcoal provides a quiet shared setting for reading, editing, and explaining;
warm amber makes the most consequential controls easy to locate.

### Primary

- **Warm Amber** (`accent`): primary feedback and submission actions, selected
  tabs and checkpoints, focus outlines, caret, and selected emphasis.
- **Light Amber** (`accent-hover`): the hover response for amber controls.
- **Amber Wash** (`accent-soft`): pending challenge choices, selected replay
  checkpoints, and warnings; pair with a border or text state.
- **Dark Amber Ink** (`accent-ink`): text on filled amber controls.

### Neutral

- **Charcoal Canvas** (`canvas`): the page and workspace shell.
- **Panel Charcoal** (`surface`): navigation, reading panes, toolbars, and review.
- **Raised Charcoal** (`raised`): secondary controls, examples, and lesson cards.
- **Editor Charcoal** (`editor`): code, editable explanations, and code evidence.
- **Hover Charcoal** (`hover`): interactive surface response.
- **Off-white Ink** (`ink`): headings, active controls, and primary text.
- **Reading Gray** (`body`): prose and supporting evidence.
- **Supporting Gray** (`muted`): descriptions, timestamps, and quiet labels.
- **Quiet Border** (`border`): pane divisions and structural rules.
- **Strong Border** (`border-strong`): fields, secondary controls, and quotations.

Success and danger are semantic exceptions to the single accent: `success` and
`success-soft` identify accepted checks and saved/restored states; `danger` and
`danger-soft` identify failed checks, errors, destructive actions, and live
microphone state. Difficulty labels reuse these semantic families. Monaco adds
muted syntax hues for comments, keywords, strings, and numbers; they are code
syntax, not a second interface accent.

**The Restrained Accent Rule.** Use amber for action, selection, and focus;
keep ordinary containers and reading surfaces neutral.

## Typography

**Interface Font:** Manrope, locally hosted with its SIL Open Font License;
fallbacks are Segoe UI and sans-serif.

**Code Font:** Menlo, Consolas, Monaco, monospace.

The interface has no display or marketing type role. Hierarchy comes from
compact size changes, weight, spacing, and text tone. Body content stays left
aligned. The frontmatter records reusable roles rather than every local heading.

### Hierarchy

- **Problem title:** the main challenge heading; use `problem-title`.
- **Section title:** lesson headings; use `section-title`. Review and replay
  headings use the neighboring compact heading sizes already in the source.
- **Body:** problem statements, lesson instructions, and conversation text;
  use `body`. Longer learning and replay prose is constrained to roughly
  (72–75ch) where the layout allows.
- **Control:** shared buttons; use `control`. Navigation and pane controls use
  closely related medium weights rather than another font family.
- **Supporting:** status, context, and quiet descriptions; use `supporting`.
- **Code:** the editable Monaco content; use `code`. Compact test values and
  evidence use the same monospace family at the smaller sizes in the source.

Scores and timestamps use tabular figures. Supporting text remains legible;
recover space from chrome before shrinking text. The interface uses sentence
case rather than repeated uppercase labels.

**The Working Type Rule.** Keep Manrope for interface text and reserve
monospace for actual code, examples, and test values.

## Layout

The desktop app fills the viewport (100dvh) with a compact top navigation
(52px), a session toolbar (minimum 60px), and the remaining workspace. The
outer workspace has a problem column (`minmax(244px, 28%)`) and a flexible
work column. Within the work column, code and tests take the flexible space;
the explanation column is constrained by `clamp(264px, 21vw, 296px)`. This
forms the approved three-column problem/code/explanation arrangement.

Pane headers align through shared minimum heights. Small gaps separate major
panes; thin borders divide content inside a pane. The spacing vocabulary in
frontmatter reflects the repeated compact gaps and reading padding. Avoid
adding a permanent sidebar to the existing two-destination navigation.

Desktop panes scroll internally. At widths up to (980px), the problem stacks
above the work area in a bounded reading panel
(`clamp(340px, 45dvh, 390px)`) with a scrollable body. The rest of the page
returns to natural scrolling; code and explanation remain adjacent when
they fit. At widths up to (700px), code,
tests, and explanation form a single column, the goal control stacks, and
shared controls grow to minimum (44px) touch targets. The intermediate
(1250px) and (1100px) rules reduce secondary chrome before changing structure.
Short desktop viewports reduce console height rather than hiding the work.

Review, retry, and follow-up reuse the work pane. Progress is a centered
reading surface with a maximum width (1120px), and its two-column history
list becomes one column on phones. Long code, quotations, and labels wrap
or scroll within their designated region without widening the page.

**Adjacent work.** Keep run/reset beside code, microphone/feedback
beside explanation, and save/retry beside feedback.

## Elevation & Depth

The implemented system has no box-shadow vocabulary. Depth comes from the
canvas/surface/raised/editor tones and thin borders. Native dialogs use the
browser top layer with a dark translucent backdrop. Hover changes tone or
border; it does not lift the element. Do not add decorative gradients or glow.

**The Tonal Depth Rule.** Separate working regions with tone and borders;
reserve the dialog top layer for an actual modal task.

## Shapes

Use gently rounded panels, tighter controls, and small tag corners from the
frontmatter radius scale. Borders are generally thin (1px). Workspace tabs use
a measured amber indicator and console tabs use an amber bottom rule (2px);
keyboard focus uses a visible
amber outline (2px) with an offset (3px), inset at textareas. State dots remain
small circles. The existing brand mark keeps its own rounded square geometry.

Quotation borders mark quoted evidence. They are not decorative colored card
accents and should not be generalized into unrelated containers.

## Components

### Buttons

Compact and predictable. Primary controls use amber with dark ink; secondary
controls use raised charcoal, a strong neutral border, and off-white text.
Destructive/stop controls use the danger family. Text controls remain quiet
until hover. Shared controls have minimum height (36px) on desktop and grow
on phones. A disabled control uses reduced opacity (0.45) and a disabled cursor.

Hover shifts fill and border. Primary and secondary action buttons move down
slightly (1px) while pressed; danger and text buttons retain their existing
stationary press treatment. Keyboard focus uses the shared outline. Loading
states retain a descriptive action label, such as "Running…" or "Getting
feedback…", rather than relying on an unexplained spinner.

### Chips

Topic tags are neutral, compact, and noninteractive. Difficulty labels use
the semantic success/amber/danger family with text labels. Test-case selectors
are actual buttons: neutral at rest, higher contrast when selected, and
success/danger borders when the selected case has a result. Keep accessible
selection and result labels as well as color.

### Cards / Containers

Main panes use panel charcoal with quiet borders. Examples and lesson cards
use raised charcoal; lesson cards have the stronger border. Review and
history surfaces retain the same restrained radius and padding vocabulary.
Group related content without repeating colored cards for every paragraph.

Feedback leads with the AI practice score and next lesson. Native disclosure
keeps lesson reading, rubric evidence, and source quotations available without
forcing them ahead of the practice action. Replay supplies Previous/Next
checkpoint controls as well as the horizontally scrollable checkpoint list.

### Inputs / Fields

Textareas use editor charcoal, off-white text, a strong neutral stroke, and
the control radius. Use labels and visible keyboard focus. The explanation
field becomes read-only during microphone input; its status text explains
starting, listening, and final-transcript states. Typed explanation remains
the browser fallback when voice input is unavailable. Follow-up answers have
a visible label and the conversation uses an accessible log.

The learning-focus control remains a native select. Its description stays
programmatically connected without taking another toolbar row. Changing
focus invalidates feedback for the old goal and
returns a focused retry to code/explanation while preserving the working
code and explanation.

### Navigation

Use real Practice and Progress hash links, including `aria-current` for the
current destination. The active link has a raised neutral background; its
small icon receives amber. The work-pane view controls use pressed states
and an amber underline, with unavailable feedback disabled. The underline
follows the selected workspace control using measured position and width;
its first render starts at the measured position. Keep hidden
work panes mounted so view changes preserve working state. Preserve the
skip link and focus movement into feedback and retry headings.

### Display Preferences

The top navigation includes a labeled Display settings button (Display on
phones) opening a native, nonmodal popover. Three native selects independently
control text size (Default/Large/Larger), layout (Columns/Stacked), and reduced
motion (Follow system/Reduce). The panel closes with Escape, its close button,
or an outside click. Keyboard opening moves focus into the controls; native
Escape and the close button restore focus to the trigger.

Choices apply immediately and persist in a separate local-storage entry;
clearing practice history does not reset them. Storage failures leave the
controls functional and explain that the settings could not be saved. No
account or AI request is needed. Interface type scales from a 14px root to
16px or 18px; Monaco receives the same size with proportional line height.
The default type sizes and charcoal/amber system stay unchanged.

Stacked layout uses the existing mounted panes in a naturally scrolling page:
problem, code/tests, then explanation. Hidden views stay hidden and drafts,
undo history, active requests, and current challenge remain intact. Columns
continues to adapt to screen width. OS motion reduction is always honored;
the explicit Reduce preference also disables CSS motion and cancels active
JavaScript arrivals and smooth scrolling immediately.

### Challenge Dialog and Draft Safety

Keep the native challenge dialog with a close control, Escape handling,
focus management, and a clear draft-loss confirmation. A pending choice uses
the amber selection treatment. The dialog and backdrop arrive briefly on
opening; closing and Escape retain immediate native behavior. Preserve reset
undo, undo for removing an individual saved attempt, and confirmation before
clearing all saved history.

### Progress and Privacy Copy

Show actual saved summaries and useful empty states. Raw code, full
explanations, and replay remain session-only; browser history stores selected
summary fields rather than drafts. Do not describe the browser save as draft
recovery. Feedback requests use code, explanation, and checkpoints, so local
summary storage must not be presented as a claim that all processing is local.
AI practice scores remain learning signals rather than credentials or hiring
assessments. Preserve the existing source attribution and data notices.

### Motion

Shared motion values live alongside the visual tokens in `index.css`:
`--motion-fast` (120ms) for control state, `--motion-standard` (180ms) for
arrivals and the workspace indicator, `--motion-dialog` (200ms) for opening
the challenge dialog, and `--motion-ease` (`cubic-bezier(0.16, 1, 0.3, 1)`)
for the restrained ease-out response. Control colors and borders use `ease`;
press movement uses the shared easing. Rubric widths update immediately.

Content arrivals are brief opacity changes (0.72 to 1) after an intentional
view change, a new notice or retry result, a checkpoint selection, or opening
lesson/evidence disclosure. Newly added follow-up messages also move a small
distance (4px) into place. Native disclosures open and close immediately;
their opened contents may fade without animating height. The measured tab
indicator uses transform rather than animating layout dimensions. The initial
page, editor surface, keystrokes, and unrelated state updates do not receive
arrival animation. Focus and content availability do not wait for motion.

The challenge dialog opens from a subtle offset (6px), scale (0.99), and
opacity (0.8); its backdrop fades with `ease-out`. There is no animated delay
before native closing. The live microphone dots retain their status pulse
(1.6s, ease-in-out); the explanation dot pauses while its pane is hidden.
Mounted hidden panes and drafts retain their existing behavior.

Reduced motion disables CSS animations and transitions, including the dialog
backdrop, and removes pressed-button displacement and smooth scrolling. The
shared Web Animations helper checks the preference before starting and cancels
active arrivals if that preference changes. It also skips hidden documents,
unrendered elements, and elements hidden by visibility; replacement or cleanup
cancels the previous arrival. Follow-up auto-scroll runs only near the bottom
of the conversation and chooses `auto` when reduced motion is requested.
Replay scrolls an out-of-view checkpoint into its own horizontal track,
using `auto` on initial placement or under reduced motion.

## Do's and Don'ts

### Do:

- **Do** keep the problem, code, and live explanation adjacent on desktop.
- **Do** use neutral surfaces and reserve amber for action, selection, and focus.
- **Do** keep controls beside the work they affect and preserve visible labels.
- **Do** preserve keyboard focus, native disclosure/dialog behavior, and reduced motion.
- **Do** keep real saved summaries, explicit data notices, and useful empty states.
- **Do** retain locally hosted Manrope and use monospace for code and test values.
- **Do** use brief motion to confirm deliberate navigation and newly available content.

### Don't:

- **Don't** restore the large introduction or add a marketing hero to the workspace.
- **Don't** add decorative gradients, glow, generic icon tiles, or repeated colored cards.
- **Don't** shrink supporting text to compensate for excess chrome.
- **Don't** use color alone to communicate selected, failed, or microphone states.
- **Don't** invent streaks, activity, learner outcomes, or saved draft recovery.
- **Don't** imply that visual polish verifies microphone capture, runner isolation, or competition eligibility.
- **Don't** animate initial page load, editor updates, or keystrokes, or delay focus and native closing for motion.

Implementation QA evidence and limitations belong in [VALIDATION.md](VALIDATION.md).
This visual-system record does not replace that evidence.


## Interview curveballs

Interview curveballs extend the existing Operate workspace rather than adding
another destination. The problem pane offers a deliberate Reveal curveball
action; there is no timer or unsolicited interruption. Reveal keeps the editor
and explanation, freezes a before snapshot, replaces conflicting requirements,
and adds visibly identified runnable cases. The requirement stays beside the
work. The learner can inspect the original code/explanation and request a
separate adaptation review; tests remain usable without AI. Three evidence
checks assess communication separately from code correctness. Changing code
or explanation clears the review and cancels any pending result.

The shared server-owned catalog selects the exact same variant for the UI,
runner, analysis, focused retry, and follow-up. Revealing a requirement change
starts fresh feedback/replay context. Saved summaries carry the variant label;
comparisons require matching problem, goal, and variant.
