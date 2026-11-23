# Project Grim 2.1.2

Fixes the Windows uploader (`GITHUB-UPLOAD.bat` / `github.bat`). It could not read the current branch name, so the final push failed with `fatal: invalid refspec`. It now reads the branch correctly and always pushes the branch you are on (`git push origin HEAD`); it still never force-pushes. The site itself is unchanged from 2.1.1.
