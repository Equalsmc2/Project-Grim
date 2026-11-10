# Project QA Agent

Portable browser checks that run on your computer or GitHub Actions without an active chat. Includes desktop Chromium, Android-style Chromium emulation, iPhone-style WebKit emulation, interactions, layout checks, screenshots, error capture, traces/video on failure, HTML/JSON/JUnit/Markdown reports, and reusable agent instructions. The default target is a self-contained demo, not your live website.

## 1. Run the working demo

Install Node.js 22 or newer with npm. Open a terminal in this folder:

```sh
npm ci
npx playwright install chromium webkit
npm run test:unit
npm test
npm run report
```

On Linux use `npx playwright install --with-deps chromium webkit`. The development version is pinned in package-lock.json. Commit the lockfile. Upgrade package and browser binaries together, reviewing visual changes.

The demo tests navigation, menu toggling, keyboard focus, required form input and successful submission. Smoke tests check route responses, a ready element, title and horizontal overflow. Every test gets a clean browser context. Console errors, uncaught exceptions, HTTP errors and failed requests fail tests unless narrowly allowlisted in the profile. This is not a complete accessibility, performance or security audit.

## 2. Use it in any website repository

Copy this folder to `<your-repository>/qa` (omit node_modules and artifacts). Keep its separate package.json; do not overwrite the website's package.json. Configure `qa/qa.project.mjs`:

- `name`: stable lowercase project identifier.
- `baseURL`: local or staging URL.
- `command`: command to start the site, run from the qa directory; for example `npm --prefix .. run dev -- --host 127.0.0.1 --port 4173`. Install/build the parent app separately first.
- `testMatch`: keep smoke.spec.mjs and replace demo.spec.mjs with your own interaction tests.
- `routes`: named paths and reliable ready selectors, one per important view.
- `masks`: only documented dynamic regions such as clocks, never the entire feature under test.
- Error allowlists: regular expressions for explained, unavoidable errors. Empty is the default.

For a static site, the included server uses QA_SITE_DIR (default: demo). It serves real files with no SPA fallback. For a framework app use its own preview/dev server so routing matches production.

For an already-running target, set QA_EXTERNAL=1 and QA_BASE_URL to the target. This disables server startup. A different URL alone does not disable startup. Do not aim form submissions at production accounts or payment flows. Configure disposable test data and secrets separately for authenticated tests; never commit `.auth/` or `.env`. Environment variables are not loaded from .env automatically.

PowerShell example:

```powershell
$env:QA_EXTERNAL='1'
$env:QA_BASE_URL='http://127.0.0.1:3000'
npm test
```

macOS/Linux equivalent: `QA_EXTERNAL=1 QA_BASE_URL=http://127.0.0.1:3000 npm test`.

### Included Soul Seekers adapter

A local Soul Seekers v40.10 website source was accessible; Project Grim and a connected GitHub repository were not. Its adapter uses the site's explicit local transport and suppresses external network access. It does not validate Firebase or multiplayer synchronization. Configure:

```powershell
$env:QA_PROFILE='profiles/soul-seekers.mjs'
$env:QA_SITE_DIR='C:\path\to\WEBSITE'
npm test
```

Desktop tab selection and local message submission are covered. The tab interaction test explicitly skips mobile because those desktop tabs are intentionally absent there; message submission and smoke/layout/screenshot checks still run at all three sizes. See VALIDATION.md for actual findings and whether this profile passed. Errors are not silently allowlisted. The website source itself is not bundled. For CI, copy the adapter's configuration into qa.project.mjs, provide the website source, and set QA_SITE_DIR to its relative path in the workflow.

## 3. Screenshots versus regression tests

Default `capture` mode saves full-page screenshots but makes **no claim of visual regression coverage**. To create candidate baselines, set QA_VISUAL=compare, then run `npm run baseline`. Review the images under tests/baselines before committing. Run `npm test` with QA_VISUAL=compare to compare against them. Missing baselines fail rather than count as approved designs. A separate baseline is used per project, browser and operating system.

PowerShell:

```powershell
$env:QA_VISUAL='compare'
npm run baseline
# Review generated PNG files before committing them.
npm test
```

For Linux CI baselines, use the manual GitHub workflow's generate_baselines option. Download its candidate images, review them, place them under the same qa/tests/baselines path and commit them. Then set repository Actions variable QA_VISUAL to compare. Candidate generation checks only visual tests and is not a full QA pass. Never enable snapshot updates in ordinary PR runs. Windows baselines do not substitute for Linux ones. OS/browser/fonts/data must match for stable comparisons, as described in [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots).

## 4. Enable GitHub Actions

Copy `.github/workflows/qa.yml` from this package to the repository root's `.github/workflows/qa.yml`. Its commands assume the harness is in `qa/`. For a standalone harness repo, change working-directory to `.` and remove the `qa/` prefix from cache and artifact paths. Add your website's dependency installation/build steps before testing if necessary. Commit source, lockfile, workflow and approved baselines. No workflow has been uploaded or enabled on your behalf.

The workflow runs on pushes, pull requests and manual dispatch. It installs Chromium/WebKit, runs importer/server unit checks and browser tests, then uploads evidence even if tests fail. It has read-only repository permission and never pushes repairs or baseline changes. CI retries once, reports flaky outcomes, and fails on flakiness. Read the run's job summary and download qa-evidence. Installation/startup failures may occur before browser reports exist; inspect the job log in that case. Artifacts expire after 14 days and can contain page content, URLs and input values, so use synthetic data. GitHub execution limits and billing depend on your account.

Follow [Playwright's CI setup](https://playwright.dev/docs/ci) when adapting runners.

## 5. Reports and investigation

- `artifacts/summary.md`: outcome, flaky/skipped counts, failing test locations and errors.
- `artifacts/qa-report.json`: compact machine-readable attempts and evidence paths.
- `artifacts/results.json`, `junit.xml`: standard integrations.
- `artifacts/html/`: interactive report, including attached browser diagnostics.
- `artifacts/test-results/`: failure screenshots, traces and videos; screenshot comparisons include expected/actual/diff when available.

Use `npm run report`, or `npx playwright show-trace path/to/trace.zip`. Reproduce the same test/project with `npm test -- --project=desktop-chromium --grep "test name"`. Reports are overwritten by the next run; archive evidence first when investigating. No automatic issue posting, deployment, code editing or AI repair is performed.

## 6. Reuse the instructions

The portable skill is `skills/project-qa-agent/SKILL.md`. Copy its folder to your agent's supported skills directory, or explicitly give the agent that file plus this harness and request a QA run. The skill is shipped here, not installed globally. It guides evidence collection and active-task repair; it does not grant tools, credentials, compute, background operation or unlimited usage. Agents without skill support can read it as project instructions.

## 7. Bedrock path and limits

Read [docs/BEDROCK.md](docs/BEDROCK.md). The working log importer distinguishes passed, failed, skipped and merely launched tests, detects incomplete/invalid runs and generates reports. The illustrative log intentionally reports incomplete. Integration with the earlier Test Lab .mcaddon needs its actual source/exporter. No Minecraft gameplay, visuals or multiplayer tests were run or configured by this package.
