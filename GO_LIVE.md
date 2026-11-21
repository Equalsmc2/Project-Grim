# Project Grim 2.0: go live

## 1. Upload the website
1. Extract `RELEASES/Project-Grim-2.0.0.zip`.
2. Double-click `GITHUB-UPLOAD.bat` and choose your Project-Grim repository folder.
3. Review the list of changes, then confirm the commit. Confirm the push only when you are ready: a push to the branch GitHub Pages builds from updates the live site.
4. Open the live `dm.html` and hard-refresh (`Ctrl+Shift+R`).

The 1.5.8 pages stay available at `legacy/dm.html` and `legacy/index.html`.

## 2. Firebase (only needed for player chat)
Sync, player sheet edits and token movement already work with the rules you deployed for 1.5.8.

The 2.0 rules add one new, append-only path for player chat, `grim/chat/{room}`. The existing paths are unchanged and nothing is loosened. To enable player chat, deploy once, using either method:

- **Command line** (from an already signed-in Firebase CLI, in the repository folder):
  ```bash
  npx -y firebase-tools@latest deploy --only database --project project-grim-ef4f0
  ```
- **Firebase console:** Realtime Database → Rules → paste the contents of `firebase-rtdb.rules.json` → Publish.

Until then, GM chat works and player messages show "Player chat needs the updated Firebase rules".

## 3. First session checklist (on your hardware)
- [ ] GM deck: turn on **Session → Sync to the TV and phones**. Status shows **Live**.
- [ ] TV: open the copied TV link and press **F** for fullscreen. Click once to enable sound if music or ambience is selected.
- [ ] Phones: open the player link and pick a character. A −HP change on the phone appears on the TV.
- [ ] Switch **Tactical** on and off and check the camera transition and the grid on your TV.
- [ ] Try a thunderstorm and a blizzard, and check the frame rate. Lower **Quality** on the TV if needed.
