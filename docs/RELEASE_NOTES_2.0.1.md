# Project Grim 2.0.1: Firebase stabilization

## Fixed
- **Player sheets are bound to one phone.** Picking a sheet claims it for that phone. Other phones see it as taken and cannot edit it.
  - With the 2.0.1 rules, Firebase itself refuses a forged edit.
  - With the rules deployed today, the GM browser ignores it and tells the GM.
  - The GM releases sheets in the Combatant tab or with Session → Release all; players can release their own.
- **Copy Firebase rules** now copies rules built into the app. Firebase Hosting excludes the JSON file, so the old button failed on the hosted site. The rules file and the embedded copy are tested to be identical.
- **Room migration is recoverable.**
  - Upgrading a 1.5.8 room keeps an exact copy of the original inside the upgraded room, plus a local safety copy.
  - **Session → Restore 1.5.8 room** puts it back.
  - Any time syncing would replace one copy of a campaign with another, the replaced copy is saved first (Session → Safety copies: download or load, undoable).
- **Wrong-room overwrite prevented.** A GM browser that had never synced a room could overwrite it with its local campaign whenever the local revision number happened to be higher, for example when you typed a different room ID you own. A device that has never synced a room now always takes the cloud copy first.
- **1.5.8 unsynced work** (the old "unpublished local work" marker) is honoured during the upgrade instead of being dropped.
- **The preserved 1.5.8 build cannot damage an upgraded room.** It detects the 2.0 format and stays read-only.
- **Ownerless 1.5.8 rooms** have their data adopted before moving to a new private room, as 1.5.8 did.
- **Player chat messages** are labelled with the sender's claimed character.

## Rules changes (not deployed automatically)
- New `grim/claims/{room}/{character}` path.
- Player edits additionally require the matching claim. The rest of the 1.5.8 condition is unchanged, and the room rules are byte-identical.
- Player chat path, as in 2.0.0.

## Tests
- 46/46 unit and regression suites.
- 16/16 page checks.
- 23/23 multi-client Firebase emulator checks with the **currently deployed 1.5.8 rules**.
- 23/23 with the **2.0.1 rules**.
