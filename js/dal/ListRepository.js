import { BaseRepository } from './BaseRepository.js';

export class ListRepository extends BaseRepository {
  constructor() {
    super('List');
  }

  addMovieToList(listId, movieId) {
    const list = this.getById(listId);
    if (list && !list.movieIds.includes(movieId)) {
      list.movieIds.push(movieId);
      list.updatedAt = Date.now();
      this.update(listId, list);
      return true;
    }
    return false;
  }

  removeMovieFromList(listId, movieId) {
    const list = this.getById(listId);
    if (list && list.movieIds.includes(movieId)) {
      list.movieIds = list.movieIds.filter(id => id !== movieId);
      list.updatedAt = Date.now();
      this.update(listId, list);
      return true;
    }
    return false;
  }
}

export const listRepository = new ListRepository();
