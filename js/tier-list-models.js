// Tier List data models & validation

/** TierList object shape
 *  {
 *    id: string (uuid),
 *    name: string,
 *    participantIds: string[] (watcher IDs),
 *    tiers: {
 *      [watcherId]: {
 *        S: string[] (movie IDs),
 *        A: string[] (movie IDs),
 *        B: string[] (movie IDs),
 *        C: string[] (movie IDs),
 *        D: string[] (movie IDs)
 *      }
 *    },
 *    selectedMovieIds: string[] (movies ready to be placed),
 *    createdAt: number (epoch ms),
 *    updatedAt: number (epoch ms)
 *  }
 */

export function createTierList(data) {
  const now = Date.now();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'tl_' + Math.random().toString(36).slice(2, 11),
    name: data.name.trim(),
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    tiers: {},
    selectedMovieIds: [],
    createdAt: now,
    updatedAt: now
  };
}

export function validateTierListFields(data) {
  const errors = {};
  if (!data.name || !data.name.trim()) {
    errors.name = 'Tier list name is required';
  }
  return errors;
}

export function updateTierList(original, updates) {
  return {
    ...original,
    name: updates.name.trim(),
    updatedAt: Date.now()
  };
}

export function addParticipant(tierList, watcherId) {
  if (!tierList.participantIds.includes(watcherId)) {
    tierList.participantIds.push(watcherId);
    tierList.tiers[watcherId] = {
      S: [],
      A: [],
      B: [],
      C: [],
      D: []
    };
    tierList.updatedAt = Date.now();
  }
  return tierList;
}

export function removeParticipant(tierList, watcherId) {
  tierList.participantIds = tierList.participantIds.filter(id => id !== watcherId);
  delete tierList.tiers[watcherId];
  tierList.updatedAt = Date.now();
  return tierList;
}

export function addMovieToSelected(tierList, movieId) {
  if (!tierList.selectedMovieIds.includes(movieId)) {
    tierList.selectedMovieIds.push(movieId);
    tierList.updatedAt = Date.now();
  }
  return tierList;
}

export function removeMovieFromSelected(tierList, movieId) {
  tierList.selectedMovieIds = tierList.selectedMovieIds.filter(id => id !== movieId);
  tierList.updatedAt = Date.now();
  return tierList;
}

export function addMovieToTier(tierList, watcherId, tier, movieId) {
  if (!tierList.tiers[watcherId]) {
    tierList.tiers[watcherId] = { S: [], A: [], B: [], C: [], D: [] };
  }
  if (!tierList.tiers[watcherId][tier].includes(movieId)) {
    tierList.tiers[watcherId][tier].push(movieId);
    tierList.updatedAt = Date.now();
  }
  return tierList;
}

export function removeMovieFromTier(tierList, watcherId, tier, movieId) {
  if (tierList.tiers[watcherId] && tierList.tiers[watcherId][tier]) {
    tierList.tiers[watcherId][tier] = tierList.tiers[watcherId][tier].filter(id => id !== movieId);
    tierList.updatedAt = Date.now();
  }
  return tierList;
}

export function isMovieInAllTiers(tierList, movieId) {
  for (const watcherId of tierList.participantIds) {
    const watcherTiers = tierList.tiers[watcherId];
    if (!watcherTiers) return false;
    
    const inAnyTier = ['S', 'A', 'B', 'C', 'D'].some(tier => 
      watcherTiers[tier].includes(movieId)
    );
    
    if (!inAnyTier) return false;
  }
  return tierList.participantIds.length > 0;
}

export function findMovieInTiers(tierList, movieId) {
  const locations = [];
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
  return locations;
}
