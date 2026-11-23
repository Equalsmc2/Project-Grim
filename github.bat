@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Project Grim - GitHub Upload

rem ------------------------------------------------------------------
rem  Copies the Project Grim 2.0 website from this folder into your
rem  Project-Grim Git repository, then (only if you confirm) commits
rem  and pushes. It never force-pushes, never touches .git, and never
rem  deletes your files unless you approve the optional cleanup step.
rem ------------------------------------------------------------------
set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_ROOT=%%~fI"
set "DEFAULT_REPO=%USERPROFILE%\OneDrive\Documents\GitHub\Project-Grim"

echo.
echo   PROJECT GRIM 2.0 - GITHUB UPLOAD
echo   ================================
echo   Package folder: %SOURCE_ROOT%
echo.

set "GIT_EXE=git"
where git >nul 2>nul
if errorlevel 1 (
    set "GIT_EXE="
    for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
        if exist "%%~fD\resources\app\git\cmd\git.exe" set "GIT_EXE=%%~fD\resources\app\git\cmd\git.exe"
    )
)
if not defined GIT_EXE (
    echo [ERROR] Git was not found. Install Git for Windows or GitHub Desktop, then run this again.
    goto :done
)

if not exist "%SOURCE_ROOT%\src\core\store.js" (
    echo [ERROR] This BAT is not next to the Grim 2.0 files. Extract the FULL ZIP first.
    goto :done
)

:choose_folder
set "REPO_INPUT="
echo Paste your Project-Grim REPOSITORY folder (or drag it into this window).
echo Press ENTER for the default, or type Q to quit.
echo Default: %DEFAULT_REPO%
set /p "REPO_INPUT=Repository folder: "
if /I "%REPO_INPUT%"=="Q" goto :done
if not defined REPO_INPUT set "REPO_INPUT=%DEFAULT_REPO%"
set "REPO_INPUT=%REPO_INPUT:"=%"
for %%I in ("%REPO_INPUT%") do set "REPO=%%~fI"
if not exist "%REPO%\.git" (
    echo [ERROR] "%REPO%" is not a Git repository root. In GitHub Desktop use Repository ^> Show in Explorer.
    echo.
    goto :choose_folder
)
"%GIT_EXE%" -C "%REPO%" remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [ACTION NEEDED] This repository has no GitHub remote. Publish it in GitHub Desktop first.
    goto :done
)
rem usebackq lets the command itself be quoted (the Git path may contain spaces).
set "BRANCH="
for /f "usebackq delims=" %%B in (`"%GIT_EXE%" -C "%REPO%" rev-parse --abbrev-ref HEAD`) do set "BRANCH=%%B"
if not defined BRANCH set "BRANCH=current branch"

echo.
echo   Repository: %REPO%
echo   Branch:     %BRANCH%
echo.
if /I "%SOURCE_ROOT%"=="%REPO%" (
    echo [OK] This BAT is already inside the repository. Nothing to copy.
    goto :review
)
echo Files with the same names will be replaced. Your campaign data lives in your
echo browser, not in these files, so it is not affected.
choice /c YN /n /m "Copy Project Grim 2.0 into this repository? [Y/N] "
if errorlevel 2 goto :done

echo.
echo Copying...
robocopy "%SOURCE_ROOT%" "%REPO%" index.html dm.html player.html favicon.svg server.js package.json README.md PROGRESS.md DESIGN_PRINCIPLES.md MUSIC_SETUP.md GO_LIVE.md firebase.json .firebaserc firebase-rtdb.rules.json .gitignore RUN-GRIM.bat RUN-TESTS.bat IMPORT-MUSIC.bat github.bat GITHUB-UPLOAD.bat FIX-REPO.bat /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
for %%F in (src vendor legacy docs tests tools .github) do (
    if exist "%SOURCE_ROOT%\%%F\" (
        robocopy "%SOURCE_ROOT%\%%F" "%REPO%\%%F" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
        if errorlevel 8 goto :copy_failed
    )
)
rem Assets: the 1.5.8 fallback bundle, ambience audio and music catalog (never soundtrack MP3s).
robocopy "%SOURCE_ROOT%\assets\grim-158" "%REPO%\assets\grim-158" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\assets\audio\" (
    robocopy "%SOURCE_ROOT%\assets\audio" "%REPO%\assets\audio" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
    if errorlevel 8 goto :copy_failed
) else (
    echo [INFO] This package has no ambience MP3s; the repository's existing ones are kept.
)
robocopy "%SOURCE_ROOT%\assets\music" "%REPO%\assets\music" catalog.json import-manifest.json README.txt /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\assets\portraits.js" copy /Y "%SOURCE_ROOT%\assets\portraits.js" "%REPO%\assets\portraits.js" >nul
echo [OK] Files copied.

echo.
echo Optional cleanup: remove files that 2.0 no longer uses?
echo   assets\grim-148  assets\grim-149  assets\battlefield-118  (old unused builds)
echo   app.js  styles.css  firebase-config.js  database.rules.json  (from an unrelated project)
echo   Root RELEASE_NOTES_* and TEST_REPORT_* (now kept in docs\history)
echo Git history keeps everything, so this can be undone.
choice /c YN /n /m "Remove these? [Y/N] "
if errorlevel 2 goto :review
for %%D in (grim-148 grim-149 battlefield-118) do if exist "%REPO%\assets\%%D\" rmdir /S /Q "%REPO%\assets\%%D"
for %%F in (app.js styles.css firebase-config.js database.rules.json) do if exist "%REPO%\%%F" del /Q "%REPO%\%%F"
del /Q "%REPO%\RELEASE_NOTES_*.md" "%REPO%\TEST_REPORT*.md" "%REPO%\CHANGELOG.md" 2>nul
echo [OK] Cleanup done.

:review
echo.
echo ---- Changes in the repository ----
"%GIT_EXE%" -C "%REPO%" status --short
echo -----------------------------------
choice /c YN /n /m "Commit these changes? [Y/N] "
if errorlevel 2 goto :done
"%GIT_EXE%" -C "%REPO%" add -A
"%GIT_EXE%" -C "%REPO%" commit -m "Project Grim update"
if errorlevel 1 echo [INFO] Nothing new to commit.
echo.
echo Pushing publishes to GitHub. If GitHub Pages builds from "%BRANCH%",
echo the live website updates a minute later.
choice /c YN /n /m "Push branch %BRANCH% to GitHub now? [Y/N] "
if errorlevel 2 (
    echo Not pushed. You can push later from GitHub Desktop.
    goto :done
)
"%GIT_EXE%" -C "%REPO%" push origin HEAD
if errorlevel 1 (
    echo [ERROR] Push failed. Open GitHub Desktop, fetch/pull, then push again. Nothing was forced.
    goto :done
)
echo [OK] Pushed.
echo.
echo Firebase: if you use player chat, deploy the updated rules once (see GO_LIVE.md).
goto :done

:copy_failed
echo [ERROR] Copying failed. Close programs using files in the repository and try again.

:done
echo.
pause
endlocal
