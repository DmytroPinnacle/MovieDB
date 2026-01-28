import { listRepository } from './dal/index.js';

export function loadLists() {
  return listRepository.load();
}

export function getLists() {
  return listRepository.getAll();
}

export function addList(list) {
  return listRepository.add(list);
}

export function updateList(id, list) {
  return listRepository.update(id, list);
}

export function deleteList(id) {
  return listRepository.delete(id);
}

export function addMovieToList(listId, movieId) {
  return listRepository.addMovieToList(listId, movieId);
}

export function removeMovieFromList(listId, movieId) {
  return listRepository.removeMovieFromList(listId, movieId);
}
