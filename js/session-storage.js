/**
 * Session Storage - Compatibility Layer
 * Wraps SessionRepository to maintain existing API
 */
import { sessionRepository } from './dal/index.js';

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
  return sessionRepository.load();
}

export function getSessions() {
  return sessionRepository.getAll();
}

export function getSessionById(id) {
  return sessionRepository.getById(id);
}

export function getSessionsByMovieId(movieId) {
  return sessionRepository.getByMovieId(movieId);
}

export function getLatestSessionByMovieId(movieId) {
  return sessionRepository.getLatestByMovieId(movieId);
}

export function addSession(session) {
  return sessionRepository.add(session);
}

export function updateSessionInStore(id, updatedSession) {
  sessionRepository.update(id, updatedSession);
  return updatedSession;
}

export function deleteSession(id) {
  sessionRepository.delete(id);
}

export function deleteSessionsByMovieId(movieId) {
  sessionRepository.deleteByMovieId(movieId);
}

export function getSessionsByWatcherId(watcherId) {
  return sessionRepository.getByWatcherId(watcherId);
}

export function getWatchedMovieIdsByWatcherId(watcherId) {
  return sessionRepository.getWatchedMovieIdsByWatcherId(watcherId);
}
