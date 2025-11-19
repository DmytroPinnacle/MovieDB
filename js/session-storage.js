// Watching session storage layer
import { dateStringToTimestamp } from './session-models.js';

const STORAGE_KEY = 'moviedb.sessions.v1';
let sessionsCache = null;

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
}
