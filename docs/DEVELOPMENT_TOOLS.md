# Design skills and browser tooling

## Installed for Codex

The development machine has these user-level skills:

- [Impeccable](https://github.com/pbakaus/impeccable), version 4.8.0,
  installed from `.agents/skills/impeccable` into `~/.codex/skills/impeccable`.
- [Taste](https://github.com/Leonxlnx/taste-skill), version 2.5.1,
  installed from `skills/taste-skill` into
  `~/.codex/skills/design-taste-frontend`.
- [Playwright CLI](https://playwright.dev/docs/getting-started-cli), installed
  into `~/.agents/skills/playwright-cli` and linked from
  `~/.codex/skills/playwright-cli` for Codex discovery.

The existing `frontend-design` and `web-design-guidelines` skills are retained.
The new skills are available to Codex on the next turn. Their files were also
read directly for this polish pass. These user-level installations are outside
the application repository; teammates install them separately with their
agent's skill installer.

`$impeccable polish` is useful for scoped app refinements. Taste's current
workflow is mainly for marketing websites. Its clarity, visual consistency,
accessible controls, and responsive checks inform the practice workspace; its
hero templates and mandatory promotional effects do not replace this app's
task-oriented interface. See [the design brief](DESIGN.md).

## Playwright CLI

The frontend pins the resolved dependency in `package-lock.json`:

```sh
cd frontend
npm install -D @playwright/cli@latest
npx playwright cli install --skills=agents --global
```

The installed CLI package is `@playwright/cli` 0.1.23. Using `--skills=agents`
selects shared agent skills rather than the default Claude-only destination.
No production dependency or additional backend package is required.

## Browser regression check

Start the backend and frontend following the README. From `frontend`, open a
fresh, isolated browser session, run the checked-in function, then close it:

```sh
npx playwright cli -s=skillrelay-ui open http://127.0.0.1:5173/ --browser=chrome
npx playwright cli -s=skillrelay-ui run-code --filename=tests/practice-ui.js
npx playwright cli -s=skillrelay-ui close
```

Close an existing session with the same name before rerunning the test. The
test saves one attempt in that isolated browser's temporary storage. It does
not use the regular Chrome profile or change the user's saved practice.

The check verifies feedback hierarchy and focus, lesson disclosure, focused
retry and summary persistence, the goal-switch regression, and the accessible
follow-up answer. It checks page overflow at 1440, 1024, 768, and 390 pixels.
AI responses are explicitly labeled fixtures. It does not evaluate model
quality, microphone capture, or the Python runner.

CLI snapshots and console artifacts under `frontend/.playwright-cli/` are
ignored by Git. Keep credentials and browser storage exports out of commits.

For interruption and delayed-response regressions, use another fresh isolated
session and run `tests/reliability-ui.js` instead of `tests/practice-ui.js`.
It installs a simulated SpeechRecognition API in that test browser; it never
requests the microphone. Both scripts use the currently open local origin.

`tests/motion-ui.js` checks animation interruption, draft/focus preservation,
replay alignment, and reduced-motion behavior. It creates and closes its own
isolated browser context and uses labeled AI fixtures; it does not use the
microphone, runner, or regular Chrome practice data.
