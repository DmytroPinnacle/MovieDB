/**
 * Base Repository class for in-memory CRUD operations with sessionStorage persistence
 * Provides standard Create, Read, Update, Delete operations
 */
export class BaseRepository {
  constructor(entityName) {
    this.entityName = entityName;
    this._storageKey = `moviedb.${entityName.toLowerCase()}.v2`;
    this._data = [];
    this._loaded = false;
    this._loadFromStorage();
  }

  /**
   * Load data from sessionStorage
   * @private
   */
  _loadFromStorage() {
    if (this._loaded) return;
    try {
      const raw = sessionStorage.getItem(this._storageKey);
      if (raw) {
        this._data = JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`Failed to load ${this.entityName} from sessionStorage:`, err);
      this._data = [];
    }
    this._loaded = true;
  }

  /**
   * Save data to sessionStorage
   * @private
   */
  _saveToStorage() {
    try {
      sessionStorage.setItem(this._storageKey, JSON.stringify(this._data));
    } catch (err) {
      console.error(`Failed to save ${this.entityName} to sessionStorage:`, err);
    }
  }

  /**
   * Get all entities
   * @returns {Array} Shallow copy of data array
   */
  getAll() {
    return this._data.slice();
  }

  /**
   * Get entity by ID
   * @param {string} id - Entity ID
   * @returns {Object|null} Entity or null if not found
   */
  getById(id) {
    return this._data.find(item => item.id === id) || null;
  }

  /**
   * Add new entity
   * @param {Object} entity - Entity to add
   * @returns {Object} Added entity
   */
  add(entity) {
    this._data.push(entity);
    this._saveToStorage();
    return entity;
  }

  /**
   * Update existing entity
   * @param {string} id - Entity ID
   * @param {Object} entity - Updated entity
   * @returns {boolean} True if updated, false if not found
   */
  update(id, entity) {
    const idx = this._data.findIndex(item => item.id === id);
    if (idx !== -1) {
      this._data[idx] = entity;
      this._saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Delete entity by ID
   * @param {string} id - Entity ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id) {
    const before = this._data.length;
    this._data = this._data.filter(item => item.id !== id);
    const deleted = this._data.length !== before;
    if (deleted) this._saveToStorage();
    return deleted;
  }

  /**
   * Delete multiple entities matching predicate
   * @param {Function} predicate - Filter function
   * @returns {number} Number of deleted entities
   */
  deleteWhere(predicate) {
    const before = this._data.length;
    this._data = this._data.filter(item => !predicate(item));
    const deleted = before - this._data.length;
    if (deleted > 0) this._saveToStorage();
    return deleted;
  }

  /**
   * Find entities matching predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} Matching entities
   */
  findWhere(predicate) {
    return this._data.filter(predicate);
  }

  /**
   * Clear all data
   */
  clear() {
    this._data = [];
    this._saveToStorage();
  }

  /**
   * Get count of entities
   * @returns {number}
   */
  count() {
    return this._data.length;
  }

  /**
   * Load data from array (for seeding/importing)
   * @param {Array} data - Array of entities
   */
  loadData(data) {
    this._data = Array.isArray(data) ? [...data] : [];
    this._loaded = true;
    this._saveToStorage();
  }

  /**
   * Export data as array
   * @returns {Array} Copy of data array
   */
  exportData() {
    return this._data.slice();
  }
}
