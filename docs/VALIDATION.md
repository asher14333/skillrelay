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
