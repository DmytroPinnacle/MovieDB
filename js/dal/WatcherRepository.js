import { BaseRepository } from './BaseRepository.js';

/**
 * Watcher Repository
 * Handles CRUD operations for watchers with favorites support
 */
class WatcherRepository extends BaseRepository {
  constructor() {
    super('Watcher');
    this._favoritesKey = 'moviedb.watcher.favorites.v2';
    this._favorites = []; // Array of watcher IDs in order of selection
    this._loadFavoritesFromStorage();
  }

  /**
   * Load favorites from sessionStorage
   * @private
   */
  _loadFavoritesFromStorage() {
    try {
      const raw = sessionStorage.getItem(this._favoritesKey);
      if (raw) {
        this._favorites = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to load favorites from sessionStorage:', err);
      this._favorites = [];
    }
  }

  /**
   * Save favorites to sessionStorage
   * @private
   */
  _saveFavoritesToStorage() {
    try {
      sessionStorage.setItem(this._favoritesKey, JSON.stringify(this._favorites));
    } catch (err) {
      console.error('Failed to save favorites to sessionStorage:', err);
    }
  }

  /**
   * Get all watchers sorted by name
   * @returns {Array} Sorted watchers
   */
  getAllSorted() {
    return this.getAll().sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get watchers sorted with favorites first
   * @returns {Array} Sorted watchers (favorites first, then others)
   */
  getAllSortedByFavorites() {
    const allWatchers = this.getAll();
    const favoriteWatchers = [];
    const nonFavoriteWatchers = [];
    
    // Add favorites in selection order
    this._favorites.forEach(favId => {
      const watcher = allWatchers.find(w => w.id === favId);
      if (watcher) favoriteWatchers.push(watcher);
    });
    
    // Add non-favorites
    allWatchers.forEach(watcher => {
      if (!this._favorites.includes(watcher.id)) {
        nonFavoriteWatchers.push(watcher);
      }
    });
    
    return [...favoriteWatchers, ...nonFavoriteWatchers];
  }

  /**
   * Search watchers by name (case-insensitive partial match)
   * @param {string} searchTerm - Search term
   * @returns {Array} Matching watchers
   */
  searchByName(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.findWhere(watcher => {
      const fullName = `${watcher.firstName} ${watcher.lastName}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  /**
   * Get favorite watcher IDs
   * @returns {Array} Array of favorite watcher IDs
   */
  getFavorites() {
    return this._favorites.slice();
  }

  /**
   * Check if watcher is favorite
   * @param {string} watcherId - Watcher ID
   * @returns {boolean} True if favorite
   */
  isFavorite(watcherId) {
    return this._favorites.includes(watcherId);
  }

  /**
   * Toggle favorite status
   * @param {string} watcherId - Watcher ID
   * @returns {boolean} New favorite status
   */
  toggleFavorite(watcherId) {
    const index = this._favorites.indexOf(watcherId);
    if (index > -1) {
      this._favorites.splice(index, 1);
    } else {
      this._favorites.push(watcherId);
    }
    this._saveFavoritesToStorage();
    return this._favorites.includes(watcherId);
  }

  /**
   * Set favorites from array
   * @param {Array} favoriteIds - Array of watcher IDs
   */
  setFavorites(favoriteIds) {
    this._favorites = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
    this._saveFavoritesToStorage();
  }

  /**
   * Clear all data including favorites
   */
  clear() {
    super.clear();
    this._favorites = [];
    this._saveFavoritesToStorage();
  }

  /**
   * Export data including favorites
   * @returns {Object} Data object with watchers and favorites
   */
  exportData() {
    return {
      watchers: super.exportData(),
      favorites: this._favorites.slice()
    };
  }

  /**
   * Load data including favorites
   * @param {Object|Array} data - Data object or array
   */
  loadData(data) {
    if (Array.isArray(data)) {
      // Legacy: just an array of watchers
      super.loadData(data);
      this._favorites = [];
      this._saveFavoritesToStorage();
    } else if (data && typeof data === 'object') {
      // New format: object with watchers and favorites
      super.loadData(data.watchers || []);
      this._favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
      this._saveFavoritesToStorage();
    }
  }
}

// Singleton instance
const watcherRepository = new WatcherRepository();

export { watcherRepository };
