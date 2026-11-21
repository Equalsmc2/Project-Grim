// Firebase Realtime Database sync, v2.
//
// Room layout (works with the already-deployed project rules):
//   grim/rooms/{room}            dmUid, mode, sceneId   <- required by the rules
//                                schema: 2, rev, updatedAt
//                                s/{section}           <- one child per campaign section
//                                s/portraits/{id}      <- written per portrait, only on change
//   grim/playerEdits/{room}/...  unchanged 1.5.8 player inbox
//   grim/chat/{room}/{msgId}     player chat (needs the updated rules; optional)
//
// The GM browser is the only writer of the room. Writes are per section with
// a monotonically increasing revision; viewers apply a snapshot only when its
// revision is newer. Failed writes are retried with backoff and survive a
// refresh through a small "pending" marker.
import { firebaseConfig } from './firebase-config.js';
import { createCloudOutbox } from './outbox.js';
import { SECTIONS } from '../core/schema.js';
import { PLAYER_EDIT_FIELDS, encodePlayerEdit } from '../core/commands.js';
import { toPlain, uid } from '../core/util.js';
import { saveBackup } from './backups.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const SYNCED = SECTIONS.filter((s) => s !== 'log');
export const cleanRoom = (room) => String(room || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);

export async function loadFirebase() {
  const [app, auth, db] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-database.js`)]);
  return { ...app, ...auth, ...db };
}

/**
 * @param {object} o
 * @param {ReturnType<import('../core/store.js').createStore>} o.store
 * @param {'gm'|'stage'|'player'} o.role
 * @param {string} o.room
 * @param {(s:{state:string,text:string})=>void} [o.onStatus]
 * @param {(info:object)=>void} [o.onRoomProblem]
 * @param {object} [o.sdk] injected Firebase SDK (tests)
 * @param {{host:string,port:number,authPort:number}} [o.emulator]
 */
export async function connectCloud({ store, role, room, onStatus = () => {}, onRoomProblem = () => {}, onChatDenied = () => {}, onClaims = () => {}, onNotice = () => {}, sdk = null, emulator = null }) {
  const safeRoom = cleanRoom(room);
  if (!safeRoom) throw new Error('Room name required');
  const gm = role === 'gm';
  const status = (state, text) => onStatus({ state, text });
  status('connecting', 'Connecting…');
  const F = sdk || (await loadFirebase());
  const appName = emulator ? 'grim-emulator' : '[DEFAULT]';
  const app = F.getApps().find((a) => a.name === appName) || F.initializeApp(emulator ? { ...firebaseConfig, databaseURL: `http://${emulator.host}:${emulator.port}?ns=${firebaseConfig.projectId}-default-rtdb` } : firebaseConfig, appName === '[DEFAULT]' ? undefined : appName);
  const auth = F.getAuth(app);
  const db = F.getDatabase(app);
  if (emulator) {
    try { F.connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`, { disableWarnings: true }); } catch {}
    try { F.connectDatabaseEmulator(db, emulator.host, emulator.port); } catch {}
  }
  const prior = await new Promise((resolve, reject) => { const off = F.onAuthStateChanged(auth, (u) => { off(); resolve(u); }, reject); });
  if (prior && !prior.isAnonymous) await F.signOut(auth);
  const user = prior?.isAnonymous ? prior : (await F.signInAnonymously(auth)).user;

  const roomRef = F.ref(db, `grim/rooms/${safeRoom}`);
  const editsRef = F.ref(db, `grim/playerEdits/${safeRoom}`);
  const chatRef = F.ref(db, `grim/chat/${safeRoom}`);
  const claimsRef = F.ref(db, `grim/claims/${safeRoom}`);
  const markerKey = `grim:sync:${safeRoom}`;
  // 1.5.8 left 'grim:cloud-unsynced:{room}' when this browser had unpublished work; honour it once.
  const legacyMarkerKey = `grim:cloud-unsynced:${safeRoom}`;
  const readMarker = () => {
    let m = {};
    try { m = JSON.parse(localStorage.getItem(markerKey) || 'null') || {}; } catch {}
    try { if (gm && localStorage.getItem(legacyMarkerKey)) m = { ...m, pending: true, rev: typeof m.rev === 'number' ? m.rev : 0 }; } catch {}
    return m;
  };
  const writeMarker = (m) => { try { localStorage.setItem(markerKey, JSON.stringify({ ...readMarker(), ...m })); } catch {} };

  let alive = true;
  let ready = false;          // GM: initial reconciliation complete
  let firstSnapshot = true;
  let lastRemoteRev = -1;
  const dirty = new Set();
  const sentPortraits = new Map();
  const unsubs = [];
  let legacyBackup = null;     // 1.5.8 room kept inside the upgraded room
  let claimsNode = null;       // grim/claims/{room}; null when the deployed rules predate claims
  let claimsSupported = false;
  const hasContent = (s) => s && Array.isArray(s.characters) && s.characters.length > 0;
  const backup = async (reason, data) => {
    try { await saveBackup({ room: safeRoom, reason, data }); } catch (e) { console.warn('[grim] backup failed', e); }
  };

  // ------------------------------------------------------------ GM writes
  const canWrite = () => alive && gm && !!auth.currentUser && navigator.onLine !== false;
  async function writeSections() {
    const names = [...dirty];
    dirty.clear();
    if (!names.length) return;
    const s = store.getState();
    const patch = { dmUid: user.uid, mode: s.meta.mode, sceneId: s.meta.sceneId, schema: 2, rev: s.rev, updatedAt: Date.now() };
    for (const n of names) {
      if (n === 'portraits') {
        for (const [id, img] of Object.entries(s.portraits)) if (sentPortraits.get(id) !== img) patch[`s/portraits/${id}`] = img;
        for (const id of sentPortraits.keys()) if (!(id in s.portraits)) patch[`s/portraits/${id}`] = null;
      } else patch[`s/${n}`] = toPlain(s[n]);
    }
    try {
      await F.update(roomRef, patch);
      if (names.includes('portraits')) { sentPortraits.clear(); for (const [id, img] of Object.entries(s.portraits)) sentPortraits.set(id, img); }
      writeMarker({ rev: s.rev, pending: dirty.size > 0 });
    } catch (e) {
      for (const n of names) dirty.add(n);
      throw e;
    }
  }
  async function writeAll() {
    const s = store.getState();
    const full = { dmUid: user.uid, mode: s.meta.mode, sceneId: s.meta.sceneId, schema: 2, rev: s.rev, updatedAt: Date.now(), s: {} };
    for (const n of SYNCED) full.s[n] = toPlain(s[n]);
    if (legacyBackup) full.legacyBackup = legacyBackup;
    await F.set(roomRef, full);
    try { localStorage.removeItem(legacyMarkerKey); } catch {}
    sentPortraits.clear();
    for (const [id, img] of Object.entries(s.portraits)) sentPortraits.set(id, img);
    writeMarker({ rev: s.rev, pending: false });
  }
  const outbox = gm ? createCloudOutbox({
    send: () => writeSections(),
    readState: () => true,
    canWrite,
    debounceMs: 90,
    onStatus: (e) => {
      if (!alive) return;
      if (e.kind === 'pending') { writeMarker({ pending: true }); status('pending', 'Saving…'); }
      else if (e.kind === 'sent') { if (!dirty.size) status('live', `Live · ${safeRoom}`); }
      else if (e.kind === 'offline') status('offline', 'Offline · changes kept on this device');
      else if (e.kind === 'denied') status('denied', 'Firebase refused the write · check the project rules');
      else if (e.kind === 'retry') status('retry', `Connection interrupted · retrying in ${Math.ceil(e.delay / 1000)}s`);
    },
  }) : null;

  if (gm) {
    unsubs.push(store.subscribe((state, change) => {
      if (!alive || change.origin === 'remote' || change.origin === 'initial') return;
      let any = false;
      for (const n of change.sections) if (SYNCED.includes(n)) { dirty.add(n); any = true; }
      if (any && ready) outbox.queue(true);
    }, { immediate: false }));
  }

  // ------------------------------------------------------------ reading the room
  function remoteToSections(remote) {
    const s = remote.s || {};
    const out = {};
    for (const n of SYNCED) {
      if (n === 'camera' && gm) continue;
      if (n === 'cursors' && !gm) continue;
      out[n] = s[n];
    }
    return out;
  }

  /**
   * GM only: decide between the cloud copy and this device's copy. Whichever
   * copy loses is saved to the local backup store first, so nothing is lost.
   *  - room missing                    -> create it from this device
   *  - owned by another GM browser      -> never touched; move to a new room
   *  - 1.5.8 room without an owner      -> adopt its data, then move (rules forbid claiming it)
   *  - 1.5.8 room owned by this browser -> upgrade in place, keeping the old room inside it
   *  - 2.0 room this device never synced-> take the cloud copy
   *  - unsent work on this device       -> publish it
   *  - otherwise                        -> the newer revision wins
   */
  async function reconcile(remote) {
    const marker = readMarker();
    const local = store.getState();
    const syncedHereBefore = typeof marker.rev === 'number';
    if (!remote) {
      await writeAll();
      status('live', `Room created · ${safeRoom}`);
      return;
    }
    if (remote.dmUid && remote.dmUid !== user.uid) {
      onRoomProblem({ reason: 'different-owner', room: safeRoom });
      status('blocked', 'Another GM browser owns this room');
      throw new Error('room-owned');
    }
    if (!remote.dmUid) {
      if (!marker.pending && hasContent(remote)) {
        await backup('Before adopting an ownerless 1.5.8 room', local);
        store.replaceAll(remote, { origin: 'remote', keepHistory: true });
      }
      onRoomProblem({ reason: 'legacy-unowned', room: safeRoom });
      status('blocked', 'This room predates room ownership');
      throw new Error('room-unowned');
    }
    if (remote.schema !== 2) {
      // 1.5.8 room owned by this browser. Keep a full copy of it, locally and in the room.
      await backup('1.5.8 room before upgrade', remote);
      legacyBackup = { at: Date.now(), from: '1.5.8', data: remote };
      if (marker.pending) await backup('This device before upgrade (unsent work kept)', local);
      else { await backup('This device before adopting the upgraded room', local); store.replaceAll(remote, { origin: 'remote', keepHistory: true }); }
      await writeAll();
      onNotice({ kind: 'upgraded', room: safeRoom });
      status('live', `Room upgraded · ${safeRoom}`);
      return;
    }
    legacyBackup = remote.legacyBackup || null;
    const remoteRev = Number(remote.rev) || 0;
    const localWins = syncedHereBefore && (marker.pending || remoteRev < Number(marker.rev));
    if (localWins) {
      await backup(marker.pending ? 'Cloud copy before publishing unsent work' : 'Older cloud copy before republishing', { ...remote, legacyBackup: undefined });
      await writeAll();
    } else {
      if (!syncedHereBefore && hasContent(local) && local.rev > 0) await backup('This device before first sync with this room', local);
      store.applyRemote(remoteToSections(remote), { rev: remoteRev, origin: 'remote', force: true });
      const s = store.getState().portraits;
      for (const [id, img] of Object.entries(s)) sentPortraits.set(id, img);
      writeMarker({ rev: store.getState().rev, pending: false });
    }
    status('live', `Live · ${safeRoom}`);
  }

  unsubs.push(F.onValue(roomRef, async (snap) => {
    if (!alive) return;
    const remote = snap.exists() ? snap.val() : null;
    if (gm && !ready) {
      try {
        await reconcile(remote);
        ready = true;
        if (claimsNode) store.dispatch('claims/replace', { claims: claimsNode });
        lastRemoteRev = store.getState().rev;
        if (dirty.size) outbox.queue(true);
      } catch (e) {
        if (!/room-/.test(e.message)) { console.error('[grim] reconcile failed', e); status('error', 'Could not reach the room'); }
      }
      return;
    }
    if (gm) return; // The GM never takes its own echo.
    if (!remote) { status('waiting', 'Waiting for the GM to open this room'); return; }
    if (remote.schema !== 2) {
      if (firstSnapshot) store.replaceAll(remote, { origin: 'remote' });
      firstSnapshot = false;
      status('live', `Connected · ${safeRoom}`);
      return;
    }
    const rev = Number(remote.rev) || 0;
    if (!firstSnapshot && rev <= lastRemoteRev) return;
    store.applyRemote(remoteToSections(remote), { rev, origin: 'remote', force: firstSnapshot });
    firstSnapshot = false;
    lastRemoteRev = rev;
    status('live', `Connected · ${safeRoom}`);
  }, (err) => { if (alive) status('error', `Read blocked: ${err.code || err.message}`); }));

  // ------------------------------------------------------------ player inbox (GM side)
  if (gm) {
    unsubs.push(F.onValue(editsRef, (snap) => {
      if (!alive || !ready) return;
      const edits = snap.val() || {};
      const cursors = store.getState().cursors;
      const accepted = [];
      for (const [charId, ids] of Object.entries(edits)) for (const [puid, fields] of Object.entries(ids || {})) for (const [field, entry] of Object.entries(fields || {})) {
        if (!PLAYER_EDIT_FIELDS.includes(field) || !entry || typeof entry !== 'object') continue;
        const rev = Number(entry.revision);
        const key = `${charId}|${puid}|${field}`;
        if (!Number.isSafeInteger(rev) || rev <= Number(cursors[key] || 0)) continue;
        accepted.push({ key, charId, field, value: field === 'conditions' ? String(entry.value || '').split(',').filter(Boolean) : entry.value, rev });
      }
      accepted.sort((a, b) => a.rev - b.rev);
      const next = {};
      const rejected = new Set();
      for (const e of accepted) {
        next[e.key] = e.rev; // acknowledged either way, so a rejected edit is never replayed
        const puid = e.key.split('|')[1];
        const st = store.getState();
        const ch = st.characters.find((c) => c.id === e.charId);
        if (!ch || ch.faction === 'enemy') continue;
        const owner = st.claims[e.charId]?.uid;
        if (!owner) {
          // Older deployed rules have no claims path: the first device to edit a sheet owns it.
          store.dispatch('claims/set', { id: e.charId, uid: puid });
          mirrorClaim(e.charId, puid);
        } else if (owner !== puid) { rejected.add(ch.name); continue; }
        store.dispatch('player/edit', { id: e.charId, field: e.field, value: e.value }, { origin: 'player' });
      }
      if (accepted.length) store.dispatch('cursors/set', { cursors: next });
      if (rejected.size) onNotice({ kind: 'rejected', names: [...rejected] });
    }, () => status('warn', 'Player edits unavailable · check the project rules')));

    unsubs.push(F.onValue(F.query(chatRef, F.limitToLast(60)), (snap) => {
      if (!alive || !ready) return;
      const cursor = Number(store.getState().cursors.chat || 0);
      let latest = cursor;
      snap.forEach((child) => {
        const m = child.val();
        if (!m || Number(m.at) <= cursor) return;
        const owned = Object.entries(store.getState().claims).find(([, c]) => c.uid === m.uid);
        const name = owned ? store.getState().characters.find((c) => c.id === owned[0])?.name || m.name : m.name;
        store.dispatch('chat/post', { id: child.key, from: 'player', name, text: m.text, at: Number(m.at), toStage: m.toStage !== false });
        latest = Math.max(latest, Number(m.at));
      });
      if (latest > cursor) store.dispatch('cursors/set', { cursors: { chat: latest } });
    }, () => {}));
  }

  // ------------------------------------------------------------ character claims
  // With the 2.0.1 rules, grim/claims/{room}/{characterId} = {uid, at} decides
  // which device may write that sheet's player edits; the GM mirrors it into
  // the 'claims' section so every screen can show it. With older rules the
  // path is unreadable and the GM's first-edit ownership applies instead.
  function mirrorClaim(id, owner) {
    if (!claimsSupported) return;
    F.set(F.ref(db, `grim/claims/${safeRoom}/${id}`), owner ? { uid: owner, at: Date.now() } : null).catch(() => {});
  }
  unsubs.push(F.onValue(claimsRef, (snap) => {
    if (!alive) return;
    claimsSupported = true;
    claimsNode = {};
    snap.forEach((c) => { const v = c.val(); if (v?.uid) claimsNode[c.key] = { uid: v.uid, at: Number(v.at) || 0 }; });
    onClaims({ supported: true, claims: claimsNode });
    if (gm && ready) store.dispatch('claims/replace', { claims: claimsNode });
  }, () => { claimsSupported = false; claimsNode = null; onClaims({ supported: false, claims: null }); }));
  if (gm) {
    // GM releases and first-edit assignments are pushed to the claims path when the rules have it.
    let lastClaims = JSON.stringify(store.getState().claims);
    unsubs.push(store.subscribe((s, change) => {
      if (!change.sections.includes('claims') || change.origin === 'remote') return;
      const now = JSON.stringify(s.claims);
      if (now === lastClaims) return;
      lastClaims = now;
      if (!claimsSupported || !claimsNode) return;
      for (const id of Object.keys(claimsNode)) if (!s.claims[id]) mirrorClaim(id, null);
      for (const [id, c] of Object.entries(s.claims)) if (claimsNode[id]?.uid !== c.uid) mirrorClaim(id, c.uid);
    }, { immediate: false }));
  }
  async function claim(characterId) {
    if (!claimsSupported) return { ok: true, enforced: false };
    const cur = claimsNode?.[characterId];
    if (cur && cur.uid !== user.uid) return { ok: false, enforced: true };
    if (cur?.uid === user.uid) return { ok: true, enforced: true };
    try { await F.set(F.ref(db, `grim/claims/${safeRoom}/${characterId}`), { uid: user.uid, at: Date.now() }); return { ok: true, enforced: true }; }
    catch { return { ok: false, enforced: true }; }
  }
  async function release(characterId) {
    if (!claimsSupported) return false;
    if (gm || claimsNode?.[characterId]?.uid === user.uid) { await F.set(F.ref(db, `grim/claims/${safeRoom}/${characterId}`), null); return true; }
    return false;
  }

  // ------------------------------------------------------------ 1.5.8 backup inside the room
  async function removeLegacyBackup() {
    if (!gm || !legacyBackup) return false;
    await F.update(roomRef, { legacyBackup: null });
    legacyBackup = null;
    return true;
  }
  /** Puts the original 1.5.8 room back exactly as it was (for the legacy build). */
  async function restoreLegacyRoom() {
    if (!gm || !legacyBackup?.data) throw new Error('No 1.5.8 backup in this room');
    await backup('2.0 room before restoring the 1.5.8 room', store.getState());
    alive = false;
    outbox?.dispose();
    await F.set(roomRef, { ...legacyBackup.data, dmUid: user.uid });
    return true;
  }

  // ------------------------------------------------------------ player actions
  let lastRevision = 0;
  async function submitPlayerEdit(characterId, field, value) {
    if (!alive || !auth.currentUser || navigator.onLine === false) throw new Error('Offline');
    if (!PLAYER_EDIT_FIELDS.includes(field)) throw new Error('That field is GM-only');
    const encoded = encodePlayerEdit(field, value);
    if (encoded === null) throw new Error('Invalid value');
    const owner = claimsNode?.[characterId]?.uid || store.getState().claims[characterId]?.uid;
    if (owner && owner !== user.uid) throw new Error('This character is played on another device');
    lastRevision = Math.max(Date.now(), lastRevision + 1);
    await F.set(F.ref(db, `grim/playerEdits/${safeRoom}/${characterId}/${user.uid}/${field}`), { value: encoded, revision: lastRevision });
    return lastRevision;
  }
  async function sendChat({ name, text, toStage = true }) {
    const at = Date.now();
    try {
      await F.set(F.push(chatRef), { uid: user.uid, name: String(name).slice(0, 48), text: String(text).slice(0, 300), at, toStage: !!toStage });
    } catch (e) {
      if (/permission/i.test(String(e.code || e.message))) onChatDenied();
      throw e;
    }
  }

  const online = () => { if (alive && gm) outbox.resume(); };
  addEventListener('online', online);

  return {
    uid: user.uid,
    room: safeRoom,
    submitPlayerEdit,
    sendChat,
    claim,
    release,
    get claimsEnforced() { return claimsSupported; },
    get hasLegacyBackup() { return !!legacyBackup; },
    removeLegacyBackup,
    restoreLegacyRoom,
    flush: () => (gm ? outbox.flush({ force: true }) : Promise.resolve(true)),
    get pending() { return gm ? dirty.size > 0 || outbox.hasPending : false; },
    disconnect() {
      alive = false;
      outbox?.dispose();
      removeEventListener('online', online);
      for (const u of unsubs) try { u(); } catch {}
    },
  };
}
