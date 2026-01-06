import { BaseRepository } from './BaseRepository.js';

export class TierListRepository extends BaseRepository {
  constructor() {
    super('TierList');
  }

  addParticipant(tierListId, watcherId) {
    const tierList = this.getById(tierListId);
    if (tierList && !tierList.participantIds.includes(watcherId)) {
      tierList.participantIds.push(watcherId);
      tierList.tiers[watcherId] = {
        S: [],
        A: [],
        B: [],
        C: [],
        D: []
      };
      tierList.updatedAt = Date.now();
      this.update(tierListId, tierList);
      return true;
    }
    return false;
  }

  removeParticipant(tierListId, watcherId) {
    const tierList = this.getById(tierListId);
    if (tierList) {
      tierList.participantIds = tierList.participantIds.filter(id => id !== watcherId);
      delete tierList.tiers[watcherId];
      tierList.updatedAt = Date.now();
      this.update(tierListId, tierList);
      return true;
    }
    return false;
  }

  addMovieToSelected(tierListId, movieId) {
    const tierList = this.getById(tierListId);
    if (tierList && !tierList.selectedMovieIds.includes(movieId)) {
      tierList.selectedMovieIds.push(movieId);
      tierList.updatedAt = Date.now();
      this.update(tierListId, tierList);
      return true;
    }
    return false;
  }

  addMoviesToSelected(tierListId, movieIds) {
    const tierList = this.getById(tierListId);
    if (tierList) {
      let added = false;
      for (const movieId of movieIds) {
        if (!tierList.selectedMovieIds.includes(movieId)) {
          tierList.selectedMovieIds.push(movieId);
          added = true;
        }
      }
      if (added) {
        tierList.updatedAt = Date.now();
        this.update(tierListId, tierList);
      }
      return added;
    }
    return false;
  }

  removeMovieFromSelected(tierListId, movieId) {
    const tierList = this.getById(tierListId);
    if (tierList) {
      tierList.selectedMovieIds = tierList.selectedMovieIds.filter(id => id !== movieId);
      tierList.updatedAt = Date.now();
      this.update(tierListId, tierList);
      return true;
    }
    return false;
  }

  addMovieToTier(tierListId, watcherId, tier, movieId) {
    const tierList = this.getById(tierListId);
    if (tierList) {
      if (!tierList.tiers[watcherId]) {
        tierList.tiers[watcherId] = { S: [], A: [], B: [], C: [], D: [] };
      }
      if (!tierList.tiers[watcherId][tier].includes(movieId)) {
        tierList.tiers[watcherId][tier].push(movieId);
        tierList.updatedAt = Date.now();
        this.update(tierListId, tierList);
        
        // Check if movie should be removed from selected
        if (this.isMovieInAllTiers(tierListId, movieId)) {
          this.removeMovieFromSelected(tierListId, movieId);
        }
        return true;
      }
    }
    return false;
  }

  removeMovieFromTier(tierListId, watcherId, tier, movieId) {
    const tierList = this.getById(tierListId);
    if (tierList && tierList.tiers[watcherId] && tierList.tiers[watcherId][tier]) {
      tierList.tiers[watcherId][tier] = tierList.tiers[watcherId][tier].filter(id => id !== movieId);
      tierList.updatedAt = Date.now();
      this.update(tierListId, tierList);
      
      // Add back to selected if not in all tiers anymore
      if (!this.isMovieInAllTiers(tierListId, movieId) && !tierList.selectedMovieIds.includes(movieId)) {
        this.addMovieToSelected(tierListId, movieId);
      }
      return true;
    }
    return false;
  }

  isMovieInAllTiers(tierListId, movieId) {
    const tierList = this.getById(tierListId);
    if (!tierList || tierList.participantIds.length === 0) return false;
    
    for (const watcherId of tierList.participantIds) {
      const watcherTiers = tierList.tiers[watcherId];
      if (!watcherTiers) return false;
      
      const inAnyTier = ['S', 'A', 'B', 'C', 'D'].some(tier => 
        watcherTiers[tier].includes(movieId)
      );
      
      if (!inAnyTier) return false;
    }
    return true;
  }

  findMovieInTiers(tierListId, movieId) {
    const tierList = this.getById(tierListId);
    const locations = [];
    if (tierList) {
      for (const watcherId of tierList.participantIds) {
        const watcherTiers = tierList.tiers[watcherId];
        if (watcherTiers) {
          for (const tier of ['S', 'A', 'B', 'C', 'D']) {
            if (watcherTiers[tier].includes(movieId)) {
              locations.push({ watcherId, tier });
            }
          }
        }
      }
    }
    return locations;
  }
}

export const tierListRepository = new TierListRepository();
