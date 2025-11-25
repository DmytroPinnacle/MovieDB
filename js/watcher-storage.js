// Watcher storage abstraction
const STORAGE_KEY = 'moviedb.watchers.v1';
const FAVORITES_KEY = 'moviedb.watchers.favorites.v1';

let cache = [];
let favorites = []; // Array of watcher IDs in order of selection
let loaded = false;

export function loadWatchers() {
  if (loaded) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
    const favRaw = localStorage.getItem(FAVORITES_KEY);
    favorites = favRaw ? JSON.parse(favRaw) : [];
  } catch (err) {
    console.warn('Failed to parse stored watchers', err);
    cache = [];
    favorites = [];
  }
  loaded = true;
  return cache;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); }
  catch (err) { console.error('Persist watchers failed', err); }
}

function persistFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }
  catch (err) { console.error('Persist favorites failed', err); }
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

export function getFavorites() {
  return favorites.slice();
}

export function isFavorite(watcherId) {
  return favorites.includes(watcherId);
}

export function toggleFavorite(watcherId) {
  const index = favorites.indexOf(watcherId);
  if (index > -1) {
    // Remove from favorites
    favorites.splice(index, 1);
  } else {
    // Add to end of favorites (preserves selection order)
    favorites.push(watcherId);
  }
  persistFavorites();
  return favorites.includes(watcherId);
}

export function getWatchersSortedByFavorites() {
  const allWatchers = getWatchers();
  const favoriteWatchers = [];
  const nonFavoriteWatchers = [];
  
  // First, add favorites in the order they were selected
  favorites.forEach(favId => {
    const watcher = allWatchers.find(w => w.id === favId);
    if (watcher) favoriteWatchers.push(watcher);
  });
  
  // Then add non-favorites
  allWatchers.forEach(watcher => {
    if (!favorites.includes(watcher.id)) {
      nonFavoriteWatchers.push(watcher);
    }
  });
  
  return [...favoriteWatchers, ...nonFavoriteWatchers];
}
