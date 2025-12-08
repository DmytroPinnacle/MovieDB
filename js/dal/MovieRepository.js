import { BaseRepository } from './BaseRepository.js';

/**
 * Movie Repository
 * Handles CRUD operations for movies
 */
class MovieRepository extends BaseRepository {
  constructor() {
    super('Movie');
  }

  /**
   * Get movies sorted by creation date (newest first)
   * @returns {Array} Sorted movies
   */
  getAllSorted() {
    return this.getAll().sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Search movies by title (case-insensitive partial match)
   * @param {string} searchTerm - Search term
   * @returns {Array} Matching movies
   */
  searchByTitle(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.findWhere(movie => 
      movie.title.toLowerCase().includes(term)
    );
  }

  /**
   * Filter movies by genre
   * @param {string} genre - Genre name
   * @returns {Array} Movies in genre
   */
  filterByGenre(genre) {
    return this.findWhere(movie => movie.genre === genre);
  }

  /**
   * Filter movies by year
   * @param {number} year - Year
   * @returns {Array} Movies from year
   */
  filterByYear(year) {
    return this.findWhere(movie => movie.year === year);
  }

  /**
   * Get movies by watcher ID
   * @param {string} watcherId - Watcher ID
   * @returns {Array} Movies associated with watcher
   */
  getByWatcherId(watcherId) {
    return this.findWhere(movie => 
      movie.watcherIds && movie.watcherIds.includes(watcherId)
    );
  }

  /**
   * Get movies by multiple watcher IDs (intersection)
   * @param {string[]} watcherIds - Array of watcher IDs
   * @returns {Array} Movies associated with all watchers
   */
  getByWatcherIds(watcherIds) {
    if (!watcherIds || watcherIds.length === 0) return [];
    return this.findWhere(movie => 
      movie.watcherIds && watcherIds.every(id => movie.watcherIds.includes(id))
    );
  }
}

// Singleton instance
const movieRepository = new MovieRepository();

export { movieRepository };
