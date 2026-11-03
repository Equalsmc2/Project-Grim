@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Project Grim - GitHub Upload

rem This script works whether you run it from Downloads or inside your Git repository.
rem It asks for the repository path and copies ONLY Project Grim website files.
set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_ROOT=%%~fI"
set "DEFAULT_REPO=%USERPROFILE%\OneDrive\Documents\GitHub\Project-Grim"

echo.
echo   PROJECT GRIM - GITHUB UPLOAD
 echo   ============================
echo   Website package: %SOURCE_ROOT%
echo.
echo   You can run this BAT from Downloads. Enter your actual GitHub
 echo   repository folder below and the website files will be copied there.
echo.

rem Find Git from PATH or from GitHub Desktop.
set "GIT_EXE=git"
where git >nul 2>nul
if errorlevel 1 (
    set "GIT_EXE="
    for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
        if exist "%%~fD\resources\app\git\cmd\git.exe" set "GIT_EXE=%%~fD\resources\app\git\cmd\git.exe"
        if exist "%%~fD\resources\app\git\bin\git.exe" set "GIT_EXE=%%~fD\resources\app\git\bin\git.exe"
    )
)
if not defined GIT_EXE (
    echo [ERROR] Git was not found. Please install Git for Windows or GitHub Desktop.
    goto :done
)

:choose_folder
set "REPO_INPUT="
echo.
echo Paste your Project-Grim REPOSITORY folder path.
echo You can also drag the folder into this window and press ENTER.
echo Press ENTER to use the default, or type Q to quit.
echo Default: %DEFAULT_REPO%
set /p "REPO_INPUT=Repository folder: "
if /I "%REPO_INPUT%"=="Q" goto :done
if not defined REPO_INPUT set "REPO_INPUT=%DEFAULT_REPO%"
rem Pasting/dragging a folder into cmd often surrounds the path with quotes.
set "REPO_INPUT=%REPO_INPUT:"=%"
for %%I in ("%REPO_INPUT%") do set "REPO=%%~fI"
if not exist "%REPO%\." (
    echo [ERROR] Folder does not exist: "%REPO%"
    goto :choose_folder
)
rem Require the actual repository root, not Downloads or an arbitrary parent.
if not exist "%REPO%\.git" (
    echo [ERROR] That folder is not a Git repository root: "%REPO%"
    echo In GitHub Desktop, choose Repository ^> Show in Explorer and copy that path.
    goto :choose_folder
)
"%GIT_EXE%" -C "%REPO%" rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git could not read this repository. Try another folder.
    goto :choose_folder
)
"%GIT_EXE%" -C "%REPO%" remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [ACTION NEEDED] This repository has no GitHub origin remote.
    echo In GitHub Desktop use Publish repository, then run this BAT again.
    goto :done
)

echo.
echo Website source: "%SOURCE_ROOT%"
echo Git repository: "%REPO%"
echo.

if /I "%SOURCE_ROOT%"=="%REPO%" goto :already_in_repo
if not exist "%SOURCE_ROOT%\index.html" (
    echo [ERROR] This BAT was not found next to the Grim website files.
    echo Extract the FULL ZIP before running the BAT.
    goto :done
)
if not exist "%SOURCE_ROOT%\assets\grim-1413\state.js" (
    echo [ERROR] Missing website assets. Extract the FULL ZIP first.
    goto :done
)
echo This will copy the website into your repository.
echo Existing files with matching names may be overwritten.
echo It will NOT delete other project files or touch your .git folder.
choice /c YN /n /m "Copy Grim website files to this repository? [Y/N] "
if errorlevel 2 goto :done

