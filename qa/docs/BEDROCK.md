# Bedrock Test Lab: staged integration

This delivery contains a log validator/reporter and an interchange proposal. It does not contain, install, or modify the earlier .mcaddon. The earlier chat describes v0.1, but its downloadable archives were not available here and its source was not inspected. Existing logs may require a new exporter. There is no Minecraft executable, licensed client, world, server or agent configured by this template.

## Stage 1 — offline package checks

Obtain the actual Test Lab source and pin the target Bedrock version. Check archive structure, manifest UUIDs, dependencies, script syntax and test registration against that version. Keep offline results labeled offline; those checks cannot prove in-world behavior. This package's Node tests validate the report importer only.

## Stage 2 — explicit in-world run and export

Use a disposable Creative test world, copied packs and fixed test seed/configuration. Inspect the lab's cleanup behavior before running it. The earlier conversation mentions `/scriptevent testlab:all`; verify that command against the actual source/version before use. Record engine version, pack versions, start/end times and world setup with each run. A launched external suite is not a completed suite.

Add an exporter to the actual lab that emits one JSON object per line after `QA_EVENT `, for example:

```text
QA_EVENT {"schemaVersion":1,"type":"test","runId":"unique-run-id","id":"block-placement","status":"passed"}
QA_EVENT {"schemaVersion":1,"type":"run-end","runId":"unique-run-id","expected":1}
```

Version 1 requires one complete run per input file, unique nonempty IDs, a final run-end event, and an exact result count. Status is passed, failed, skipped or launched. Optional additional metadata may be included. Use a unique runId per invocation; preserve raw logs beside reports.

```sh
npm run bedrock:report -- path/to/exported-log.txt
```

Outputs are `artifacts/bedrock/qa-report.json` and `summary.md`. Exit 0 means all reported checks passed; exit 1 means failed or incomplete; exit 2 means missing/malformed/inconsistent evidence. The example.log fixture intentionally exits 1: launching a suite is not passing it. The parser trusts the supplied observations; it does not verify who produced the log or that Minecraft actually ran.

## Stage 3 — configured gameplay runner

Provision an isolated Bedrock-compatible runner for the pinned pack/API version. Establish how it installs test packs, starts a disposable world, invokes tests, retrieves logs, enforces timeout, and resets state. Confirm feature compatibility with current official documentation. Connect the importer only after a known-pass and deliberate-failure in-game test both produce correct reports. Limit self-hosted runner use to trusted code; don't execute fork pull requests on a personal gaming PC. No self-hosted workflow is enabled in this package.

## Stage 4 — client visuals and multiplayer

Rendering needs a licensed, installed Bedrock client, suitable GPU/display access, fixed resolution and graphics settings, reproducible camera positions, deterministic scenes, and a configured automation/capture driver. Multiplayer needs distinct connected clients and synchronized assertions. Server-only GameTest logs do not validate shaders, HUDs, camera behavior or actual multiplayer visuals. These stages remain unimplemented until that environment exists.

## Stage 5 — optional agent repair loop

A separately configured agent can consume artifacts, propose a scoped branch/PR, run the same suite and present the diff. Configure its credentials, scope, budget, retry limits and review policy explicitly. Neither this importer nor GitHub Actions supplies that agent.

Reference: [Microsoft GameTest introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/gametestgettingstarted?view=minecraft-bedrock-stable).
