// Watching session data models
import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid@5/nanoid.js';

/**
 * Convert a date string (YYYY-MM-DD) to a timestamp (milliseconds since epoch).
 * 
 * Why month - 1?
 * JavaScript's Date constructor uses ZERO-BASED months (0 = January, 11 = December)
 * but ISO date strings (YYYY-MM-DD) use ONE-BASED months (01 = January, 12 = December).
 * 
 * Example: "2025-11-19" means November 19th
 * - Split gives us: year=2025, month=11, day=19
 * - Without subtraction: new Date(2025, 11, 19) = December 19th (WRONG!)
 * - With subtraction: new Date(2025, 10, 19) = November 19th (CORRECT!)
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} Timestamp in milliseconds (local timezone, midnight)
 */
export function dateStringToTimestamp(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at local midnight, adjusting month from 1-based to 0-based
  return new Date(year, month - 1, day).getTime();
}

export function createSession(fields = {}) {
  const now = Date.now();
  
  // Use provided timestamp or default to today at midnight local time
  /** @type {number} - Timestamp in milliseconds */
  let watchedDate;
  if (fields.watchedDate) {
    watchedDate = fields.watchedDate;
  } else {
    const today = new Date();
    watchedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }
  
  return {
    id: nanoid(),
    movieId: fields.movieId || '',
    watcherIds: Array.isArray(fields.watcherIds) ? fields.watcherIds : [],
    watchedDate: watchedDate,
    notes: (fields.notes || '').trim(),
    watcherRatings: fields.watcherRatings || {}, // { watcherId: rating }
    watcherReviews: fields.watcherReviews || {}, // { watcherId: review text }
    createdAt: now,
    updatedAt: now
  };
}

export function validateSessionFields(fields) {
  const errors = {};
  
  if (!fields.movieId || !fields.movieId.trim()) {
    errors.movieId = 'Movie ID is required';
  }
  
  if (!fields.watchedDate) {
    errors.watchedDate = 'Watch date is required';
  }
  
  if (!fields.watcherIds || fields.watcherIds.length === 0) {
    errors.watcherIds = 'At least one watcher is required';
  }
  
  if (fields.notes && fields.notes.length > 1000) {
    errors.notes = 'Notes too long (max 1000 characters)';
  }
  
  return errors;
}

export function updateSession(existing, fields) {
  return {
    ...existing,
    watcherIds: Array.isArray(fields.watcherIds) ? fields.watcherIds : existing.watcherIds,
    watchedDate: fields.watchedDate !== undefined ? fields.watchedDate : existing.watchedDate,
    notes: fields.notes !== undefined ? fields.notes.trim() : existing.notes,
    watcherRatings: fields.watcherRatings !== undefined ? fields.watcherRatings : existing.watcherRatings || {},
    watcherReviews: fields.watcherReviews !== undefined ? fields.watcherReviews : existing.watcherReviews || {},
    updatedAt: Date.now()
  };
}
