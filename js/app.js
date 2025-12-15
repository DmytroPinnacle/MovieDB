// App entrypoint: wiring events + orchestrating modules
import { createMovie, validateMovieFields, updateMovie as mergeMovie } from './models.js';
import { loadMovies, addMovie, updateMovieInStore, getMovies } from './storage.js';
import { loadWatchers, addWatcher, updateWatcherInStore, deleteWatcher, getWatchers } from './watcher-storage.js';
import { createWatcher, validateWatcherFields, updateWatcher as mergeWatcher, getWatcherFullName } from './watcher-models.js';
import { loadSessions, addSession, getSessions } from './session-storage.js';
import { createSession } from './session-models.js';
import { getLists } from './list-storage.js';
import { initializeSeedData } from './DataSeed/initializer.js';
import { GenreDropdown } from './genre-dropdown.js';
import { 
  renderMovieList, populateGenreFilter, populateWatcherFilter, populateListFilter, resetForm, showErrors, 
  renderWatcherList, fillWatcherForm, resetWatcherForm, showWatcherModal, hideWatcherModal,
  wireListModalEvents,
  qs 
} from './ui.js';

// State for filters/sort
const viewState = {
  filterText: '',
  genres: [],
  watchers: [],
  lists: [],
  sort: 'title-asc'
};

let genreDropdown = null;

function init() {
  // Initialize seed data if needed
  initializeSeedData();
  
  // Load data into UI
  loadWatchers();
  loadMovies();
  loadSessions();
  
  // Initialize genre dropdown
  genreDropdown = new GenreDropdown('genreDropdown', {
    selectedGenres: [],
    placeholder: 'Select genres...'
  });
  
  populateGenreFilter();
  populateWatcherFilter();
  populateListFilter();
  renderMovieList(viewState);
  wireEvents();
  wireListModalEvents();
}

