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
if not exist "%SOURCE_ROOT%\assets\rectangle-112\state.js" (
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
robocopy "%SOURCE_ROOT%" "%REPO%" "index.html" "dm.html" "server.js" "README.md" "CHANGELOG.md" "TEST_REPORT.md" "RUN-GRIM.bat" "github.bat" "GITHUB-UPLOAD.bat" ".gitignore" ".firebaserc" "firebase.json" "firebase-rtdb.rules.json" /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
robocopy "%SOURCE_ROOT%\assets" "%REPO%\assets" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
robocopy "%SOURCE_ROOT%\docs" "%REPO%\docs" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
if exist "%SOURCE_ROOT%\tests" robocopy "%SOURCE_ROOT%\tests" "%REPO%\tests" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :copy_failed
echo [OK] Website files copied to: "%REPO%"
goto :review_git

:already_in_repo
echo [OK] BAT is already in the Git repository. Nothing needs copying.

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
echo [SUCCESS] Rectangle 1.1.2 deployed to Firebase Hosting.
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
