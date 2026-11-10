@echo off
setlocal
cd /d "%~dp0"
set "QA_PROFILE="
set "QA_EXTERNAL="
set "QA_BASE_URL="
set "QA_SITE_DIR="
set "QA_START_COMMAND="
set "PLAYWRIGHT_BROWSERS_PATH=%LOCALAPPDATA%\ProjectQA\browsers"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer with npm is required for local tests. GitHub Actions provides its own runtime.
  pause
  exit /b 1
)
if not exist node_modules\playwright\cli.js (
  call npm.cmd ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto failed
)
node node_modules\playwright\cli.js install chromium webkit
if errorlevel 1 goto failed
call npm.cmd test
set "QA_EXIT=%ERRORLEVEL%"
echo.
echo Results: %CD%\artifacts\summary.md
pause
exit /b %QA_EXIT%
:failed
echo Dependency or browser setup failed. Existing project files were not changed.
pause
exit /b 1
