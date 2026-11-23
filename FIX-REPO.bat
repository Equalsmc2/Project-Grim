@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Project Grim - Repair repository after a merge mix-up

rem ------------------------------------------------------------------
rem  Use this if a pull/merge went wrong (for example "Accept Incoming"
rem  was chosen and old files came back). It:
rem    1. cancels an unfinished merge or rebase,
rem    2. merges GitHub's latest history, preferring YOUR side on conflicts,
rem    3. copies this package's Project Grim files over the repository again,
rem    4. commits, and pushes only if you confirm.
rem  It never force-pushes and never deletes your other files.
rem ------------------------------------------------------------------
set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_ROOT=%%~fI"
set "DEFAULT_REPO=%USERPROFILE%\OneDrive\Documents\GitHub\Project-Grim"

echo.
echo   PROJECT GRIM - REPOSITORY REPAIR
echo   ================================
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
    echo [ERROR] Git was not found. Install Git for Windows or GitHub Desktop.
    goto :done
)
if not exist "%SOURCE_ROOT%\src\core\store.js" (
    echo [ERROR] Run this from the extracted Project Grim folder. Extract the FULL ZIP first.
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
    echo [ERROR] "%REPO%" is not a Git repository root.
    echo.
    goto :choose_folder
)
if /I "%SOURCE_ROOT%"=="%REPO%" (
    echo [ERROR] Run this from the extracted ZIP folder, not from inside the repository.
    goto :done
)

set "BRANCH="
for /f "usebackq delims=" %%B in (`"%GIT_EXE%" -C "%REPO%" rev-parse --abbrev-ref HEAD`) do set "BRANCH=%%B"
if not defined BRANCH (
    echo [ERROR] Could not read the current branch.
    goto :done
)
echo.
echo   Repository: %REPO%
echo   Branch:     %BRANCH%
echo.
echo This repairs the repository as described at the top of this window.
choice /c YN /n /m "Continue? [Y/N] "
if errorlevel 2 goto :done

rem ---- 1. Cancel anything half-finished ------------------------------
if exist "%REPO%\.git\MERGE_HEAD" (
    echo Cancelling the unfinished merge...
    "%GIT_EXE%" -C "%REPO%" merge --abort
)
if exist "%REPO%\.git\rebase-merge\" (
    echo Cancelling the unfinished rebase...
    "%GIT_EXE%" -C "%REPO%" rebase --abort
)
if exist "%REPO%\.git\rebase-apply\" (
    echo Cancelling the unfinished rebase...
    "%GIT_EXE%" -C "%REPO%" rebase --abort
)

rem ---- 2. Bring in GitHub's history, keeping your side on conflicts --
echo.
echo Fetching from GitHub...
"%GIT_EXE%" -C "%REPO%" fetch origin
if errorlevel 1 (
    echo [ERROR] Could not reach GitHub. Check your internet connection and try again.
    goto :done
)
"%GIT_EXE%" -C "%REPO%" rev-parse --verify --quiet "origin/%BRANCH%" >nul
if errorlevel 1 (
    echo [INFO] GitHub has no branch "%BRANCH%" yet; nothing to merge.
) else (
    echo Merging GitHub's latest changes; on conflicts your version wins...
    "%GIT_EXE%" -C "%REPO%" merge -X ours --no-edit "origin/%BRANCH%"
    if errorlevel 1 (
        "%GIT_EXE%" -C "%REPO%" merge --abort >nul 2>nul
        echo [ERROR] The merge could not be completed automatically. Nothing was pushed.
        echo Send a screenshot of this window for help.
        goto :done
    )
)

rem ---- 3. Re-copy the Project Grim files from this package -----------
echo.
echo Restoring Project Grim files from this package...
robocopy "%SOURCE_ROOT%" "%REPO%" index.html dm.html player.html favicon.svg server.js package.json README.md PROGRESS.md DESIGN_PRINCIPLES.md MUSIC_SETUP.md GO_LIVE.md firebase.json .firebaserc firebase-rtdb.rules.json .gitignore RUN-GRIM.bat RUN-TESTS.bat IMPORT-MUSIC.bat github.bat GITHUB-UPLOAD.bat FIX-REPO.bat /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
for %%F in (src vendor legacy docs tests tools .github) do (
    if exist "%SOURCE_ROOT%\%%F\" (
        robocopy "%SOURCE_ROOT%\%%F" "%REPO%\%%F" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
        if errorlevel 8 goto :copy_failed
    )
)
robocopy "%SOURCE_ROOT%\assets\grim-158" "%REPO%\assets\grim-158" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\assets\audio\" (
    robocopy "%SOURCE_ROOT%\assets\audio" "%REPO%\assets\audio" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
    if errorlevel 8 goto :copy_failed
)
robocopy "%SOURCE_ROOT%\assets\music" "%REPO%\assets\music" catalog.json import-manifest.json README.txt /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\assets\portraits.js" copy /Y "%SOURCE_ROOT%\assets\portraits.js" "%REPO%\assets\portraits.js" >nul
echo [OK] Files restored.

rem ---- 4. Commit and (optionally) push --------------------------------
echo.
echo ---- Changes to commit ----
"%GIT_EXE%" -C "%REPO%" status --short
echo ---------------------------
"%GIT_EXE%" -C "%REPO%" add -A
"%GIT_EXE%" -C "%REPO%" commit -m "Repair: restore Project Grim files after merge"
if errorlevel 1 echo [INFO] Nothing new to commit; the files were already correct.
echo.
choice /c YN /n /m "Push branch %BRANCH% to GitHub now? [Y/N] "
if errorlevel 2 (
    echo Not pushed. You can push later with GitHub Desktop: Push origin.
    goto :done
)
"%GIT_EXE%" -C "%REPO%" push origin HEAD
if errorlevel 1 (
    echo [ERROR] Push failed. Nothing was forced. Send a screenshot of this window for help.
    goto :done
)
echo [OK] Repaired and pushed. The website updates in a minute or two.
goto :done

:copy_failed
echo [ERROR] Copying failed. Close programs using files in the repository and try again.

:done
echo.
pause
endlocal
