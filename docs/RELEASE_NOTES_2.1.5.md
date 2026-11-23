# Project Grim 2.1.5: every screen shows the same table

## The problem
A TV or phone that opened the site without the special link from the GM (`?online=1&room=…`) ran in local-only mode with its own separate campaign, so it showed something different. An old link also kept pointing at an old room if the GM ever moved to a new one.

## What changed
- **Auto-join.** When the GM is online, the GM deck publishes "this is my table" to Firebase. Every TV, phone or browser that opens the site — `index.html` or `player.html`, **no special link needed** — joins that table automatically. If the GM moves to a new room, every screen follows.
- **Same shot everywhere.** The cinematic camera director runs on the clock, so the TV, a phone showing the stage and the GM's preview frame the same shot at the same moment. The tactical view already follows the GM's camera.
- **Screens never overwrite the GM's save.** A TV or player tab on the GM's computer reads the GM's saved campaign but never writes it.
- **One sign-in per device.** A fresh device could sign in twice at the same moment and end up with two identities, which made some player edits fail. It now signs in once.
- **When the GM switches online play off**, the table is marked inactive, so screens return to local mode instead of showing a stale room.
- **Opt-out:** add `?local=1` to a display URL to keep it local.

## Needs the 2.1.5 Firebase rules
Auto-join reads and writes a new record, `grim/tables/main`.
- Only the GM browser that owns the room it points to can set it.
- Another GM browser cannot take it over while that room exists.
- Everything else is unchanged.

Until you publish the rules, screens still work with the shared links (Session → Copy TV link / Copy player link), and the Session tab says auto-join is waiting for the rules.

**How to publish:** GM deck → Session → Maintenance → **Copy Firebase rules** → Firebase Console → Realtime Database → Rules → paste → **Publish**. These rules also enable player chat and phone-locked character sheets (2.0.1).

## If a table ever gets stuck
For example, the GM's browser data was cleared and a new GM browser can't take over. Delete `grim/tables/main` in Firebase Console → Realtime Database → Data. The next GM to go online claims it.
