// Shared bootstrap for the three pages: options, URL parameters, cloud sync.
import { connectCloud, cleanRoom, watchTable } from '../sync/cloud.js';

const OPTIONS_KEY = 'grim:options:v1'; // shared with 1.5.8 so existing rooms carry over

export function getOptions() {
  const fallback = { online: false, room: 'grim-demo' };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') }; } catch { return fallback; }
}
export function setOptions(patch) {
  const next = { ...getOptions(), ...patch };
  try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(next)); } catch {}
  return next;
}
export function newRoomId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return 'grim-' + [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

// Set when this display follows the GM's published table (auto-join).
let tableRoom = null;

/**
 * Room/online settings. The GM uses its saved options. Displays (TV, phones)
 * follow the GM's published table when there is one, so every device shows
 * the same campaign without special links; otherwise URL parameters, then
 * saved options. Add ?local=1 to a display URL to opt out.
 */
export function resolveConnection(role) {
  const q = new URLSearchParams(location.search);
  const opts = getOptions();
  const urlOnline = q.get('online') === '1';
  const online = role === 'gm' ? opts.online : urlOnline || opts.online;
  const room = cleanRoom((role !== 'gm' && q.get('room')) || opts.room) || 'grim-demo';
  let emulator = null;
  if (q.get('emulator') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const [host, port, authPort] = q.get('emulator').split(':');
    emulator = { host: host || '127.0.0.1', port: Number(port) || 9000, authPort: Number(authPort) || 9099 };
  }
  if (role !== 'gm' && tableRoom && q.get('local') !== '1') return { online: true, room: tableRoom, emulator, followingTable: true };
  return { online: online || !!emulator, room, emulator, followingTable: false };
}

export function shareUrl(page, room) {
  const u = new URL(page, location.href);
  u.search = '';
  u.searchParams.set('online', '1');
  u.searchParams.set('room', room);
  const q = new URLSearchParams(location.search);
  if (q.get('emulator')) u.searchParams.set('emulator', q.get('emulator'));
  return u.href;
}

/**
 * Connects when online sync is enabled. Returns a controller whose `cloud`
 * may be null (local-only play over browser tabs).
 */
export function createSession({ store, role, onStatus, onChatDenied, onRoomChanged, onClaims, onNotice, onTable = () => {} }) {
  let cloud = null;
  let epoch = 0;
  let watching = false;
  /** Displays watch the table record and hop to the GM's room whenever it changes. */
  function followTable() {
    if (watching || role === 'gm' || new URLSearchParams(location.search).get('local') === '1') return;
    watching = true;
    const { emulator } = resolveConnection(role);
    watchTable({
      emulator,
      onChange: ({ supported, table }) => {
        const next = supported && table?.active && typeof table.room === 'string' ? cleanRoom(table.room) : null;
        onTable({ supported, room: next });
        if (next !== tableRoom) {
          const before = resolveConnection(role);
          tableRoom = next;
          const after = resolveConnection(role);
          // Reconnect only if this display would actually end up somewhere else.
          if (before.online !== after.online || before.room !== after.room) api.connect();
        }
        else if (!next && !cloud) onStatus({ state: 'local', text: supported ? 'Local · the GM is not online' : 'Local · this computer' });
      },
    }).catch(() => { onTable({ supported: false, room: null }); });
  }
  const api = {
    get cloud() { return cloud; },
    async connect() {
      const my = ++epoch;
      cloud?.disconnect();
      cloud = null;
      followTable();
      const conn = resolveConnection(role);
      if (!conn.online) { onStatus({ state: 'local', text: role === 'gm' ? 'Local · this computer' : 'Looking for the GM’s table…' }); return null; }
      try {
        const c = await connectCloud({
          store, role, room: conn.room, emulator: conn.emulator, onStatus, onChatDenied, onClaims, onNotice,
          onRoomProblem: () => {
            if (role !== 'gm' || my !== epoch) return;
            // Never claim another GM's (or an ownerless legacy) room: move this campaign to a fresh private room.
            const room = newRoomId();
            setOptions({ room });
            onRoomChanged?.(room);
            setTimeout(() => { if (my === epoch) api.connect(); }, 50);
          },
        });
        if (my !== epoch) { c.disconnect(); return null; }
        cloud = c;
        return c;
      } catch (e) {
        console.error('[grim] cloud connection failed', e);
        onStatus({ state: 'error', text: navigator.onLine === false ? 'Offline · local only' : 'Could not reach Firebase · local only' });
        return null;
      }
    },
    disconnect() { epoch++; cloud?.disconnect(); cloud = null; },
  };
  return api;
}
