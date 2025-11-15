// Watcher storage abstraction
const STORAGE_KEY = 'moviedb.watchers.v1';

let cache = [];
let loaded = false;

export function loadWatchers() {
  if (loaded) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse stored watchers', err);
    cache = [];
  }
  loaded = true;
  return cache;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); }
  catch (err) { console.error('Persist watchers failed', err); }
}

export function addWatcher(watcher) {
  cache.push(watcher);
  persist();
  return watcher;
}

export function updateWatcherInStore(id, watcher) {
  const idx = cache.findIndex(w => w.id === id);
  if (idx !== -1) {
    cache[idx] = watcher;
    persist();
    return true;
  }
  return false;
}

export function deleteWatcher(id) {
  const before = cache.length;
  cache = cache.filter(w => w.id !== id);
  const removed = cache.length !== before;
  if (removed) persist();
  return removed;
}

export function getWatchers() {
  return cache.slice();
}

export function getWatcherById(id) {
  return cache.find(w => w.id === id);
}

export function clearAllWatchers() {
  cache = [];
  persist();
}
