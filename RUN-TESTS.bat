@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Project Grim - Automated Quality Checks
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS and try again.
  pause
  exit /b 1
)
echo.
echo Project Grim - Automated QA
 echo ===========================
node tools\run-tests.mjs %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo [PASS] Test report: qa-reports\last-run.md
) else (
  echo [FAIL] Review qa-reports\last-run.md and the output above.
)
pause
exit /b %RESULT%
