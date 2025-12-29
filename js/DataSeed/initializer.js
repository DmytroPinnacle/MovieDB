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
  const existingCount = movieRepository.count();
  
  SEED_MOVIES.forEach(([title, year, genres, rating, imdbId, posterUrl, kinopoiskId, directorNames]) => {
    let movie = null;
    
    // Check if movie exists
    if (existingCount > 0) {
      const found = movieRepository.findWhere(m => m.title === title && m.year === year);
      if (found.length > 0) movie = found[0];
    }
    
    // If movie exists and has directors, skip
    if (movie && movie.directorIds && movie.directorIds.length > 0) {
      return;
    }

    // Handle directors
    const directorIds = [];
    if (directorNames && Array.isArray(directorNames)) {
      directorNames.forEach(name => {
        let director = directorRepository.findWhere(d => d.name === name)[0];
        if (!director) {
          director = createDirector({ name });
          directorRepository.add(director);
        }
        directorIds.push(director.id);
      });
    }

    if (movie) {
      // Update existing movie with directors
      if (directorIds.length > 0) {
        movie.directorIds = directorIds;
        movieRepository.update(movie.id, movie);
      }
    } else if (existingCount === 0) {
      // Only create new movies if we are in a fresh seed state
      // (Prevents re-adding movies user might have deleted if we just ran update)
      // However, for this fix, we mainly care about updating existing ones.
      // But let's keep the original behavior: if count=0, add all.
      
      const newMovie = createMovie({ 
        title, 
        year, 
        genres: Array.isArray(genres) ? genres : [genres], // Handle both old and new format
        rating, 
        posterUrl: posterUrl || '', 
        notes: '', 
        imdbId: imdbId || '',
        kinopoiskId: kinopoiskId || '',
        directorIds: directorIds
      });
      movieRepository.add(newMovie);
      movie = newMovie;
    }

    // Update directors with movie ID if we have a movie object
    if (movie) {
      directorIds.forEach(dId => {
        const director = directorRepository.getById(dId);
        if (director) {
          if (!director.movieIds.includes(movie.id)) {
              director.movieIds.push(movie.id);
              directorRepository.update(dId, director);
          }
        }
      });
    }
  });
  
  console.info(`Processed seed movies. Existing count: ${existingCount}`);
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
