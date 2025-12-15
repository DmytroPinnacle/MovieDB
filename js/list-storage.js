import { listRepository } from './dal/index.js';

export function getLists() {
  return listRepository.getAll();
}

export function addList(list) {
  return listRepository.add(list);
}

export function addMovieToList(listId, movieId) {
  return listRepository.addMovieToList(listId, movieId);
}

export function removeMovieFromList(listId, movieId) {
  return listRepository.removeMovieFromList(listId, movieId);
}
