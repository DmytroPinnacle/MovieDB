// Local Storage abstraction (sync + in-memory cache)
const STORAGE_KEY = 'moviedb.movies.v1';

let cache = [];
let loaded = false;

export function loadMovies() {
  if (loaded) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse stored movies', err);
    cache = [];
  }
  loaded = true;
  return cache;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); }
  catch (err) { console.error('Persist failed', err); }
}

export function addMovie(movie) {
  cache.push(movie);
  persist();
  return movie;
}

export function updateMovieInStore(id, movie) {
  const idx = cache.findIndex(m => m.id === id);
  if (idx !== -1) {
    cache[idx] = movie;
    persist();
    return true;
  }
  return false;
}

export function deleteMovie(id) {
  const before = cache.length;
  cache = cache.filter(m => m.id !== id);
  const removed = cache.length !== before;
  if (removed) persist();
  return removed;
}

export function getMovies() {
  return cache.slice(); // shallow copy to avoid external mutation
}

export function clearAllMovies() {
  cache = [];
  persist();
}
