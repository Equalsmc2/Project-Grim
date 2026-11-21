# Project Grim: Firebase setup (2.0.1)

Grim works without Firebase: tabs on one computer sync on their own. Firebase is only needed when the TV or phones are other devices. Nobody ever sees a login. Every browser gets an anonymous Firebase identity automatically.

Project: `project-grim-ef4f0`.

## One-time project setup (already done if 1.5.8 worked online)
1. Firebase Console → **Authentication** → Sign-in method → **Anonymous** → Enable.
2. Authentication → Settings → **Authorized domains**: make sure your GitHub Pages domain (and `localhost` if you test locally) is listed.
3. Realtime Database → **Rules**: install `firebase-rtdb.rules.json` (see `GO_LIVE.md`).

The rules are the same for every room and every GM browser. There is nothing per-device to paste, and there is no UID to copy.

## What the 2.0.1 rules allow

| Path | Who may read | Who may write |
|---|---|---|
| `grim/rooms/{room}` | any signed-in device | only the GM browser that created the room (`dmUid`) |
| `grim/claims/{room}/{character}` | any signed-in device | a phone may claim a **free** party sheet, keep it, or release its own claim; the room's GM may assign or release any claim |
| `grim/playerEdits/{room}/{character}/{uid}/{field}` | any signed-in device | only the phone whose UID matches, **and only for the character it has claimed**, only whitelisted fields with validated values |
| `grim/chat/{room}/{message}` | any signed-in device | any signed-in device may add a message (append-only, 300 characters, its own UID) |

Everything else is denied. The room paths are byte-for-byte the same as in 1.5.8.

## Character ownership
- When a player picks a sheet on their phone, the phone claims it. Other phones then see it as "Played on another phone" and cannot open or edit it.
- The GM sees each claim in the Combatant tab and can **Release** it (or **Release all** in Session). A player can also release their own sheet ("Not your character? Release it").
- **With rules older than 2.0.1**, the claims path does not exist. The GM browser then enforces the same thing itself: the first phone to edit a sheet owns it, and edits from any other phone are ignored and reported to the GM. Only the 2.0.1 rules make Firebase itself refuse such writes.

## Copy Firebase rules button
**Session → Maintenance → Copy Firebase rules** copies the 2.0.1 rules from inside the app, so it works on GitHub Pages and on Firebase Hosting (which does not publish the JSON file). Paste them into Firebase Console → Realtime Database → Rules → **Publish**. Copying alone changes nothing.

## Identity notes
A browser keeps its anonymous identity until its site data is cleared. If the GM's identity changes (a new browser, cleared storage, private window), that browser cannot write the old room. Grim then moves the campaign to a new private room automatically and never takes over the old one. Use **Session → Copy TV link / Copy player link** again afterwards.
