// Local safety copies. Before the GM browser lets one copy of a campaign
// replace another (cloud over local, local over cloud, or a 1.5.8 room being
// upgraded), the copy about to be replaced is stored here. Kept in IndexedDB
// so large portrait sets fit; the newest 20 are retained.
const DB = 'grim-backups', STORE = 'backups', KEEP = 20;
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('This browser cannot store backups'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { const s = req.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('at', 'at'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => { dbp = null; throw e; });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

/** @param {{room:string, reason:string, data:object}} b */
export async function saveBackup({ room, reason, data }) {
  if (!data) return null;
  const at = Date.now();
  const id = `${at}-${Math.random().toString(36).slice(2, 7)}`;
  await tx('readwrite', (s) => s.put({ id, at, room: String(room || ''), reason, data: JSON.parse(JSON.stringify(data)) }));
  const all = await listBackups();
  for (const old of all.slice(KEEP)) await tx('readwrite', (s) => s.delete(old.id));
  return id;
}
export async function listBackups() {
  const rows = (await tx('readonly', (s) => s.getAll())) || [];
  return rows.sort((a, b) => b.at - a.at).map(({ id, at, room, reason, data }) => ({ id, at, room, reason, size: JSON.stringify(data).length, legacy: data?.schema !== 2 }));
}
export async function getBackup(id) { return tx('readonly', (s) => s.get(id)); }
export async function deleteBackup(id) { return tx('readwrite', (s) => s.delete(id)); }
