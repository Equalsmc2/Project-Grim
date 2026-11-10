PROJECT GRIM QA - ONE-CLICK INSTALLER

If you downloaded Install-Project-Grim-QA.cmd, double-click that single file.
It contains this entire installer and unpacks itself into a temporary folder.

If you downloaded the ZIP, extract all files, then double-click Install-Project-QA.cmd.

The installer finds Project-Grim in your Windows user's OneDrive/Documents/GitHub
or Documents/GitHub folder. If it cannot find one unambiguous checkout, it opens
a folder picker. It uses your actual Windows username, not a hardcoded desto/deste.

WHAT IT DOES
- Adds qa/ with the prepared Playwright framework and Project Grim-specific tests.
- Adds .github/workflows/project-qa.yml for automatic tests on pushes and PRs.
- Adds .agents/skills/project-qa-agent/SKILL.md as local repository instructions.
- Adds PROJECT_QA_SETUP.md with setup and coverage details.
- Leaves existing website code, media, configurations, package.json and CI untouched.
- Checks all destination files before writing. Conflicts stop installation.
- Matching existing files are left unchanged, so rerunning this version is safe.
- Attempts dependencies, browser installation, and tests if Node.js 22+ and npm
  are available. Otherwise it still installs the files for GitHub Actions to run.
- Saves results under qa/artifacts/installation-<date>/, ignored by Git.
- Does not commit, push, deploy, install a system-wide runtime, or register ChatGPT.

PUBLISH USING GITHUB DESKTOP
1. Select Project-Grim. QA additions should now appear in Changes.
2. Review the changes. Enter "Add Project QA browser tests" and click Commit to main
   (or use a new branch if you prefer).
3. Click Push origin.
4. Open the repository on GitHub, choose Actions, and inspect Project QA.
   A file existing locally does not mean Actions has run. GitHub must allow Actions.

WHAT THE WEBSITE TESTS COVER
21 checks across desktop Chromium, mobile Chromium and mobile WebKit:
DM/stage loading and layout, music navigation/filtering, round persistence,
stage motion preference persistence, screenshots, and browser errors.
The stage intentionally uses its 2D fallback; this is not a WebGL/shader test.
Cloud requests are isolated. Live Firebase and media playback are not tested.
The included demo exists only for harness self-tests, not as the website target.

VISUAL REGRESSION
Initial runs save screenshots; they do not compare against approved Grim designs.
To start comparison, run Project QA manually on GitHub with generate_baselines,
review/download the Linux screenshots, add them under qa/tests/baselines, commit
and push, then set repository Actions variable QA_VISUAL=compare. An agent with
artifact/write access can perform this review/setup. Ordinary runs never approve
new baselines automatically. Windows demo reference images are not Grim baselines.

CHATGPT SKILL
The separate Project-QA-Agent-Private-Plugin.zip contains a prepared skills-only
plugin with the full framework. Plugin Creator is installed, but this session
does not expose its create_plugin account-save tool. Project QA Agent itself has
NOT been registered or verified in ordinary ChatGPT chats.

LIMITS
Routine Actions tests need no Work Mode after publishing. An active capable agent
can investigate and repair failures; no background autonomous repair agent exists.
Bedrock reporting/preparation is included, but the original Test Lab pack/exporter
and an actual Minecraft runner are still required.

For local reruns after installation: qa/RUN-QA.cmd.
Read VALIDATION.md delivered with this download for the actual creation-time tests.
