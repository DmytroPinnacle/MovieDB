/**
 * Watcher Storage - Compatibility Layer
 * Wraps WatcherRepository to maintain existing API
 */
import { watcherRepository } from './dal/index.js';

export function loadWatchers() {
  return watcherRepository.getAll();
}

export function addWatcher(watcher) {
  return watcherRepository.add(watcher);
}

export function updateWatcherInStore(id, watcher) {
  return watcherRepository.update(id, watcher);
}

export function deleteWatcher(id) {
  return watcherRepository.delete(id);
}

export function getWatchers() {
  return watcherRepository.getAll();
}

export function getWatcherById(id) {
  return watcherRepository.getById(id);
}

export function clearAllWatchers() {
  watcherRepository.clear();
}

export function getFavorites() {
  return watcherRepository.getFavorites();
}

export function isFavorite(watcherId) {
  return watcherRepository.isFavorite(watcherId);
}

export function toggleFavorite(watcherId) {
  return watcherRepository.toggleFavorite(watcherId);
}

export function getWatchersSortedByFavorites() {
  return watcherRepository.getAllSortedByFavorites();
}
