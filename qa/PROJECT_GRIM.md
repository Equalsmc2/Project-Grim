# Project Grim QA integration

Runs existing Node regressions plus desktop Chromium, mobile Chromium and mobile WebKit UI tests on pushes and PRs. Tests use isolated local state and block external requests.

Scope: DM navigation/music filtering, local round persistence, viewer motion preference, route/layout checks, screenshots and error diagnostics. Stage screenshots use webgl=0; no WebGL/shader or live Firebase claim.

First run uses capture mode. Use manual generate_baselines, inspect/commit Linux images, then set repository Actions variable QA_VISUAL=compare for regression gating. Never accept baseline updates blindly. No background AI repair is configured.

The repository skill is local project guidance; it is not ChatGPT account registration.
