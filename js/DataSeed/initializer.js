/**
 * Seed Initializer
 * Loads seed data into repositories
 */
import { movieRepository, watcherRepository, sessionRepository } from '../dal/index.js';
import { createMovie } from '../models.js';
import { createWatcher } from '../watcher-models.js';
import { createSession } from '../session-models.js';
import { SEED_MOVIES } from './seed.js';
import { SEED_WATCHERS } from './watcher-seed.js';
import { SEED_SESSIONS } from './session-seed.js';

/**
 * Initialize watchers from seed data
 */
export function seedWatchers() {
  if (watcherRepository.count() > 0) {
    console.info('Watchers already exist, skipping seed.');
    return;
  }
  
  SEED_WATCHERS.forEach(([firstName, lastName]) => {
    const watcher = createWatcher({ firstName, lastName: lastName || '' });
    watcherRepository.add(watcher);
  });
  
  console.info(`Seeded ${SEED_WATCHERS.length} watchers.`);
}

/**
 * Initialize movies from seed data
 */
export function seedMovies() {
  if (movieRepository.count() > 0) {
    console.info('Movies already exist, skipping seed.');
    return;
  }
  
  SEED_MOVIES.forEach(([title, year, genres, rating, imdbId, posterUrl, kinopoiskId]) => {
    const movie = createMovie({ 
      title, 
      year, 
      genres: Array.isArray(genres) ? genres : [genres], // Handle both old and new format
      rating, 
      posterUrl: posterUrl || '', 
      notes: '', 
      imdbId: imdbId || '',
      kinopoiskId: kinopoiskId || ''
    });
    movieRepository.add(movie);
  });
  
  console.info(`Seeded ${SEED_MOVIES.length} movies.`);
}

/**
 * Initialize sessions from seed data
 */
export function seedSessions() {
  if (sessionRepository.count() > 0) {
    console.info('Sessions already exist, skipping seed.');
    return;
  }
  
  const watchers = watcherRepository.getAll();
  const movies = movieRepository.getAll();
  
  if (watchers.length === 0 || movies.length === 0) {
    console.warn('Cannot seed sessions: watchers or movies not available.');
    return;
  }
  
  SEED_SESSIONS.forEach(([movieIdx, watcherIdxs, dateStr, notes, ratings]) => {
    if (movieIdx >= movies.length) return;
    
    const movie = movies[movieIdx];
    const watcherIds = watcherIdxs
      .filter(idx => idx < watchers.length)
      .map(idx => watchers[idx].id);
    
    if (watcherIds.length === 0) return;
    
    // Convert date string to timestamp
    const [year, month, day] = dateStr.split('-').map(Number);
    const watchedDate = new Date(year, month - 1, day).getTime();
    
    // Convert rating indexes to watcher IDs
    const watcherRatings = {};
    Object.entries(ratings).forEach(([watcherIdx, rating]) => {
      const idx = parseInt(watcherIdx);
      if (idx < watchers.length) {
        watcherRatings[watchers[idx].id] = rating;
      }
    });
    
    const session = createSession({
      movieId: movie.id,
      watcherIds: watcherIds,
      watchedDate: watchedDate,
      notes: notes || '',
      watcherRatings: watcherRatings
    });
    
    sessionRepository.add(session);
  });
  
  console.info(`Seeded ${SEED_SESSIONS.length} watching sessions.`);
}

/**
 * Initialize all seed data
 */
export function initializeSeedData() {
  seedWatchers();
  seedMovies();
  seedSessions();
}
