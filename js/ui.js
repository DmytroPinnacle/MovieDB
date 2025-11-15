// UI rendering + DOM helpers
import { getMovies } from './storage.js';
import { getWatchers, getWatcherById } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';

export function qs(sel, parent=document){ return parent.querySelector(sel); }
export function qsa(sel, parent=document){ return Array.from(parent.querySelectorAll(sel)); }

export function renderMovieList({ filterText='', genre='', sort='title-asc' }) {
  const listEl = qs('#movieList');
  const emptyState = qs('#emptyState');
  const tpl = qs('#movieItemTemplate');
  let movies = getMovies();

  // filter
  const ft = filterText.trim().toLowerCase();
  if (ft) movies = movies.filter(m => m.title.toLowerCase().includes(ft));
  if (genre) movies = movies.filter(m => m.genre.toLowerCase() === genre.toLowerCase());

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
    
    // Get watcher first names only
    const watcherIds = m.watcherIds || [];
    const watcherFirstNames = watcherIds
      .map(id => getWatcherById(id))
      .filter(Boolean)
      .map(w => w.firstName);
    
    node.querySelector('.meta').textContent = `${m.genre} • ${m.year}${m.rating!=null ? ' • ⭐ ' + m.rating : ''}`;
    node.querySelector('.notes').textContent = m.notes || '';
    
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
    
    frag.appendChild(node);
  });
  listEl.appendChild(frag);
}

export function populateGenreFilter() {
  const select = qs('#filterGenre');
  const movies = getMovies();
  const genres = Array.from(new Set(movies.map(m => m.genre))).sort();
  const current = select.value;
  select.innerHTML = '<option value="">All Genres</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
  select.value = current;
}

export function populateWatcherCheckboxes(selectedIds = []) {
  const container = qs('#watcherCheckboxes');
  const watchers = getWatchers().sort((a, b) => {
    const nameA = getWatcherFullName(a).toLowerCase();
    const nameB = getWatcherFullName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  if (watchers.length === 0) {
    container.innerHTML = '<span class="no-watchers">No watchers available. Click "Manage Watchers" to add.</span>';
    return;
  }
  
  container.innerHTML = watchers.map(w => {
    const checked = selectedIds.includes(w.id) ? 'checked' : '';
    return `
      <label class="watcher-checkbox-label">
        <input type="checkbox" name="watcherIds" value="${w.id}" ${checked} />
        <span>${getWatcherFullName(w)}</span>
      </label>
    `;
  }).join('');
}

export function fillForm(movie) {
  qs('#movieId').value = movie.id;
  qs('#title').value = movie.title;
  qs('#year').value = movie.year;
  qs('#genre').value = movie.genre;
  qs('#rating').value = movie.rating == null ? '' : movie.rating;
  qs('#posterUrl').value = movie.posterUrl || '';
  qs('#imdbId').value = movie.imdbId || '';
  populateWatcherCheckboxes(movie.watcherIds || []);
  qs('#notes').value = movie.notes || '';
  qs('#cancelEditBtn').classList.remove('hidden');
  qs('#formTitle').textContent = 'Edit Movie';
  qs('#saveBtn').textContent = 'Update';
  qs('#title').focus();
}

export function resetForm() {
  const form = qs('#movieForm');
  form.reset();
  qs('#movieId').value='';
  populateWatcherCheckboxes([]);
  qs('#cancelEditBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Add / Edit Movie';
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
