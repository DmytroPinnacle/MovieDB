// App entrypoint: wiring events + orchestrating modules
import { createMovie, validateMovieFields, updateMovie as mergeMovie } from './models.js';
import { loadMovies, addMovie, updateMovieInStore, deleteMovie, getMovies } from './storage.js';
import { loadWatchers, addWatcher, updateWatcherInStore, deleteWatcher, getWatchers } from './watcher-storage.js';
import { createWatcher, validateWatcherFields, updateWatcher as mergeWatcher, getWatcherFullName } from './watcher-models.js';
import { SEED_MOVIES } from './DataSeed/seed.js';
import { SEED_WATCHERS } from './DataSeed/watcher-seed.js';
import { 
  renderMovieList, populateGenreFilter, populateWatcherCheckboxes, resetForm, showErrors, 
  renderWatcherList, fillWatcherForm, resetWatcherForm, showWatcherModal, hideWatcherModal,
  qs 
} from './ui.js';

// State for filters/sort
const viewState = {
  filterText: '',
  genre: '',
  sort: 'title-asc'
};

function init() {
  const watchers = loadWatchers();
  if (!watchers.length) {
    seedInitialWatchers();
  }
  const movies = loadMovies();
  if (!movies.length) {
    seedInitialData();
  }
  populateGenreFilter();
  populateWatcherCheckboxes([]);
  renderMovieList(viewState);
  wireEvents();
}

function seedInitialWatchers() {
  SEED_WATCHERS.forEach(([firstName, lastName]) => {
    const watcher = createWatcher({ firstName, lastName: lastName || '' });
    addWatcher(watcher);
  });
  console.info(`Seeded ${SEED_WATCHERS.length} watchers.`);
}

function seedInitialData() {
  // Convert simple arrays into movie objects using createMovie
  SEED_MOVIES.forEach(([title, year, genre, rating, imdbId, posterUrl]) => {
    const movie = createMovie({ 
      title, 
      year, 
      genre, 
      rating, 
      posterUrl: posterUrl || '', 
      notes: '', 
      imdbId: imdbId || '' 
    });
    addMovie(movie);
  });
  console.info(`Seeded ${SEED_MOVIES.length} movies.`);
}

function wireEvents() {
  const searchInput = qs('#searchInput');
  const genreSelect = qs('#filterGenre');
  const sortSelect = qs('#sortSelect');
  const form = qs('#movieForm');
  const list = qs('#movieList');

  searchInput.addEventListener('input', () => {
    viewState.filterText = searchInput.value;
    renderMovieList(viewState);
  });
  genreSelect.addEventListener('change', () => {
    viewState.genre = genreSelect.value;
    renderMovieList(viewState);
  });
  sortSelect.addEventListener('change', () => {
    viewState.sort = sortSelect.value;
    renderMovieList(viewState);
  });

  form.addEventListener('submit', onSubmitForm);
  form.addEventListener('reset', () => setTimeout(()=> showErrors({}), 0));
  qs('#cancelEditBtn').addEventListener('click', () => { resetForm(); showErrors({}); });
  qs('#addMovieBtn').addEventListener('click', () => { resetForm(); qs('#title').focus(); });

  // Event delegation for list actions
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.movie-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.matches('.delete-btn')) {
      if (confirm('Delete this movie?')) {
        deleteMovie(id);
        renderMovieList(viewState);
        populateGenreFilter();
        qs('#addMovieBtn').focus();
      }
    }
  });

  // Watcher modal events
  qs('#manageWatchersBtn').addEventListener('click', () => {
    renderWatcherList();
    showWatcherModal();
  });

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
      populateWatcherCheckboxes([]);
      renderMovieList(viewState);
    }
  });
}

function onSubmitForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const fields = Object.fromEntries(formData.entries());
  // Get all selected watcher IDs from checkboxes
  fields.watcherIds = formData.getAll('watcherIds');
  
  const errors = validateMovieFields(fields);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const id = fields.movieId;
  const isEdit = !!id;
  if (isEdit) {
    const existing = getMovies().find(m => m.id === id);
    if (!existing) return;
    const updated = mergeMovie(existing, fields);
    updateMovieInStore(id, updated);
  } else {
    const movie = createMovie(fields);
    addMovie(movie);
  }
  resetForm();
  populateGenreFilter();
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
  
  // Preserve currently selected watchers when refreshing checkboxes
  const currentlySelected = Array.from(document.querySelectorAll('#watcherCheckboxes input:checked'))
    .map(cb => cb.value);
  populateWatcherCheckboxes(currentlySelected);
  
  renderMovieList(viewState); // Refresh in case watcher names are shown
  qs('#watcherFirstName').focus();
}

// Kickoff after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