function wireEvents() {
  const searchInput = qs('#searchInput');
  const genreMultiselect = qs('#filterGenre');
  const sortSelect = qs('#sortSelect');
  const form = qs('#movieForm');
  const list = qs('#movieList');

  searchInput.addEventListener('input', () => {
    viewState.filterText = searchInput.value;
    renderMovieList(viewState);
  });
  
  // Multi-select genre filter events
  const selectedDisplay = genreMultiselect.querySelector('.multiselect-selected');
  const dropdown = genreMultiselect.querySelector('.multiselect-dropdown');
  
  selectedDisplay.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });
  
  selectedDisplay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dropdown.classList.toggle('hidden');
    }
  });
  
  dropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('multiselect-option')) {
      const genre = e.target.dataset.genre;
      if (viewState.genres.includes(genre)) {
        viewState.genres = viewState.genres.filter(g => g !== genre);
        e.target.classList.remove('selected');
      } else {
        viewState.genres.push(genre);
        e.target.classList.add('selected');
      }
      updateGenreDisplay();
      renderMovieList(viewState);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!genreMultiselect.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Multi-select watcher filter events
  const watcherMultiselect = qs('#filterWatcher');
  const watcherSelectedDisplay = watcherMultiselect.querySelector('.multiselect-selected');
  const watcherDropdown = watcherMultiselect.querySelector('.multiselect-dropdown');
  
  watcherSelectedDisplay.addEventListener('click', () => {
    watcherDropdown.classList.toggle('hidden');
  });
  
  watcherSelectedDisplay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      watcherDropdown.classList.toggle('hidden');
    }
  });
  
  watcherDropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('multiselect-option')) {
      const watcherId = e.target.dataset.watcherId;
      if (viewState.watchers.includes(watcherId)) {
        viewState.watchers = viewState.watchers.filter(w => w !== watcherId);
        e.target.classList.remove('selected');
      } else {
        viewState.watchers.push(watcherId);
        e.target.classList.add('selected');
      }
      updateWatcherDisplay();
      renderMovieList(viewState);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!watcherMultiselect.contains(e.target)) {
      watcherDropdown.classList.add('hidden');
    }
  });
  // Multi-select list filter events
  const listMultiselect = qs('#filterList');
  const listSelectedDisplay = listMultiselect.querySelector('.multiselect-selected');
  const listDropdown = listMultiselect.querySelector('.multiselect-dropdown');
  
  listSelectedDisplay.addEventListener('click', () => {
    listDropdown.classList.toggle('hidden');
  });
  
  listSelectedDisplay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      listDropdown.classList.toggle('hidden');
    }
  });
  
  listDropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('multiselect-option')) {
      const listId = e.target.dataset.listId;
      if (viewState.lists.includes(listId)) {
        viewState.lists = viewState.lists.filter(l => l !== listId);
        e.target.classList.remove('selected');
      } else {
        viewState.lists.push(listId);
        e.target.classList.add('selected');
      }
      updateListDisplay();
      renderMovieList(viewState);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!listMultiselect.contains(e.target)) {
      listDropdown.classList.add('hidden');
    }
    // Close movie context menus when clicking outside
    if (!e.target.closest('.movie-context-menu') && !e.target.closest('.movie-menu-btn')) {
      document.querySelectorAll('.movie-context-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });
  
  
  sortSelect.addEventListener('change', () => {
    viewState.sort = sortSelect.value;
    renderMovieList(viewState);
  });

  form.addEventListener('submit', onSubmitForm);
  form.addEventListener('reset', () => setTimeout(()=> showErrors({}), 0));
  
  function updateListDisplay() {
    const listNames = viewState.lists.map(id => {
      const list = getLists().find(l => l.id === id);
      return list ? list.name : null;
    }).filter(Boolean);
    
    if (listNames.length === 0) {
      listSelectedDisplay.textContent = 'All Lists';
      listSelectedDisplay.removeAttribute('title');
    } else {
      listSelectedDisplay.textContent = listNames.join(', ');
      if (listNames.length > 2) {
        listSelectedDisplay.setAttribute('title', listNames.join(', '));
      } else {
        listSelectedDisplay.removeAttribute('title');
      }
    }
  }

  function updateGenreDisplay() {
    if (viewState.genres.length === 0) {
      selectedDisplay.textContent = 'All Genres';
      selectedDisplay.removeAttribute('title');
    } else {
      selectedDisplay.textContent = viewState.genres.join(', ');
      if (viewState.genres.length > 2) {
        selectedDisplay.setAttribute('title', viewState.genres.join(', '));
      } else {
        selectedDisplay.removeAttribute('title');
      }
    }
  }
  
  function updateWatcherDisplay() {
    const watcherNames = viewState.watchers.map(id => {
      const watcher = getWatchers().find(w => w.id === id);
      if (!watcher) return null;
      // Format as 'FirstName L.' if lastName exists, otherwise just 'FirstName'
      if (watcher.lastName && watcher.lastName.trim()) {
        return `${watcher.firstName} ${watcher.lastName.charAt(0)}.`;
      }
      return watcher.firstName;
    }).filter(Boolean);
    
    if (watcherNames.length === 0) {
      watcherSelectedDisplay.textContent = 'All Watchers';
      watcherSelectedDisplay.removeAttribute('title');
    } else {
      watcherSelectedDisplay.textContent = watcherNames.join(', ');
      if (watcherNames.length > 2) {
        watcherSelectedDisplay.setAttribute('title', watcherNames.join(', '));
      } else {
        watcherSelectedDisplay.removeAttribute('title');
      }
    }
  }

  // Event delegation for list actions
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.movie-item');
    if (!item) return;
    const id = item.dataset.id;
    // Movie actions can be added here if needed
  });

  // Watcher modal events
  qs('.modal-close').addEventListener('click', hideWatcherModal);
  
  qs('#watcherModal').addEventListener('click', (e) => {
    if (e.target.id === 'watcherModal') hideWatcherModal();
  });

  const watcherForm = qs('#watcherForm');
  watcherForm.addEventListener('submit', onSubmitWatcherForm);
  watcherForm.addEventListener('reset', () => setTimeout(() => showErrors({}), 0));
  qs('#cancelWatcherEditBtn').addEventListener('click', () => { resetWatcherForm(); showErrors({}); });

  // Event delegation for watcher list actions
  qs('#watcherList').addEventListener('click', (e) => {
    const item = e.target.closest('.watcher-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.matches('.edit-watcher-btn')) {
      const watcher = getWatchers().find(w => w.id === id);
      if (watcher) fillWatcherForm(watcher);
    } else if (e.target.matches('.delete-watcher-btn')) {
      // Check if watcher is assigned to any movies
      const moviesWithWatcher = getMovies().filter(m => 
        m.watcherIds && m.watcherIds.includes(id)
      );
      if (moviesWithWatcher.length > 0) {
        const watcherName = getWatcherFullName(getWatchers().find(w => w.id === id));
        if (!confirm(`${watcherName} is assigned to ${moviesWithWatcher.length} movie(s). Delete anyway? (Will be removed from movies)`)) {
          return;
        }
        // Remove watcher from movies
        moviesWithWatcher.forEach(movie => {
          const updatedWatcherIds = movie.watcherIds.filter(wId => wId !== id);
          const updated = { ...movie, watcherIds: updatedWatcherIds };
          updateMovieInStore(movie.id, updated);
        });
      } else {
        if (!confirm('Delete this watcher?')) return;
      }
      deleteWatcher(id);
      renderWatcherList();
      renderMovieList(viewState);
    }
  });
}

function onSubmitForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const fields = Object.fromEntries(formData.entries());
  
  // Get selected genres from dropdown
  fields.genres = genreDropdown.getSelectedGenres();
  
  const errors = validateMovieFields(fields);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const movie = createMovie(fields);
  addMovie(movie);
  resetForm();
  // Reset genre dropdown
  genreDropdown.setSelectedGenres([]);
  populateGenreFilter();
  populateWatcherFilter();
  renderMovieList(viewState);
  qs('#title').focus();
}

function onSubmitWatcherForm(e) {
  e.preventDefault();
  const form = e.target;
  const fields = Object.fromEntries(new FormData(form).entries());
  const errors = validateWatcherFields(fields);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const id = fields.watcherEditId;
  const isEdit = !!id;
  if (isEdit) {
    const existing = getWatchers().find(w => w.id === id);
    if (!existing) return;
    const updated = mergeWatcher(existing, fields);
    updateWatcherInStore(id, updated);
  } else {
    const watcher = createWatcher(fields);
    addWatcher(watcher);
  }
  resetWatcherForm();
  renderWatcherList();
  populateWatcherFilter();
  renderMovieList(viewState); // Refresh in case watcher names are shown
  qs('#watcherFirstName').focus();
}

// Kickoff after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
