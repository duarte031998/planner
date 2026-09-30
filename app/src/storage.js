// Persistencia robusta: localStorage + IndexedDB (espejo), copias automáticas
// diarias, guardado inmediato al salir de la app y almacenamiento persistente.

export const KEY = 'mi-planner-v2';
const LEGACY_KEY = 'mi-planner-v1';
const DB_NAME = 'mi-planner';
const STORE = 'kv';
const SNAP_PREFIX = 'snap-';
const KEEP_SNAPS = 30;

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no-idb'));
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }).catch(e => { dbp = null; throw e; });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const idbGet = k => tx('readonly', s => s.get(k));
const idbPut = (k, v) => tx('readwrite', s => { s.put(v, k); });
const idbKeys = () => tx('readonly', s => s.getAllKeys());
const idbDel = k => tx('readwrite', s => { s.delete(k); });

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Acepta el formato nuevo ({ updatedAt, data }) y el del prototipo (datos sueltos).
export function unwrap(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.data && raw.data.habits && raw.data.days) return { updatedAt: raw.updatedAt || 0, data: raw.data };
  if (raw.habits && raw.days) return { updatedAt: raw._updatedAt || 0, data: raw };
  return null;
}

function readLocal() {
  try {
    const main = unwrap(JSON.parse(localStorage.getItem(KEY)));
    if (main) return main;
    const v1 = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (v1 && typeof v1 === 'object') return { updatedAt: 0, data: v1, legacy: true };
  } catch (e) {}
  return null;
}

// Carga la copia más reciente entre localStorage e IndexedDB.
export async function load() {
  const local = readLocal();
  let idb = null;
  try { idb = unwrap(await idbGet(KEY)); } catch (e) {}
  // inSync: ambas copias coinciden; si no, se vuelve a guardar para reponer la que falta.
  if (local && idb) return { ...(idb.updatedAt > local.updatedAt ? idb : local), inSync: idb.updatedAt === local.updatedAt && !local.legacy };
  return local || idb;
}

// Lectura de emergencia (si la app falla al dibujarse): el texto guardado tal cual.
export function rawLocal() {
  try { return localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY); } catch (e) { return null; }
}

let pending = null, timer = null;
const listeners = new Set();
export const onStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = st => listeners.forEach(fn => fn(st));

function writeNow() {
  clearTimeout(timer); timer = null;
  if (!pending) return Promise.resolve();
  const env = pending; pending = null;
  let localOk = true;
  try { localStorage.setItem(KEY, JSON.stringify(env)); } catch (e) { localOk = false; }
  const snapKey = SNAP_PREFIX + today();
  return Promise.all([idbPut(KEY, env), idbPut(snapKey, env)])
    .then(() => { emit({ ok: true, at: env.updatedAt }); pruneSnaps(); })
    .catch(() => emit(localOk ? { ok: true, at: env.updatedAt } : { ok: false }));
}

// Programa el guardado; se escribe como mucho 300 ms después del último cambio.
export function save(data) {
  pending = { v: 2, updatedAt: Date.now(), data };
  emit({ saving: true });
  clearTimeout(timer);
  timer = setTimeout(writeNow, 300);
}
export const flush = () => writeNow();

async function pruneSnaps() {
  try {
    const keys = (await idbKeys()).filter(k => String(k).startsWith(SNAP_PREFIX)).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_SNAPS))) await idbDel(k);
  } catch (e) {}
}

export async function listSnapshots() {
  try {
    const keys = (await idbKeys()).filter(k => String(k).startsWith(SNAP_PREFIX)).sort().reverse();
    const out = keys.map(k => ({ key: k, date: k.slice(SNAP_PREFIX.length) }));
    const safety = unwrap(await idbGet('before-restore'));
    if (safety) out.unshift({ key: 'before-restore', date: null, at: safety.updatedAt });
    return out;
  } catch (e) { return []; }
}
export async function readSnapshot(key) {
  try { return unwrap(await idbGet(key)); } catch (e) { return null; }
}
export async function saveSafetyCopy(data) {
  try { await idbPut('before-restore', { v: 2, updatedAt: Date.now(), data }); } catch (e) {}
}

// Guarda al cerrar, cambiar de app o bloquear el iPad.
export function installFlushHooks() {
  const f = () => { writeNow(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') f(); });
  window.addEventListener('pagehide', f);
  window.addEventListener('beforeunload', f);
}

// Pide al navegador que no borre los datos automáticamente.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) {}
  return false;
}

// Sincroniza si la app está abierta en dos pestañas.
export function onExternalChange(fn) {
  const h = e => { if (e.key !== KEY || !e.newValue) return; try { const x = unwrap(JSON.parse(e.newValue)); if (x) fn(x); } catch (err) {} };
  window.addEventListener('storage', h);
  return () => window.removeEventListener('storage', h);
}

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
