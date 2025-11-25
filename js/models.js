// Data models & validation logic
// A simple schema approach without external libs

/** Movie object shape (for reference)
 *  {
 *    id: string (uuid-ish),
 *    title: string,
 *    year: number,
 *    genre: string,
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
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).slice(2, 11),
    title: data.title.trim(),
    year: Number(data.year),
    genre: data.genre.trim(),
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
  if (!fields.genre || !fields.genre.trim()) errors.genre = 'Genre required';
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
  return {
    ...original,
    title: updates.title.trim(),
    year: Number(updates.year),
    genre: updates.genre.trim(),
    rating: updates.rating === '' || updates.rating == null ? null : Number(updates.rating),
    posterUrl: (updates.posterUrl || '').trim(),
    notes: (updates.notes || '').trim(),
    imdbId: (updates.imdbId || '').trim(),
    kinopoiskId: (updates.kinopoiskId || '').trim(),
    watcherIds: watcherIds,
    updatedAt: Date.now()
  };
}
