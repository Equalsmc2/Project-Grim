@echo off
setlocal
cd /d "%~dp0"
set GRIM_PORT=4173
echo.
echo   PROJECT GRIM - Prototype Launcher
echo   =================================
echo   Stage: http://localhost:4173/
echo   DM:    http://localhost:4173/dm.html
echo.
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4173/dm.html"
 start "" "http://localhost:4173/index.html"
 node server.js
 goto :eof
)
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4173/dm.html"
 start "" "http://localhost:4173/index.html"
 py -3 -m http.server 4173 --bind 127.0.0.1
 goto :eof
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4173/dm.html"
 start "" "http://localhost:4173/index.html"
 python -m http.server 4173 --bind 127.0.0.1
 goto :eof
)
echo Node.js or Python is needed to run the local server.
echo Opening the standalone demo instead. Cross-tab synchronization may vary in file mode.
start "" "%~dp0dm.html"
pause