echo.
echo Copying Project Grim site files...
rem Copy only known site root files. Never copy the .git folder or all Downloads.
robocopy "%SOURCE_ROOT%" "%REPO%" "index.html" "dm.html" "server.js" "README.md" "CHANGELOG.md" "RELEASE_NOTES_1.4.md" "RELEASE_NOTES_1.4.2.md" "RELEASE_NOTES_1.4.3.md" "RELEASE_NOTES_1.4.4.md" "RELEASE_NOTES_1.4.6.md" "TEST_REPORT_1.4.6.md" "RELEASE_NOTES_1.4.7.md" "TEST_REPORT_1.4.7.md" "RELEASE_NOTES_1.4.8.md" "TEST_REPORT_1.4.8.md" "RELEASE_NOTES_1.4.9.md" "TEST_REPORT_1.4.9.md" "RELEASE_NOTES_1.4.11.md" "TEST_REPORT_1.4.11.md" "RELEASE_NOTES_1.4.12.md" "TEST_REPORT_1.4.12.md" "RELEASE_NOTES_1.4.13.md" "TEST_REPORT_1.4.13.md" "TEST_REPORT.md" "RUN-GRIM.bat" "github.bat" "GITHUB-UPLOAD.bat" ".gitignore" ".firebaserc" "firebase.json" "firebase-rtdb.rules.json" /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
robocopy "%SOURCE_ROOT%\assets" "%REPO%\assets" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
robocopy "%SOURCE_ROOT%\docs" "%REPO%\docs" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\tests" robocopy "%SOURCE_ROOT%\tests" "%REPO%\tests" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
echo [OK] Website files copied to: "%REPO%"
goto :cleanup_legacy

:already_in_repo
echo [OK] BAT is already in the Git repository. Nothing needs copying.
goto :cleanup_legacy

rem Optional removal of old, inactive bundles after the new files are copied.
rem Only these known Project Grim version folders are eligible for deletion.
:cleanup_legacy
if not exist "%REPO%\assets\grim-1413\state.js" (
    echo [ERROR] Matte Finish 1.4.13 is not installed, refusing to remove old bundles.
    goto :done
)
echo.
echo Cleanup option: remove inactive older Grim asset versions from this repository?
echo The current grim-1413 assets, campaign data and Git history are untouched.
choice /c YN /n /m "Remove old version asset directories? [Y/N] "
if errorlevel 2 goto :review_git
if exist "%REPO%\assets\dark-040\" rmdir /S /Q "%REPO%\assets\dark-040"
if exist "%REPO%\assets\layout-050\" rmdir /S /Q "%REPO%\assets\layout-050"
if exist "%REPO%\assets\encounter-060\" rmdir /S /Q "%REPO%\assets\encounter-060"
if exist "%REPO%\assets\formation-070\" rmdir /S /Q "%REPO%\assets\formation-070"
if exist "%REPO%\assets\tactical-080\" rmdir /S /Q "%REPO%\assets\tactical-080"
if exist "%REPO%\assets\arena-090\" rmdir /S /Q "%REPO%\assets\arena-090"
if exist "%REPO%\assets\environment-100\" rmdir /S /Q "%REPO%\assets\environment-100"
if exist "%REPO%\assets\perspective-110\" rmdir /S /Q "%REPO%\assets\perspective-110"
if exist "%REPO%\assets\rectangle-112\" rmdir /S /Q "%REPO%\assets\rectangle-112"
if exist "%REPO%\assets\anchored-113\" rmdir /S /Q "%REPO%\assets\anchored-113"
if exist "%REPO%\assets\optimized-114\" rmdir /S /Q "%REPO%\assets\optimized-114"
if exist "%REPO%\assets\framing-116\" rmdir /S /Q "%REPO%\assets\framing-116"
if exist "%REPO%\assets\framing-117\" rmdir /S /Q "%REPO%\assets\framing-117"
if exist "%REPO%\assets\grim-120\" rmdir /S /Q "%REPO%\assets\grim-120"
if exist "%REPO%\assets\grim-130\" rmdir /S /Q "%REPO%\assets\grim-130"
if exist "%REPO%\assets\grim-141\" rmdir /S /Q "%REPO%\assets\grim-141"
if exist "%REPO%\assets\grim-140\" rmdir /S /Q "%REPO%\assets\grim-140"
if exist "%REPO%\assets\grim-146\" rmdir /S /Q "%REPO%\assets\grim-146"
if exist "%REPO%\assets\grim-147\" rmdir /S /Q "%REPO%\assets\grim-147"
if exist "%REPO%\assets\stage.js" del /Q "%REPO%\assets\stage.js"
if exist "%REPO%\assets\state.js" del /Q "%REPO%\assets\state.js"
if exist "%REPO%\assets\styles.css" del /Q "%REPO%\assets\styles.css"
if exist "%REPO%\assets\dm.js" del /Q "%REPO%\assets\dm.js"
if exist "%REPO%\assets\firebase-sync.js" del /Q "%REPO%\assets\firebase-sync.js"
if exist "%REPO%\assets\firebase-config.js" del /Q "%REPO%\assets\firebase-config.js"
if exist "%REPO%\assets\grim-142" rmdir /S /Q "%REPO%\assets\grim-142"
if exist "%REPO%\assets\grim-143" rmdir /S /Q "%REPO%\assets\grim-143"
if exist "%REPO%\assets\grim-144" rmdir /S /Q "%REPO%\assets\grim-144"
if exist "%REPO%\assets\grim-145" rmdir /S /Q "%REPO%\assets\grim-145"
if exist "%REPO%\assets\grim-1410" rmdir /S /Q "%REPO%\assets\grim-1410"
if exist "%REPO%\assets\grim-1411" rmdir /S /Q "%REPO%\assets\grim-1411"
if exist "%REPO%\assets\grim-1412" rmdir /S /Q "%REPO%\assets\grim-1412"
echo [OK] Old bundled assets cleaned.
goto :review_git

