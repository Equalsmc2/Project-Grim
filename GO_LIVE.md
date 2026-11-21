# Upgrading the live site to Project Grim 2.0.1 safely

Nothing in this package deploys anything by itself. Every step below is one you do, and each can be undone.

The order matters:

1. Back up.
2. Publish the website.
3. Upgrade your room from the GM laptop.
4. Only then, optionally, deploy the new rules.

2.0.1 works with the rules you have deployed today, so step 4 can wait.

---

## Step 0: Back up (about 5 minutes)
1. **Firebase data.**
   1. Open Firebase Console → Realtime Database → **Data**.
   2. Click the **⋮** menu at the top → **Export JSON**. Keep the file; it contains every room.
2. **Current rules.**
   1. Open Realtime Database → **Rules**.
   2. Copy everything into a text file named `rules-before-2.0.1.json`.
3. **Your campaign in the browser.**
   1. On the GM laptop, open the **current** live `dm.html` (still 1.5.8).
   2. Make sure the status shows the room is synced.
   3. If it offers to publish or recover unsynced changes, do that first.
   4. Use **Environment → Prepared scenes → Export** if you rely on prepared scenes.
4. **Note your room ID.** It is in 1.5.8 under **Connection & setup → Room ID**.

## Step 1: Publish the website
1. Extract `RELEASES/Project-Grim-2.0.1.zip`.
2. Run `GITHUB-UPLOAD.bat` and choose your Project-Grim repository folder.
3. Say **Y** to copy, review the change list, then **Y** to commit.
4. Say **Y** to push only when you are ready. GitHub Pages updates about a minute later.
5. Hard-refresh the live site (`Ctrl+Shift+R`) on every device you use: GM laptop, TV and phones.

The 1.5.8 build stays available at `legacy/dm.html` and `legacy/index.html`.

## Step 2: Upgrade your room (GM laptop, same browser as before)
1. Open the live `dm.html` **in the same browser profile you used for 1.5.8**. Your campaign loads automatically from that browser's storage.
2. Open **Session**. Online play is already on if it was on in 1.5.8.
3. The first connection upgrades your room in place. Before doing so Grim:
   - saves the 1.5.8 room as a **local safety copy** (Session → Safety copies, downloadable);
   - keeps an **exact copy of the 1.5.8 room inside the upgraded room** (Session → 1.5.8 room copy).
4. Check the result: the status shows **Live**, the characters, HP, maps and portraits are all there, and the TV link shows the same scene.

**If anything looks wrong:**
- **Session → 1.5.8 room copy → Restore 1.5.8 room** puts the original room back exactly as it was. It also switches 2.0's online sync off so the room isn't upgraded again. Then use `legacy/dm.html`.
- Or load any entry under **Safety copies**. Loading is undoable with `Ctrl+Z`.
- As a last resort, import the JSON you exported in Step 0 in the Firebase Console.

The 1.5.8 build will **not** overwrite an upgraded room: it shows "This room now uses Grim 2.0" and stays read-only.

## Step 3: Share links and test with the table
1. **Session → Copy TV link** and **Copy player link**. The format is the same as 1.5.8, so old links still work.
2. Each player opens the link and picks their character. That phone now owns the sheet. The GM sees "Played on a linked phone" in the Combatant tab and can **Release** it if someone picked the wrong character.
3. **Player chat** stays switched off until Step 4. Players see a short message instead; GM chat works.

## Step 4 (optional, recommended): Deploy the 2.0.1 rules
This adds two things: **Firebase-enforced character ownership** and **player chat**. The room rules are unchanged, and nothing is loosened.

1. In the GM deck: **Session → Maintenance → Copy Firebase rules**. Or open `firebase-rtdb.rules.json` from the ZIP.
2. Firebase Console → Realtime Database → **Rules** → select all → paste → **Publish**. Alternatively, from a signed-in Firebase CLI in the repository folder:
   ```bash
   npx -y firebase-tools@latest deploy --only database --project project-grim-ef4f0
   ```
3. Reload the GM deck, TV and phones. Phones re-claim their sheets automatically.
4. **Session → Player devices** no longer mentions "enforced by this GM browser only".

**To undo Step 4:** paste `rules-before-2.0.1.json` back into the Rules tab and Publish. 2.0.1 keeps working; it falls back to GM-enforced ownership and no player chat.

## Step 5: Clean up when you are confident (optional)
After a session or two, **Session → 1.5.8 room copy → Delete the copy** frees that space inside the room. The local safety copies stay in the GM browser (the newest 20 are kept).
