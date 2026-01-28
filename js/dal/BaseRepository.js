const API_URL = 'http://localhost:3000/api';

/**
 * Base Repository class for SQLite Backend Persistence
 * Provides standard Create, Read, Update, Delete operations
 */
export class BaseRepository {
  constructor(entityName) {
    this.entityName = entityName;
    this.endpoint = entityName.toLowerCase() + 's';
    this._data = [];
    this._initialized = false;
  }

  /**
   * Initialize data from server (Async)
   * Populates local cache
   */
  async load() {
    try {
      const response = await fetch(`${API_URL}/${this.endpoint}`);
      if (!response.ok) {
         console.warn(`Server returned ${response.status} for ${this.endpoint}`);
         // Maintain empty array or existing data
         return this._data;
      }
      this._data = await response.json();
      this._initialized = true;
      return this._data;
    } catch (err) {
      console.error(`Failed to load ${this.entityName} from API:`, err);
      return this._data;
    }
  }

  /**
   * Get all entities (Synchronous from cache)
   * Uses cached data loaded via load() or updated via add/update/delete
   * @returns {Array} Data array copy
   */
  getAll() {
    return this._data.slice();
  }

  /**
   * Get entity by ID (Synchronous from cache)
   * @param {string} id - Entity ID
   * @returns {Object|null} Entity or null if not found
   */
  getById(id) {
    return this._data.find(item => item.id === id) || null;
  }

  findWhere(predicate) {
    return this._data.filter(predicate);
  }
  
  /**
   * Count entities
   */
  count() {
    return this._data.length;
  }

  /**
   * Add new entity (Async)
   * @param {Object} entity - Entity to add
   * @returns {Promise<Object>} Added entity
   */
  async add(entity) {
    try {
      const response = await fetch(`${API_URL}/${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity)
      });
      if (!response.ok) throw new Error(response.statusText);
      
      const saved = await response.json();
      const idx = this._data.findIndex(item => item.id === saved.id);
      if (idx !== -1) {
          this._data[idx] = saved;
      } else {
          this._data.push(saved);
      }
      return saved;
    } catch (err) {
      console.error(`Failed to add ${this.entityName}:`, err);
      throw err;
    }
  }

  /**
   * Update existing entity (Async)
   * @param {string} id - Entity ID
   * @param {Object} entity - Updated entity
   * @returns {Promise<boolean>} True if updated
   */
  async update(id, entity) {
    try {
      const response = await fetch(`${API_URL}/${this.endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity)
      });
      if (!response.ok) throw new Error(response.statusText);

      const saved = await response.json();
      const idx = this._data.findIndex(item => item.id === id);
      if (idx !== -1) {
        this._data[idx] = saved;
      } else {
         this._data.push(saved);
      }
      return true;
    } catch (err) {
      console.error(`Failed to update ${this.entityName}:`, err);
      return false;
    }
  }

  /**
   * Delete entity by ID (Async)
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const response = await fetch(`${API_URL}/${this.endpoint}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(response.statusText);

      const idx = this._data.findIndex(item => item.id === id);
      if (idx !== -1) {
         this._data.splice(idx, 1);
         return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to delete ${this.entityName}:`, err);
      return false;
    }
  }

  // Helper for bulk operations locally (used by DataManager before import)
  loadData(data) {
    this._data = Array.isArray(data) ? [...data] : [];
  }
  
  exportData() {
    return this._data.slice();
  }
  
  clear() {
    this._data = [];
  }
}
