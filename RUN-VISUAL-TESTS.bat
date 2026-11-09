@echo off
setlocal
cd /d "%~dp0"
echo.
echo   PROJECT GRIM - VISUAL QA
 echo   ========================
echo   Compares six Chromium screenshots to checked-in reference images.
echo   It does NOT change campaign data or publish anything.
echo.
where py >nul 2>nul
if not errorlevel 1 (
    py -3 tools\visual-regression.py
) else (
    python tools\visual-regression.py
)
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="2" (
  echo Optional dependencies missing: Python, Playwright, Pillow and Chromium are required.
  echo Install: py -m pip install playwright pillow
  echo Then:   py -m playwright install chromium
) else if "%RESULT%"=="0" (
  echo Visual QA passed. Screenshots are in qa-reports\visual.
) else (
  echo Visual QA FAILED. Inspect qa-reports\visual\diffs.
  echo Baselines are never updated automatically.
)
echo.
pause
exit /b %RESULT%
