/**
 * Seed Initializer
 * Loads seed data into repositories
 */
import { movieRepository, watcherRepository, sessionRepository, directorRepository } from '../dal/index.js';
import { createMovie, createDirector } from '../models.js';
import { createWatcher } from '../watcher-models.js';
import { createSession } from '../session-models.js';
import { SEED_MOVIES } from './seed.js';
import { SEED_WATCHERS } from './watcher-seed.js';
import { SEED_SESSIONS } from './session-seed.js';

/**
 * Initialize watchers from seed data (Async)
 */
export async function seedWatchers() {
  // Ensure data is loaded to check count
  if (watcherRepository.count() === 0) {
      await watcherRepository.load();
  }

  if (watcherRepository.count() > 0) {
    console.info('Watchers already exist, skipping seed.');
    return;
  }
  
  console.info('Seeding watchers...');
  const promises = SEED_WATCHERS.map(([firstName, lastName]) => {
    const watcher = createWatcher({ firstName, lastName: lastName || '' });
    return watcherRepository.add(watcher);
  });
  
  await Promise.all(promises);
  console.info(`Seeded ${SEED_WATCHERS.length} watchers.`);
}

/**
 * Initialize movies from seed data (Async)
 */
export async function seedMovies() {
  // Ensure data loaded
  if (movieRepository.count() === 0) await movieRepository.load();
  if (directorRepository.count() === 0) await directorRepository.load();

  const existingCount = movieRepository.count();
  
  // We process sequentially to avoid race conditions with creating directors
  // or use a map to track created directors during the loop
  
  // First, ensure all needed directors exist
  const directorsCache = new Map(); // name -> id
  // Pre-fill from existing
  directorRepository.getAll().forEach(d => directorsCache.set(d.name, d.id));

  for (const [title, year, genres, rating, imdbId, posterUrl, kinopoiskId, directorNames] of SEED_MOVIES) {
      let movie = null;
      
      // Check if movie exists locally
      const found = movieRepository.findWhere(m => m.title === title && m.year === year);
      if (found.length > 0) movie = found[0];

      // If movie exists and has directors, skip
      if (movie && movie.directorIds && movie.directorIds.length > 0) {
        continue;
      }

      // Handle directors
      const directorIds = [];
      if (directorNames && Array.isArray(directorNames)) {
          for (const name of directorNames) {
              let dId = directorsCache.get(name);
              if (!dId) {
                  // Double check repo
                  const existingD = directorRepository.findWhere(d => d.name === name)[0];
                  if (existingD) {
                      dId = existingD.id;
                  } else {
                      const newDirector = createDirector({ name });
                      await directorRepository.add(newDirector);
                      dId = newDirector.id;
                  }
                  directorsCache.set(name, dId);
              }
              directorIds.push(dId);
          }
      }

      if (movie) {
          // Update existing movie with directors
          if (directorIds.length > 0) {
              movie.directorIds = directorIds;
              await movieRepository.update(movie.id, movie);
          }
      } else if (existingCount === 0) {
          const newMovie = createMovie({ 
              title, 
              year, 
              genres: Array.isArray(genres) ? genres : [genres],
              rating, 
              posterUrl: posterUrl || '', 
              notes: '', 
              imdbId: imdbId || '',
              kinopoiskId: kinopoiskId || '',
              directorIds: directorIds
          });
          await movieRepository.add(newMovie);
          movie = newMovie;
      }

      // Update directors with movie ID
      if (movie && directorIds.length > 0) {
          for (const dId of directorIds) {
              // We need to fetch director again or check cache object reference?
              // The cache only stores ID. Get object from repo (now in _data)
              const director = directorRepository.getById(dId);
              if (director && !director.movieIds.includes(movie.id)) {
                  director.movieIds.push(movie.id);
                  await directorRepository.update(dId, director);
              }
          }
      }
  }
  
  console.info(`Processed seed movies.`);
}

/**
 * Initialize sessions from seed data (Async)
 */
export async function seedSessions() {
  if (sessionRepository.count() === 0) await sessionRepository.load();

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
  
  const promises = SEED_SESSIONS.map(([movieIdx, watcherIdxs, dateStr, notes, ratings]) => {
    if (movieIdx >= movies.length) return Promise.resolve();
    
    const movie = movies[movieIdx];
    const watcherIds = watcherIdxs
      .filter(idx => idx < watchers.length)
      .map(idx => watchers[idx].id);
    
    if (watcherIds.length === 0) return Promise.resolve();
    
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
    
    return sessionRepository.add(session);
  });
  
  await Promise.all(promises);
  console.info(`Seeded ${SEED_SESSIONS.length} watching sessions.`);
}

/**
 * Initialize all seed data (Async)
 */
export async function initializeSeedData() {
  await seedWatchers();
  await seedMovies();
  await seedSessions();
}