:review_git
echo.
echo Changes in repository:
"%GIT_EXE%" -C "%REPO%" status --short
if errorlevel 1 goto :git_failed
echo.
echo IMPORTANT: The next step stages ALL changes in this repository.
echo Review the list above to avoid committing private or unrelated files.
choice /c YN /n /m "Commit changes and push to GitHub? [Y/N] "
if errorlevel 2 (
    echo GitHub upload cancelled. Copied files, if any, remain in your repository.
    goto :done
)

"%GIT_EXE%" -C "%REPO%" add --all
if errorlevel 1 goto :git_failed
"%GIT_EXE%" -C "%REPO%" diff --cached --quiet
if errorlevel 2 goto :git_failed
if errorlevel 1 goto :make_commit
echo No uncommitted changes. Checking for existing commits to push.
goto :push

:make_commit
set "MESSAGE="
set /p "MESSAGE=Commit message [Update Project Grim website]: "
if not defined MESSAGE set "MESSAGE=Update Project Grim website"
"%GIT_EXE%" -C "%REPO%" commit -m "%MESSAGE%"
if errorlevel 1 goto :git_failed

:push
echo.
echo Pushing current branch to GitHub...
"%GIT_EXE%" -C "%REPO%" push -u origin HEAD
if errorlevel 1 (
    echo [ERROR] Push failed. Open GitHub Desktop, sign in,
    echo Fetch origin, or resolve any conflicts and retry.
    echo This script will never force-push.
    goto :done
)
echo.
echo [SUCCESS] Project Grim pushed to GitHub.
echo.
echo NOTE: GitHub push does NOT by itself update Firebase Hosting.
choice /c YN /n /m "Deploy this build to Firebase Hosting too? [Y/N] "
if errorlevel 2 goto :done
where firebase >nul 2>nul
if errorlevel 1 (
    echo [ACTION NEEDED] Firebase CLI not installed.
    echo Run: npm install -g firebase-tools
    echo Then run: firebase login
    echo After that, run this uploader again or deploy from the repository.
    goto :done
)
echo Deploying Hosting only. This will NOT change Realtime Database rules.
pushd "%REPO%"
call firebase deploy --only hosting --project project-grim-ef4f0
set "DEPLOY_RESULT=%ERRORLEVEL%"
popd
if not "%DEPLOY_RESULT%"=="0" (
    echo [ERROR] Firebase deploy failed. Check firebase login and project permissions.
    goto :done
)
echo [SUCCESS] Matte Finish 1.4.13 deployed to Firebase Hosting.
goto :done

:copy_failed
echo.
echo [ERROR] File copy failed. Please check the folder path and permissions.
goto :done

:git_failed
echo.
echo [ERROR] A Git command failed. Review the messages above.

:done
echo.
pause
endlocal
