// App entrypoint: wiring events + orchestrating modules
import { createMovie, validateMovieFields, updateMovie as mergeMovie } from './models.js';
import { loadMovies, addMovie, updateMovieInStore, deleteMovie, getMovies } from './storage.js';
import { SEED_MOVIES } from './seed.js';
import { renderMovieList, populateGenreFilter, fillForm, resetForm, showErrors, qs } from './ui.js';

// State for filters/sort
const viewState = {
  filterText: '',
  genre: '',
  sort: 'title-asc'
};

function init() {
  const movies = loadMovies();
  if (!movies.length) {
    seedInitialData();
  }
  populateGenreFilter();
  renderMovieList(viewState);
  wireEvents();
}

function seedInitialData() {
  // Convert simple arrays into movie objects using createMovie
  SEED_MOVIES.forEach(([title, year, genre, rating, imdbId]) => {
    const movie = createMovie({ title, year, genre, rating, posterUrl:'', notes:'', imdbId: imdbId || '' });
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
    if (e.target.matches('.edit-btn')) {
      const movie = getMovies().find(m => m.id === id);
      if (movie) fillForm(movie);
    } else if (e.target.matches('.delete-btn')) {
      if (confirm('Delete this movie?')) {
        deleteMovie(id);
        renderMovieList(viewState);
        populateGenreFilter();
        qs('#addMovieBtn').focus();
      }
    }
  });
}

function onSubmitForm(e) {
  e.preventDefault();
  const form = e.target;
  const fields = Object.fromEntries(new FormData(form).entries());
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

// Kickoff after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
