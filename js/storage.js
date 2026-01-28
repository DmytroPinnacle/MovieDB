/**
 * Movie Storage - Compatibility Layer
 * Wraps MovieRepository to maintain existing API
 */
import { movieRepository } from './dal/index.js';

export function loadMovies() {
  return movieRepository.load();
}

export function addMovie(movie) {
  return movieRepository.add(movie);
}

export function updateMovieInStore(id, movie) {
  return movieRepository.update(id, movie);
}

export function deleteMovie(id) {
  return movieRepository.delete(id);
}

export function getMovies() {
  return movieRepository.getAll();
}

export function clearAllMovies() {
  movieRepository.clear();
}
