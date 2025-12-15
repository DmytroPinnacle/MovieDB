// UI rendering + DOM helpers
import { getMovies } from './storage.js';
import { getWatchers, getWatcherById, isFavorite } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';
import { getLatestSessionByMovieId } from './session-storage.js';
import { getLists, addList, addMovieToList, removeMovieFromList } from './list-storage.js';
import { createList } from './list-models.js';

export function qs(sel, parent=document){ return parent.querySelector(sel); }
export function qsa(sel, parent=document){ return Array.from(parent.querySelectorAll(sel)); }

export function renderMovieList({ filterText='', genres=[], watchers=[], lists=[], sort='title-asc' }) {
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
  if (watchers.length > 0) {
    movies = movies.filter(m => {
      // Get latest session watchers (if any), otherwise use movie watchers
      const latestSession = getLatestSessionByMovieId(m.id);
      const movieWatchers = latestSession ? latestSession.watcherIds : (m.watcherIds || []);
      // AND logic: movie must have ALL selected watchers
      return watchers.every(selectedWatcher => movieWatchers.includes(selectedWatcher));
    });
  }
  if (lists.length > 0) {
    const allLists = getLists();
    movies = movies.filter(m => {
      // AND logic: movie must be in ALL selected lists
      return lists.every(selectedListId => {
        const list = allLists.find(l => l.id === selectedListId);
        return list && list.movieIds.includes(m.id);
      });
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
    
    // Menu button
    const menuBtn = node.querySelector('.movie-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openListModal(m.id);
      });
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

export function populateWatcherFilter() {
  const container = qs('#filterWatcher');
  const dropdown = container.querySelector('.multiselect-dropdown');
  const watchers = getWatchers();
  
  // Sort: favorites first, then alphabetically
  const favorites = [];
  const nonFavorites = [];
  
  watchers.forEach(w => {
    if (isFavorite(w.id)) {
      favorites.push(w);
    } else {
      nonFavorites.push(w);
    }
  });
  
  // Sort each group alphabetically
  const sortByName = (a, b) => {
    const nameA = getWatcherFullName(a).toLowerCase();
    const nameB = getWatcherFullName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  };
  
  favorites.sort(sortByName);
  nonFavorites.sort(sortByName);
  
  const sortedWatchers = [...favorites, ...nonFavorites];
  
  dropdown.innerHTML = sortedWatchers.map(w => 
    `<div class="multiselect-option" data-watcher-id="${w.id}">${getWatcherFullName(w)}</div>`
  ).join('');
}

export function populateListFilter() {
  const container = qs('#filterList');
  const dropdown = container.querySelector('.multiselect-dropdown');
  const lists = getLists();
  
  dropdown.innerHTML = lists.map(l => 
    `<div class="multiselect-option" data-list-id="${l.id}">${l.name}</div>`
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

// --- List Management ---

let currentMovieIdForList = null;

function openListModal(movieId) {
  currentMovieIdForList = movieId;
  const modal = qs('#listModal');
  renderListSelection(movieId);
  modal.classList.remove('hidden');
}

function renderListSelection(movieId) {
  const listContainer = qs('#availableLists');
  listContainer.innerHTML = '';
  const lists = getLists();

  if (lists.length === 0) {
    listContainer.innerHTML = '<li class="watcher-dropdown-empty">No lists created yet.</li>';
    return;
  }

  lists.forEach(list => {
    const isSelected = list.movieIds.includes(movieId);
    const li = document.createElement('li');
    li.className = `list-selection-item ${isSelected ? 'selected' : ''}`;
    li.innerHTML = `
      <span>${list.name}</span>
      <span class="list-check">✓</span>
    `;
    li.addEventListener('click', () => toggleMovieInList(list.id, movieId));
    listContainer.appendChild(li);
  });
}

function toggleMovieInList(listId, movieId) {
  const lists = getLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return;

  if (list.movieIds.includes(movieId)) {
    removeMovieFromList(listId, movieId);
  } else {
    addMovieToList(listId, movieId);
  }
  renderListSelection(movieId);
}

export function wireListModalEvents() {
  const modal = qs('#listModal');
  const closeBtn = modal.querySelector('.modal-close');
  const createBtn = qs('#createNewListBtn');
  const createForm = qs('#createListForm');
  const nameInput = qs('#newListName');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    currentMovieIdForList = null;
  });

  // Close on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      currentMovieIdForList = null;
    }
  });

  createBtn.addEventListener('click', () => {
    createForm.classList.toggle('hidden');
    if (!createForm.classList.contains('hidden')) {
      nameInput.focus();
    }
  });

  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name) {
      const newList = createList({ name });
      addList(newList);
      nameInput.value = '';
      createForm.classList.add('hidden');
      populateListFilter(); // Refresh the filter dropdown
      if (currentMovieIdForList) {
        renderListSelection(currentMovieIdForList);
      }
    }
  });
}

