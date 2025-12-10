// UI rendering + DOM helpers
import { getMovies } from './storage.js';
import { getWatchers, getWatcherById } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';
import { getLatestSessionByMovieId } from './session-storage.js';

export function qs(sel, parent=document){ return parent.querySelector(sel); }
export function qsa(sel, parent=document){ return Array.from(parent.querySelectorAll(sel)); }

export function renderMovieList({ filterText='', genres=[], sort='title-asc' }) {
  const listEl = qs('#movieList');
  const emptyState = qs('#emptyState');
  const tpl = qs('#movieItemTemplate');
  let movies = getMovies();

  // filter
  const ft = filterText.trim().toLowerCase();
  if (ft) movies = movies.filter(m => m.title.toLowerCase().includes(ft));
  if (genres.length > 0) {
    movies = movies.filter(m => {
      // Handle both old 'genre' string and new 'genres' array
      const movieGenres = Array.isArray(m.genres) ? m.genres : (m.genre ? [m.genre] : []);
      // AND logic: movie must have ALL selected genres
      return genres.every(selectedGenre => 
        movieGenres.some(movieGenre => movieGenre.toLowerCase() === selectedGenre.toLowerCase())
      );
    });
  }

  // sort
  const [field, dir] = sort.split('-');
  movies.sort((a,b) => {
    let av, bv;
    switch(field){
      case 'year': av=a.year; bv=b.year; break;
      case 'rating': av=a.rating ?? -Infinity; bv=b.rating ?? -Infinity; break;
      case 'title':
      default: av=a.title.toLowerCase(); bv=b.title.toLowerCase(); break;
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  listEl.innerHTML='';
  if (!movies.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const frag = document.createDocumentFragment();
  movies.forEach(m => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = m.id;
    const poster = node.querySelector('.poster');
    if (m.posterUrl && m.posterUrl.trim()) {
      poster.src = m.posterUrl;
      poster.alt = `Poster for ${m.title}`;
    } else {
      poster.remove();
      const wrap = node.querySelector('.poster-wrapper');
      wrap.textContent = 'No Poster';
    }
    const titleLink = node.querySelector('.title-link');
    titleLink.textContent = m.title;
    titleLink.href = `detail.html?id=${encodeURIComponent(m.id)}`;
    
    // Get latest session watchers (if any), otherwise use movie watchers
    const latestSession = getLatestSessionByMovieId(m.id);
    const watcherIds = latestSession ? latestSession.watcherIds : (m.watcherIds || []);
    const watcherFirstNames = watcherIds
      .map(id => getWatcherById(id))
      .filter(Boolean)
      .map(w => w.firstName);
    
    // Display first genre only (handle both old 'genre' string and new 'genres' array)
    const displayGenre = Array.isArray(m.genres) && m.genres.length > 0 
      ? m.genres[0] 
      : (m.genre || 'Unknown');
    
    node.querySelector('.meta').textContent = `${displayGenre} • ${m.year}${m.rating!=null ? ' • ⭐ ' + m.rating : ''}`;
    
    // Add watchers as small text below notes
    const watchersSection = node.querySelector('.watchers-section');
    if (watcherFirstNames.length > 0) {
      watchersSection.textContent = `👤 ${watcherFirstNames.join(', ')}`;
      watchersSection.classList.remove('hidden');
    } else {
      watchersSection.classList.add('hidden');
    }
    
    // Handle IMDB link
    const imdbLink = node.querySelector('.imdb-link');
    if (m.imdbId && m.imdbId.trim()) {
      imdbLink.href = `https://www.imdb.com/title/${m.imdbId}/`;
      imdbLink.classList.remove('hidden');
    } else {
      imdbLink.classList.add('hidden');
    }
    
    // Handle Kinopoisk link
    const kinopoiskLink = node.querySelector('.kinopoisk-link');
    if (m.kinopoiskId && m.kinopoiskId.trim()) {
      kinopoiskLink.href = `https://www.kinopoisk.ru/film/${m.kinopoiskId}/`;
      kinopoiskLink.classList.remove('hidden');
    } else {
      kinopoiskLink.classList.add('hidden');
    }
    
    frag.appendChild(node);
  });
  listEl.appendChild(frag);
}

export function populateGenreFilter() {
  const container = qs('#filterGenre');
  const dropdown = container.querySelector('.multiselect-dropdown');
  const movies = getMovies();
  // Collect all unique genres from all movies (handling both old and new format)
  const allGenres = new Set();
  movies.forEach(m => {
    if (Array.isArray(m.genres)) {
      m.genres.forEach(g => allGenres.add(g));
    } else if (m.genre) {
      allGenres.add(m.genre);
    }
  });
  const genres = Array.from(allGenres).sort();
  dropdown.innerHTML = genres.map(g => 
    `<div class="multiselect-option" data-genre="${g}">${g}</div>`
  ).join('');
}

export function resetForm() {
  const form = qs('#movieForm');
  form.reset();
  qs('#movieId').value='';
  qs('#formTitle').textContent = 'Add Movie';
  qs('#saveBtn').textContent = 'Save';
}

export function showErrors(errors) {
  qsa('.error').forEach(el => el.textContent='');
  Object.entries(errors).forEach(([field,msg]) => {
    const el = qs(`[data-error-for="${field}"]`);
    if (el) el.textContent = msg;
  });
}

// Watcher UI functions
export function renderWatcherList() {
  const listEl = qs('#watcherList');
  const emptyState = qs('#watcherEmptyState');
  const tpl = qs('#watcherItemTemplate');
  const watchers = getWatchers().sort((a, b) => {
    const nameA = getWatcherFullName(a).toLowerCase();
    const nameB = getWatcherFullName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  listEl.innerHTML = '';
  if (!watchers.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const frag = document.createDocumentFragment();
  watchers.forEach(w => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = w.id;
    node.querySelector('.watcher-name').textContent = getWatcherFullName(w);
    frag.appendChild(node);
  });
  listEl.appendChild(frag);
}

export function fillWatcherForm(watcher) {
  qs('#watcherEditId').value = watcher.id;
  qs('#watcherFirstName').value = watcher.firstName;
  qs('#watcherLastName').value = watcher.lastName || '';
  qs('#cancelWatcherEditBtn').classList.remove('hidden');
  qs('#saveWatcherBtn').textContent = 'Update Watcher';
  qs('#watcherFirstName').focus();
}

export function resetWatcherForm() {
  const form = qs('#watcherForm');
  form.reset();
  qs('#watcherEditId').value = '';
  qs('#cancelWatcherEditBtn').classList.add('hidden');
  qs('#saveWatcherBtn').textContent = 'Add Watcher';
}

export function showWatcherModal() {
  qs('#watcherModal').classList.remove('hidden');
  qs('#watcherFirstName').focus();
}

export function hideWatcherModal() {
  qs('#watcherModal').classList.add('hidden');
  resetWatcherForm();
  showErrors({});
}
