import { BaseRepository } from './BaseRepository.js';

/**
 * Director Repository
 * Handles CRUD operations for directors
 */
class DirectorRepository extends BaseRepository {
  constructor() {
    super('Director');
  }

  /**
   * Search directors by name (case-insensitive partial match)
   * @param {string} searchTerm - Search term
   * @returns {Array} Matching directors
   */
  searchByName(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.findWhere(director => 
      director.name.toLowerCase().includes(term)
    );
  }
}

// Singleton instance
const directorRepository = new DirectorRepository();

export { directorRepository };
