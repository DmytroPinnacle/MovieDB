// Watching session storage layer

const STORAGE_KEY = 'moviedb.sessions.v1';
let sessionsCache = null;

/**
 * Convert a date string (YYYY-MM-DD) to a timestamp (milliseconds since epoch).
 * JavaScript's Date constructor uses ZERO-BASED months (0 = January, 11 = December)
 * but ISO date strings (YYYY-MM-DD) use ONE-BASED months (01 = January, 12 = December).
 */
function dateStringToTimestamp(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at local midnight, adjusting month from 1-based to 0-based
  return new Date(year, month - 1, day).getTime();
}

export function loadSessions() {
  if (sessionsCache) return sessionsCache;
  const raw = localStorage.getItem(STORAGE_KEY);
  let sessions = raw ? JSON.parse(raw) : [];
  
  // Migration: Convert old string dates to timestamps
  let needsSave = false;
  sessions = sessions.map(session => {
    if (typeof session.watchedDate === 'string') {
      session.watchedDate = dateStringToTimestamp(session.watchedDate);
      needsSave = true;
    }
    return session;
  });
  
  if (needsSave) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
  
  sessionsCache = sessions;
  return sessionsCache;
}

function saveSessions(sessions) {
  sessionsCache = sessions;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessions() {
  return loadSessions();
}

export function getSessionById(id) {
  return loadSessions().find(s => s.id === id);
}

export function getSessionsByMovieId(movieId) {
  return loadSessions()
    .filter(s => s.movieId === movieId)
    .sort((a, b) => b.watchedDate - a.watchedDate); // Most recent first (timestamp comparison)
}

export function getLatestSessionByMovieId(movieId) {
  const sessions = getSessionsByMovieId(movieId);
  return sessions.length > 0 ? sessions[0] : null;
}

export function addSession(session) {
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  sessionsCache = null; // Invalidate cache
  return session;
}

export function updateSessionInStore(id, updatedSession) {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = updatedSession;
  saveSessions(sessions);
  sessionsCache = null; // Invalidate cache
  return updatedSession;
}

export function deleteSession(id) {
  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.id !== id);
  saveSessions(filtered);
  sessionsCache = null; // Invalidate cache
}

export function deleteSessionsByMovieId(movieId) {
  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.movieId !== movieId);
  saveSessions(filtered);
  sessionsCache = null; // Invalidate cache
}

export function getSessionsByWatcherId(watcherId) {
  console.log('getSessionsByWatcherId called with:', watcherId);
  const sessions = loadSessions();
  console.log('Total sessions in storage:', sessions.length);
  const filtered = sessions.filter(s => {
    const hasWatcherIds = s.watcherIds && Array.isArray(s.watcherIds);
    const includesWatcher = hasWatcherIds && s.watcherIds.includes(watcherId);
    console.log('Session:', s.id, 'watcherIds:', s.watcherIds, 'includes watcher:', includesWatcher);
    return includesWatcher;
  });
  console.log('Filtered sessions:', filtered.length);
  return filtered.sort((a, b) => b.watchedDate - a.watchedDate); // Most recent first
}

export function getWatchedMovieIdsByWatcherId(watcherId) {
  const sessions = getSessionsByWatcherId(watcherId);
  const movieIds = new Set();
  sessions.forEach(s => movieIds.add(s.movieId));
  return Array.from(movieIds);
}
