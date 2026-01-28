import { movieRepository } from './MovieRepository.js';
import { watcherRepository } from './WatcherRepository.js';
import { sessionRepository } from './SessionRepository.js';
import { listRepository } from './ListRepository.js';
import { tierListRepository } from './TierListRepository.js';

const API_URL = 'http://localhost:3000/api';

/**
 * Data Manager
 * Handles importing/exporting data to/from JSON
 * Provides centralized data persistence management
 */
class DataManager {
  /**
   * Initialize all repositories by loading data from server
   */
  async initialize() {
    await Promise.all([
      movieRepository.load(),
      watcherRepository.load(),
      sessionRepository.load(),
      listRepository.load(),
      tierListRepository.load()
    ]);
  }

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
  async importFromJSON(jsonData, merge = false) {
    if (!jsonData || !jsonData.data) {
      throw new Error('Invalid JSON data format');
    }

    const { movies, watchers, sessions, lists, tierLists } = jsonData.data;
    
    // Normalize watchers if needed
    let watchersData = watchers;
    if (watchers && !Array.isArray(watchers) && watchers.watchers) {
        watchersData = watchers.watchers;
    }

    // Construct the payload for the server
    const payload = {
        movies: movies || [],
        watchers: watchersData || [],
        sessions: sessions || [],
        lists: lists || [],
        tierlists: tierLists || [] // Note lowercase 'tierlists' to match endpoint
    };
    
    // For local repositories, we need to update their cache
    // But passing huge payload to server is better
    
    try {
        const response = await fetch(`${API_URL}/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: payload,
                mode: merge ? 'merge' : 'replace'
            })
        });
        
        if (!response.ok) throw new Error('Bulk import failed: ' + response.statusText);
        
        // Reload all local caches (fetch from server)
        await Promise.all([
            movieRepository.load(),
            watcherRepository.load(),
            sessionRepository.load(),
            listRepository.load(),
            tierListRepository.load()
        ]);
        
    } catch(err) {
        console.error('Import failed', err);
        throw err;
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
      
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          await this.importFromJSON(jsonData, merge);
          resolve(jsonData);
        } catch (err) {
          reject(new Error('Failed to parse or import JSON: ' + err.message));
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
  async clearAll() {
    try {
        await fetch(`${API_URL}/clear-all`, { method: 'POST' });
        movieRepository.clear();
        watcherRepository.clear();
        sessionRepository.clear();
        listRepository.clear();
        tierListRepository.clear();
    } catch(err) {
        console.error("Clear all failed", err);
        throw err;
    }
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
      favorites: watcherRepository.getFavorites ? watcherRepository.getFavorites().length : 0
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
  async restoreFromBackup(backup) {
    await this.importFromJSON(backup, false);
  }
}

// Singleton instance
const dataManager = new DataManager();

export { dataManager, DataManager };
