import { BaseRepository } from './BaseRepository.js';

/**
 * Session Repository
 * Handles CRUD operations for watching sessions with advanced queries
 */
class SessionRepository extends BaseRepository {
  constructor() {
    super('Session');
  }

  /**
   * Get sessions sorted by watched date (newest first)
   * @returns {Array} Sorted sessions
   */
  getAllSorted() {
    return this.getAll().sort((a, b) => b.watchedDate - a.watchedDate);
  }

  /**
   * Get sessions by movie ID, sorted by date (newest first)
   * @param {string} movieId - Movie ID
   * @returns {Array} Sessions for movie
   */
  getByMovieId(movieId) {
    return this.findWhere(s => s.movieId === movieId)
      .sort((a, b) => b.watchedDate - a.watchedDate);
  }

  /**
   * Get latest session for a movie
   * @param {string} movieId - Movie ID
   * @returns {Object|null} Latest session or null
   */
  getLatestByMovieId(movieId) {
    const sessions = this.getByMovieId(movieId);
    return sessions.length > 0 ? sessions[0] : null;
  }

  /**
   * Get sessions by watcher ID, sorted by date (newest first)
   * @param {string} watcherId - Watcher ID
   * @returns {Array} Sessions for watcher
   */
  getByWatcherId(watcherId) {
    return this.findWhere(s => 
      s.watcherIds && Array.isArray(s.watcherIds) && s.watcherIds.includes(watcherId)
    ).sort((a, b) => b.watchedDate - a.watchedDate);
  }

  /**
   * Get unique movie IDs watched by a watcher
   * @param {string} watcherId - Watcher ID
   * @returns {Array} Array of unique movie IDs
   */
  getWatchedMovieIdsByWatcherId(watcherId) {
    const sessions = this.getByWatcherId(watcherId);
    const movieIds = new Set();
    sessions.forEach(s => movieIds.add(s.movieId));
    return Array.from(movieIds);
  }

  /**
   * Delete all sessions for a movie
   * @param {string} movieId - Movie ID
   * @returns {number} Number of deleted sessions
   */
  deleteByMovieId(movieId) {
    return this.deleteWhere(s => s.movieId === movieId);
  }

  /**
   * Delete all sessions for a watcher
   * @param {string} watcherId - Watcher ID
   * @returns {number} Number of deleted sessions
   */
  deleteByWatcherId(watcherId) {
    return this.deleteWhere(s => 
      s.watcherIds && Array.isArray(s.watcherIds) && s.watcherIds.includes(watcherId)
    );
  }

  /**
   * Get sessions within date range
   * @param {number} startDate - Start timestamp
   * @param {number} endDate - End timestamp
   * @returns {Array} Sessions in range
   */
  getByDateRange(startDate, endDate) {
    return this.findWhere(s => 
      s.watchedDate >= startDate && s.watchedDate <= endDate
    ).sort((a, b) => b.watchedDate - a.watchedDate);
  }

  /**
   * Get sessions for multiple watchers (intersection - all must have watched)
   * @param {string[]} watcherIds - Array of watcher IDs
   * @returns {Array} Sessions watched by all watchers
   */
  getByWatcherIds(watcherIds) {
    if (!watcherIds || watcherIds.length === 0) return [];
    return this.findWhere(s => 
      s.watcherIds && Array.isArray(s.watcherIds) && 
      watcherIds.every(id => s.watcherIds.includes(id))
    ).sort((a, b) => b.watchedDate - a.watchedDate);
  }
}

// Singleton instance
const sessionRepository = new SessionRepository();

export { sessionRepository };
