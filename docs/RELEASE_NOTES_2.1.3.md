# Project Grim 2.1.3

Adds `FIX-REPO.bat`, a repair tool for when a pull/merge goes wrong (for example "Accept Incoming" was chosen and old files came back). It cancels any unfinished merge or rebase, merges GitHub's latest history preferring your side on conflicts, re-copies all Project Grim files from the package, commits, and pushes only if you confirm. It never force-pushes. The site itself is unchanged from 2.1.1.
