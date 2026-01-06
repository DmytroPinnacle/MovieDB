import { movieRepository } from './MovieRepository.js';
import { watcherRepository } from './WatcherRepository.js';
import { sessionRepository } from './SessionRepository.js';
import { listRepository } from './ListRepository.js';
import { tierListRepository } from './TierListRepository.js';

/**
 * Data Manager
 * Handles importing/exporting data to/from JSON
 * Provides centralized data persistence management
 */
class DataManager {
  /**
   * Export all data to JSON object
   * @returns {Object} Complete database export
   */
  exportToJSON() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        movies: movieRepository.exportData(),
        watchers: watcherRepository.exportData(),
        sessions: sessionRepository.exportData(),
        lists: listRepository.exportData(),
        tierLists: tierListRepository.exportData()
      }
    };
  }

  /**
   * Import data from JSON object
   * @param {Object} jsonData - Data to import
   * @param {boolean} merge - If true, merge with existing data; if false, replace
   */
  importFromJSON(jsonData, merge = false) {
    if (!jsonData || !jsonData.data) {
      throw new Error('Invalid JSON data format');
    }

    const { movies, watchers, sessions, lists, tierLists } = jsonData.data;

    if (!merge) {
      // Clear existing data before import
      movieRepository.clear();
      watcherRepository.clear();
      sessionRepository.clear();
      listRepository.clear();
      tierListRepository.clear();
    }

    // Import movies
    if (Array.isArray(movies)) {
      if (merge) {
        movies.forEach(movie => movieRepository.add(movie));
      } else {
        movieRepository.loadData(movies);
      }
    }

    // Import watchers (supports both old array format and new object format)
    if (watchers) {
      if (merge) {
        const watchersArray = Array.isArray(watchers) ? watchers : watchers.watchers;
        watchersArray?.forEach(watcher => watcherRepository.add(watcher));
      } else {
        watcherRepository.loadData(watchers);
      }
    }

    // Import sessions
    if (Array.isArray(sessions)) {
      if (merge) {
        sessions.forEach(session => sessionRepository.add(session));
      } else {
        sessionRepository.loadData(sessions);
      }
    }

    // Import lists
    if (Array.isArray(lists)) {
      if (merge) {
        lists.forEach(item => listRepository.add(item));
      } else {
        listRepository.loadData(lists);
      }
    }

    // Import tier lists
    if (Array.isArray(tierLists)) {
      if (merge) {
        tierLists.forEach(item => tierListRepository.add(item));
      } else {
        tierListRepository.loadData(tierLists);
      }
    }
  }

  /**
   * Download data as JSON file
   * @param {string} filename - Name for downloaded file
   */
  downloadJSON(filename = 'moviedb-export.json') {
    const data = this.exportToJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Upload JSON file and import data
   * @param {File} file - JSON file to upload
   * @param {boolean} merge - If true, merge with existing data
   * @returns {Promise} Resolves when import is complete
   */
  async uploadJSON(file, merge = false) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          this.importFromJSON(jsonData, merge);
          resolve(jsonData);
        } catch (err) {
          reject(new Error('Failed to parse JSON file: ' + err.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Clear all data from all repositories
   */
  clearAll() {
    movieRepository.clear();
    watcherRepository.clear();
    sessionRepository.clear();
    listRepository.clear();
    tierListRepository.clear();
  }

  /**
   * Get statistics about stored data
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      movies: movieRepository.count(),
      watchers: watcherRepository.count(),
      sessions: sessionRepository.count(),
      favorites: watcherRepository.getFavorites().length
    };
  }

  /**
   * Create a backup of current data
   * @returns {Object} Backup data
   */
  createBackup() {
    return this.exportToJSON();
  }

  /**
   * Restore from backup
   * @param {Object} backup - Backup data
   */
  restoreFromBackup(backup) {
    this.importFromJSON(backup, false);
  }
}

// Singleton instance
const dataManager = new DataManager();

export { dataManager, DataManager };
