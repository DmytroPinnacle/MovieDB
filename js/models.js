// Data models & validation logic
// A simple schema approach without external libs

/** Movie object shape (for reference)
 *  {
 *    id: string (uuid-ish),
 *    title: string,
 *    year: number,
 *    genres: string[] (array of genre strings),
 *    rating?: number,
 *    posterUrl?: string,
 *    notes?: string,
 *    imdbId?: string (format: tt1234567),
 *    kinopoiskId?: string (numeric ID),
 *    watcherIds?: string[] (array of watcher ids),
 *    createdAt: number (epoch ms),
 *    updatedAt: number (epoch ms)
 *  }
 */

export function createMovie(data) {
  const now = Date.now();
  // Handle watcherIds - could be array from FormData.getAll() or comma-separated string
  let watcherIds = [];
  if (data.watcherIds) {
    watcherIds = Array.isArray(data.watcherIds) 
      ? data.watcherIds.filter(id => id && id.trim())
      : data.watcherIds.split(',').map(id => id.trim()).filter(Boolean);
  }
  // Handle genres - could be array from FormData.getAll() or comma-separated string
  let genres = [];
  if (data.genres) {
    genres = Array.isArray(data.genres)
      ? data.genres.filter(g => g && g.trim()).map(g => g.trim())
      : data.genres.split(',').map(g => g.trim()).filter(Boolean);
  } else if (data.genre) {
    // Backwards compatibility: if 'genre' field exists, use it
    genres = [data.genre.trim()];
  }
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).slice(2, 11),
    title: data.title.trim(),
    year: Number(data.year),
    genres: genres,
    rating: data.rating === '' || data.rating == null ? null : Number(data.rating),
    posterUrl: (data.posterUrl || '').trim(),
    notes: (data.notes || '').trim(),
    imdbId: (data.imdbId || '').trim(),
    kinopoiskId: (data.kinopoiskId || '').trim(),
    watcherIds: watcherIds,
    createdAt: now,
    updatedAt: now
  };
}

export function validateMovieFields(fields) {
  const errors = {};
  if (!fields.title || !fields.title.trim()) errors.title = 'Title is required';
  if (fields.title && fields.title.trim().length > 120) errors.title = 'Max 120 chars';
  const year = Number(fields.year);
  if (!year) errors.year = 'Year is required';
  else if (year < 1888 || year > 2100) errors.year = 'Year out of range';
  // Validate genres - accept either genres array or genre string
  const hasGenres = (fields.genres && fields.genres.length > 0) || (fields.genre && fields.genre.trim());
  if (!hasGenres) errors.genres = 'At least one genre required';
  if (fields.rating !== '' && fields.rating != null) {
    const r = Number(fields.rating);
    if (Number.isNaN(r) || r < 0 || r > 10) errors.rating = '0 - 10 only';
  }
  if (fields.posterUrl) {
    try { new URL(fields.posterUrl); } catch { errors.posterUrl = 'Must be a valid URL'; }
  }
  if (fields.imdbId && fields.imdbId.trim()) {
    const imdbPattern = /^tt\d{7,8}$/;
    if (!imdbPattern.test(fields.imdbId.trim())) {
      errors.imdbId = 'Format: tt1234567 (tt + 7-8 digits)';
    }
  }
  if (fields.kinopoiskId && fields.kinopoiskId.trim()) {
    const kinopoiskPattern = /^\d+$/;
    if (!kinopoiskPattern.test(fields.kinopoiskId.trim())) {
      errors.kinopoiskId = 'Must be numeric (e.g., 326)';
    }
  }
  if (fields.notes && fields.notes.length > 500) errors.notes = 'Max 500 chars';
  return errors;
}

export function updateMovie(original, updates) {
  // Handle watcherIds - could be array from FormData.getAll() or comma-separated string
  let watcherIds = [];
  if (updates.watcherIds) {
    watcherIds = Array.isArray(updates.watcherIds) 
      ? updates.watcherIds.filter(id => id && id.trim())
      : updates.watcherIds.split(',').map(id => id.trim()).filter(Boolean);
  }
  // Handle genres - could be array from FormData.getAll() or comma-separated string
  let genres = [];
  if (updates.genres) {
    genres = Array.isArray(updates.genres)
      ? updates.genres.filter(g => g && g.trim()).map(g => g.trim())
      : updates.genres.split(',').map(g => g.trim()).filter(Boolean);
  } else if (updates.genre) {
    // Backwards compatibility: if 'genre' field exists, use it
    genres = [updates.genre.trim()];
  }
  return {
    ...original,
    title: updates.title.trim(),
    year: Number(updates.year),
    genres: genres,
    rating: updates.rating === '' || updates.rating == null ? null : Number(updates.rating),
    posterUrl: (updates.posterUrl || '').trim(),
    notes: (updates.notes || '').trim(),
    imdbId: (updates.imdbId || '').trim(),
    kinopoiskId: (updates.kinopoiskId || '').trim(),
    watcherIds: watcherIds,
    updatedAt: Date.now()
  };
}
