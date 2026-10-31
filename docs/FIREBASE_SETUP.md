# Project Grim — Firebase setup (no login screens)

The site works immediately in **local mode**. DM and Stage tabs in the same browser profile sync without Firebase. For remote TV screens or other devices, Project Grim uses Firebase Anonymous Authentication behind the scenes, for **both** the DM and viewer. You never create an email/password account or sign in visibly.

Project ID from your screenshots: `project-grim-ef4f0`.

## Step 1 — Enable Anonymous Authentication (one time)

1. Open https://console.firebase.google.com/ and select **Project-Grim**.
2. In the left menu choose **Security → Authentication** (sometimes **Build → Authentication**).
3. Click **Get started** if prompted; open **Sign-in method**.
4. Open **Anonymous**, switch **Enable** on, click **Save**.
5. If you test online Firebase from `localhost`, check **Authentication → Settings → Authorized domains**. If `localhost` is not included, add it for local testing. Your Firebase Hosting domain should already be listed.

You do not add individual users in the Firebase Console. Every browser automatically gets its own anonymous Firebase UID. There is **no login page, prompt, email address or password**.

## Step 2 — Link your DM browser using secure database rules (one time)

Firebase must know which anonymous browser is allowed to WRITE the encounter. Otherwise any anonymous visitor, including a player, could edit it. The `dm.html` URL alone does not protect your data.

1. Open Grim's **DM console** in the browser you will normally use to run the campaign.
2. Select **Connection & setup**.
3. Turn on **Enable Firebase connection**. Grim silently generates / reuses your anonymous browser identity.
4. Wait for **DM browser ID** to appear. Grim also creates a hard-to-guess room ID when leaving the sample `grim-demo` room for the first time.
5. Press **Copy secure rules**. This copies ready-to-paste Realtime Database rules with *your* anonymous UID inside. You don't need to manually edit JSON.
6. Open **Firebase Console → Realtime Database → Rules**, replace the existing test rules with the copied JSON, then press **Publish**.
7. Return to the DM page and press **Publish to Firebase**. The connection status should report `Firebase live` after the write succeeds. If you see `Write denied`, confirm the rules actually published and the UID is unchanged.

You can also manually edit `firebase-rtdb.rules.json`, replacing `REPLACE_WITH_YOUR_DM_ANONYMOUS_UID` with the UID displayed by the DM console, then paste it in Firebase. **Editing the file alone does not publish the rules.** The included `firebase.json` intentionally deploys Hosting only, not the database rules.

The rules allow:

- **DM browser:** anonymously authenticated and with the exact UID from the rule → read + write.
- **Player / TV:** anonymously authenticated from a different browser → read-only.
- **Not signed in:** no database access.

Everyone can open the public `dm.html` webpage; they cannot write to Firebase unless their UID matches the published rules. For a production campaign with DM backups, multiple GMs, or confidential data, use a more advanced authentication and membership system. No-login client-side websites cannot securely identify a DM without one-time trusted browser/device registration or a protected backend.

**Important:** Firebase keeps an anonymous identity in your browser. If you clear site storage, use private browsing, switch browser profiles or computers, or anonymous-account cleanup removes your account, your UID can change. Repeat Step 2 from the new DM browser. Anyone who can edit your Firebase Console rules already has administrative control; keep your Firebase account secured.

## Step 3 — Open the Stage on another device

1. **Deploy Grim to a real HTTPS URL** using Firebase Hosting (instructions below). GitHub upload does not host the website.
2. In the DM console, press **Copy online stage URL**. Open it on the TV or player's device. The link includes the exact room ID. **If the copied link starts with `http://localhost:4173`, it will only work on that computer:** open the hosted `dm.html` instead, or replace only the URL origin with your real hosted site URL while keeping `?online=1&room=...`.
3. The remote Stage automatically authenticates anonymously and listens to the selected room. It has no login screen.
4. Change the scene or combat on the DM page. Remote Stage should update after Firebase accepts the DM write.

**Privacy:** Anyone with the room URL (or room ID) can sign in anonymously and read the **player-facing** state. The room code is not a substitute for per-player permissions. Keep GM secrets, hidden lore, and private notes out of the synced database. All scene and character details stored in the shared room can be read by anonymous viewers even if an element is hidden in the UI.

## Step 4 — Upload source code to GitHub

The package includes these two Windows helpers in its **top-level folder**:

- `github.bat` (short launcher)
- `GITHUB-UPLOAD.bat` (actual helper)

Extract every ZIP file directly into `C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim`, next to `RUN-GRIM.bat`, `dm.html` and `index.html`. Double-click `github.bat`. Check the changes and confirm to stage, commit and push. **The repository must already be published** to GitHub using GitHub Desktop. The BAT will never force-push. You can instead use **Commit to main** and **Push origin** in GitHub Desktop.

GitHub uploading **does not deploy Firebase Hosting**.

## Step 5 — Publish Firebase Hosting (optional)

With Node.js installed:

```powershell
npm install -g firebase-tools
firebase login
cd "C:\Users\deste\OneDrive\Documents\GitHub\Project-Grim"
firebase deploy --only hosting --project project-grim-ef4f0
```

`firebase login` here is a **one-time developer CLI setup to deploy Hosting**, not a login screen for Project Grim players or DMs.

Check the URL printed by the CLI. Expected site addresses (only *after* a successful deployment) are:

- `https://project-grim-ef4f0.web.app/` — player stage
- `https://project-grim-ef4f0.web.app/dm.html` — DM console

The Firebase web configuration in `assets/firebase-config.js` is a public client identifier. Security depends on **Realtime Database rules**, not secrecy of this config.

## Troubleshooting

- **`auth/operation-not-allowed`**: enable **Anonymous** under Authentication → Sign-in method.
- **`PERMISSION_DENIED` on write**: copy the rules generated by the DM page and **Publish** them in Realtime Database → Rules. Make sure you're using the same DM browser profile as when copying the UID.
- **`PERMISSION_DENIED` on read**: confirm Authentication is enabled, viewer auth initialized, and the rule's `.read` allows `auth != null`.
- **`auth/invalid-api-key`**: check `assets/firebase-config.js` against Project settings → Your apps → Config.
- **The TV shows different data**: use the same online room ID and a real public Hosting URL. Two local browser profiles need Firebase online mode for synchronization.
- **You changed browser / lost UID**: repeat Step 2 and re-publish the rules; the new anonymous ID will replace your trusted writer identity.
- **Still shows local mode**: turn on Firebase in the DM page and open the Stage's copied `?online=1&room=...` URL.
