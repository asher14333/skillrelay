# Baseline validation

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
Live AI calls, browser speech recognition, and full backend integration have
not been tested. No API key was configured during repository setup.
