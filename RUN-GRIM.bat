@echo off
setlocal
cd /d "%~dp0"
set "PORT=4174"
echo.
echo   PROJECT GRIM - Arena 0.9 Launcher
echo   =================================
echo   Stage: http://localhost:4174/
echo   DM:    http://localhost:4174/dm.html
echo.
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4174/dm.html"
 start "" "http://localhost:4174/index.html"
 node server.js
 goto :eof
)
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4174/dm.html"
 start "" "http://localhost:4174/index.html"
 py -3 -m http.server 4174 --bind 127.0.0.1
 goto :eof
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
 start "" "http://localhost:4174/dm.html"
 start "" "http://localhost:4174/index.html"
 python -m http.server 4174 --bind 127.0.0.1
 goto :eof
)
echo Node.js or Python is needed to run the local server.
echo Opening the standalone demo instead. Cross-tab synchronization may vary in file mode.
start "" "%~dp0dm.html"
pause
