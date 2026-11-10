# Validation record — November 10, 2026

## Environment and provenance

Executed on Windows with Node 24.22.1 and pinned @playwright/test 1.56.1. Browsers: Chromium 141.0.7390.37 / build 1194 and WebKit 26.0 / build 2215. The host initially had no npm command; a temporary npm 10.9.2 installation was used to install dependencies. Dependencies/browser downloads and local browser connections required environment permission. No such temporary tools are included in the source ZIP.

The referenced Continue Seven Relics Development conversation was read. GitHub returned an empty accessible repository list. An existing local source tree was found at the prior October 31 Soul Seekers task's `work/source/WEBSITE` directory (package soul-seekers-act-iii, version 40.10.0; UI stamp also mentions quick combat 40.15). That website was served read-only from its existing folder. No source changes, cloud database changes or GitHub writes were performed.

## Executed checks

| Check | Observed result |
|---|---|
| Node server/report-import tests | 10 passed |
| Demo initial capture run | 14 passed, 1 failed: mobile WebKit hardware-keyboard link tab order |
| Demo final, compare mode, CI=true | 13 passed, 2 explicitly skipped, 0 failed/flaky |
| Demo screenshot baselines | Three Windows baselines generated, visually inspected, then compared successfully |
| Deliberate screenshot mutation | Correctly failed: 12,214 changed pixels; expected/actual/diff PNGs, screenshot, trace and video produced |
| Soul Seekers final, capture mode | 7 passed, 3 failed, 2 explicitly skipped |
| Bedrock sample import | Expected exit 1 / incomplete because an external suite was merely launched |
| Skill validator | Passed |
| Workflow YAML | Parsed; trigger names and read-only permissions checked |

The demo keyboard test is now explicitly desktop-only: the mobile profiles represent touch-device layouts, not hardware-keyboard tab-order behavior. The mobile form and menu interaction checks still run. This scope correction does not prove hardware-keyboard accessibility on mobile.

Soul Seekers initially used a desktop-only tab as its page-ready marker. Source and screenshots showed that tab is intentionally hidden on phones. The adapter now waits for the shared mainDashboard. No application code was altered to satisfy the tests.

## Soul Seekers finding

All three executed mobile WebKit tests fail the strict browser-error check with:

```text
Viewport argument key "interactive-widget" not recognized and ignored.
```

This is a browser compatibility diagnostic, not proof that the tested interactions failed. Desktop Chromium and mobile Chromium checked loading/layout, captured screenshots and submitted a local message; desktop tab switching also passed. The WebKit test bodies reached their assertions, but their overall outcomes remain failed because browser diagnostics are part of the contract. The profile does not suppress this diagnostic. Decide separately whether the site's viewport setting needs a compatibility adjustment or a narrow, documented exception.

The Windows Playwright runner additionally printed `Internal error: step id not found: fixture@...` while recording these WebKit failures. Reports still recorded the expected failures and saved evidence, but WebKit trace step completeness is not guaranteed. No corresponding internal message appeared in the final passing demo run. This runner diagnostic was not represented as an application bug.

Soul Seekers screenshots use capture mode only; no design baselines were approved. The weather canvas and world-banner are masked, so those visuals are excluded even from the captured view. Local mode and blocked external requests exclude Firebase, external music/video, and live synchronization from coverage. The adapter is intentionally a starting set of checks, not comprehensive project certification.

## Evidence

The separate `Project-QA-Evidence.zip` contains:

- `demo-final/`: final passing demo report with CI settings and Windows screenshot comparison.
- `soul-seekers-final/`: final project findings, diagnostics and failure attachments.
- `intentional-visual-failure/`: deliberate mutation demonstrating regression detection.

Each folder includes summary.md, qa-report.json, results.json, junit.xml, html and test-results where generated. After installing the harness dependencies, open an archived report with `npx playwright show-report /path/to/extracted/demo-final/html` (substitute the desired report). Paths in archived raw reports may reference the original execution folder; HTML attachments are copied into each HTML report for portability.

## Not executed or configured

- GitHub-hosted Linux CI: workflow is supplied but has not run on GitHub. Generate/review Linux baselines before enabling compare mode there. The delivered Windows baselines are only for the demo.
- Physical Android/iPhone devices, Safari on an actual iPhone, Firefox, complete accessibility/performance/security audits.
- Authenticated production workflows, payments, external services or backend correctness.
- Bedrock pack inspection, real GameTest execution, client screenshots, graphics/shaders, multiplayer, or integration with the earlier unavailable .mcaddon.
- Background AI repair, issue creation, PR creation, deployment or global skill installation.

The Bedrock importer unit tests and sample log are offline fixtures only. A passing importer test does not mean a Minecraft feature passed.
