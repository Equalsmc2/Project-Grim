---
name: project-qa-agent
description: Run and extend a repository's Project QA Playwright harness, investigate browser and screenshot failures, and interpret Bedrock Test Lab evidence. Use for website QA requests or an established Test Lab report; does not provide a Minecraft runner or ongoing AI service.
---

Locate the harness by finding qa.project.mjs and package.json named project-qa-agent. Read its README and the project's own instructions. Confirm the profile, server command, routes and test accounts belong to the requested project. Start with a local or test environment and existing deterministic flows. For Soul Seekers, preserve local mode and external request isolation unless live-service testing is explicitly requested.

Use npm ci and the pinned Playwright browser installation, then run the relevant tests. Prefer locators based on role/name or stable test IDs. Assert the user-visible consequence of each interaction; a successful click alone is not a pass. Add meaningful flows for changed behavior. Do not describe device emulation as real-device coverage.

Read artifacts/summary.md, qa-report.json and the HTML report. Use traces and browser-diagnostics to separate application faults, environment failures, broken tests, flaky retries and missing baselines. When browser startup or installation fails, report that no UI test executed. Report skipped checks and untested routes explicitly.

Capture mode produces evidence only. Compare mode checks reviewed baselines. Never update snapshots simply to turn a failure green. Inspect expected/actual/diff images, identify whether the product change was intended, and retain evidence. Baselines must match OS, browser version, fonts and data. Keep masks narrow and documented; don't hide critical UI.

During an active authorized repair task, reproduce, make a scoped fix, then rerun the affected test and relevant regression checks. Stop and explain if the same failure persists after two repair attempts or a missing external prerequisite blocks progress. Do not weaken assertions or remove failing tests without a demonstrated incorrect test contract. Do not promise repairs after the chat stops; CI only runs tests. A separate agent and runner need explicit configuration for ongoing repair.

For Bedrock, read docs/BEDROCK.md in the harness. Validate imported logs using scripts/bedrock-report.mjs. Treat launched/skipped as incomplete and distinguish offline fixture tests from real game execution. Do not infer rendering, multiplayer or gameplay correctness from manifest checks or simulated logs.

Finish with scope, command, actual pass/fail/skip results, artifact locations, findings and remaining limits. Never include credentials, session state or private user data in committed evidence.
