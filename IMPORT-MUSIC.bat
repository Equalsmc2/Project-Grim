@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
title Project Grim - Local Soundtrack Installer
set "SOURCE=%~dp0"
echo.
echo  PROJECT GRIM / MUSIC LIBRARY
 echo  ============================
echo.
echo This installs your personal soundtrack archives into the local site.
echo It does NOT upload or publish music to GitHub.
echo.
set "ARCHIVE_FOLDER="
set /p "ARCHIVE_FOLDER=Paste the folder containing the four soundtrack ZIPs: "
if not defined ARCHIVE_FOLDER goto :cancel
set "ARCHIVE_FOLDER=%ARCHIVE_FOLDER:"=%"
if not exist "%ARCHIVE_FOLDER%\." (
 echo [ERROR] That folder does not exist.
 goto :finish
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SOURCE%tools\import_music.ps1" -ArchivesFolder "%ARCHIVE_FOLDER%"
if errorlevel 1 echo [WARN] Import incomplete. Review errors above.
goto :finish
:cancel
echo Cancelled.
:finish
echo.
pause
endlocal
