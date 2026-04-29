import { BaseRepository } from './BaseRepository.js';

const API_URL = 'http://localhost:3000/api';

/**
 * Watcher Repository
 * Handles CRUD operations for watchers with favorites support
 */
class WatcherRepository extends BaseRepository {
  constructor() {
    super('Watcher');
    this._favoritesResource = 'watcherfavorites';
    this._favoritesRecordId = 'global';
    this._favorites = []; // Array of watcher IDs in order of selection
  }

  async load() {
    const watchers = await super.load();
    await this._loadFavoritesFromApi();
    return watchers;
  }

  async _loadFavoritesFromApi() {
    try {
      const response = await fetch(`${API_URL}/${this._favoritesResource}/${this._favoritesRecordId}`);

      if (response.ok) {
        const record = await response.json();
        this._favorites = Array.isArray(record.favorites) ? record.favorites : [];
        return;
      }

      if (response.status !== 404) {
        throw new Error(`Favorites API returned ${response.status}`);
      }

      this._favorites = [];
    } catch (err) {
      console.warn('Failed to load favorites from API:', err);
      this._favorites = [];
    }
  }

  async _saveFavoritesToApi() {
    const payload = {
      id: this._favoritesRecordId,
      favorites: this._favorites.slice(),
      updatedAt: Date.now()
    };

    try {
      const response = await fetch(`${API_URL}/${this._favoritesResource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Favorites API returned ${response.status}`);
      }
    } catch (err) {
      console.warn('Failed to save favorites to API:', err);
      throw err;
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
  async toggleFavorite(watcherId) {
    const previousFavorites = this._favorites.slice();
    const index = this._favorites.indexOf(watcherId);
    if (index > -1) {
      this._favorites.splice(index, 1);
    } else {
      this._favorites.push(watcherId);
    }
    try {
      await this._saveFavoritesToApi();
    } catch (err) {
      this._favorites = previousFavorites;
      throw err;
    }
    return this._favorites.includes(watcherId);
  }

  /**
   * Set favorites from array
   * @param {Array} favoriteIds - Array of watcher IDs
   */
  async setFavorites(favoriteIds) {
    this._favorites = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
    await this._saveFavoritesToApi();
  }

  /**
   * Clear all data including favorites
   */
  clear() {
    super.clear();
    this._favorites = [];
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
    } else if (data && typeof data === 'object') {
      // New format: object with watchers and favorites
      super.loadData(data.watchers || []);
      this._favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
    }
  }
}

// Singleton instance
const watcherRepository = new WatcherRepository();

export { watcherRepository };
