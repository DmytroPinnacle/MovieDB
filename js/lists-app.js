import { getLists, addList, updateList, deleteList } from './list-storage.js';
import { getMovies, loadMovies } from './storage.js';
import { getWatchers, loadWatchers, getWatcherById } from './watcher-storage.js';
import { loadSessions, getLatestSessionByMovieId } from './session-storage.js';
import { createList } from './list-models.js';
import { qs, populateGenreFilter, populateWatcherFilter } from './ui.js';

const viewState = {
  movieFilter: '',
  genres: [],
  watchers: []
};

function init() {
  loadMovies();
  loadWatchers();
  loadSessions();

  populateGenreFilter();
  populateWatcherFilter();
  renderLists();
  wireEvents();
}

function renderLists() {
  const grid = qs('#listsGrid');
  const emptyState = qs('#emptyState');
  const tpl = qs('#listCardTemplate');
  const lists = getLists();
  const movies = getMovies();

  // Filter lists
  const filteredLists = lists.filter(list => {
    const listMovies = movies.filter(m => list.movieIds.includes(m.id));
    
    // 1. Filter by movie name
    if (viewState.movieFilter) {
      const match = listMovies.some(m => m.title.toLowerCase().includes(viewState.movieFilter.toLowerCase()));
      if (!match) return false;
    }

    // 2. Filter by genres (AND logic for genres - list must contain movies that cover ALL selected genres? 
    // Or list must contain at least one movie with one of the genres? 
    // User asked: "filter the lists ... by genres (if present in a list)"
    // Usually "filter by genres" means "show items that have these genres". 
    // For a list, it probably means "Show lists that contain movies of these genres".
    // Let's assume OR logic for genres within the list (if list has a movie with Genre A, it matches Genre A filter).
    // But if multiple genres selected in filter, usually it's AND or OR. 
    // In main page it is AND. Let's stick to AND: List must contain movies that satisfy the genre requirement.
    // Actually, "filter the lists ... by genres (if present in a list)" implies if I select "Horror", show lists that have at least one Horror movie.
    // If I select "Horror" and "Comedy", show lists that have at least one Horror AND at least one Comedy? Or just one movie that is both?
    // Let's go with: If I select genres G1, G2... The list must have at least one movie with G1 AND at least one movie with G2 (can be different movies).
    if (viewState.genres.length > 0) {
      const hasAllGenres = viewState.genres.every(g => 
        listMovies.some(m => {
           const mGenres = Array.isArray(m.genres) ? m.genres : (m.genre ? [m.genre] : []);
           return mGenres.some(mg => mg.toLowerCase() === g.toLowerCase());
        })
      );
      if (!hasAllGenres) return false;
    }

    // 3. Filter by watchers
    if (viewState.watchers.length > 0) {
      const hasAllWatchers = viewState.watchers.every(wId => 
        listMovies.some(m => {
          const latestSession = getLatestSessionByMovieId(m.id);
          const mWatchers = latestSession ? latestSession.watcherIds : (m.watcherIds || []);
          return mWatchers.includes(wId);
        })
      );
      if (!hasAllWatchers) return false;
    }

    return true;
  });

  grid.innerHTML = '';
  if (filteredLists.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filteredLists.forEach(list => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = list.id;
    
    const nameEl = node.querySelector('.list-name');
    nameEl.innerHTML = '';
    const link = document.createElement('a');
    link.href = `list-detail.html?id=${list.id}`;
    link.textContent = list.name;
    link.style.color = 'inherit';
    link.style.textDecoration = 'none';
    link.addEventListener('mouseenter', () => link.style.textDecoration = 'underline');
    link.addEventListener('mouseleave', () => link.style.textDecoration = 'none');
    nameEl.appendChild(link);
    
    const listMovies = movies.filter(m => list.movieIds.includes(m.id));
    node.querySelector('.list-meta').textContent = `${listMovies.length} movies`;
    
    const previewText = listMovies.map(m => m.title).join(', ');
    node.querySelector('.list-movies-preview').textContent = previewText || 'No movies yet';

    // Context menu handling
    const menuBtn = node.querySelector('.list-menu-btn');
    const contextMenu = node.querySelector('.list-context-menu');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other open menus
      document.querySelectorAll('.list-context-menu').forEach(el => {
        if (el !== contextMenu) el.classList.add('hidden');
      });
      contextMenu.classList.toggle('hidden');
    });

    node.querySelector('.rename-list-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      contextMenu.classList.add('hidden');
      openListModal(list);
    });

    node.querySelector('.delete-list-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      contextMenu.classList.add('hidden');
      if (confirm(`Are you sure you want to delete the list "${list.name}"?`)) {
        deleteList(list.id);
        renderLists();
      }
    });

    grid.appendChild(node);
  });
}

function openListModal(list = null) {
  const modal = qs('#createListModal');
  const form = qs('#createListForm');
  const title = qs('#modalTitle');
  const btn = qs('#saveListBtn');
  const nameInput = qs('#newListName');
  const idInput = qs('#listEditId');
  const error = qs('#listNameError');

  error.textContent = '';
  form.reset();

  if (list) {
    title.textContent = 'Rename List';
    btn.textContent = 'Save Changes';
    nameInput.value = list.name;
    idInput.value = list.id;
  } else {
    title.textContent = 'Create New List';
    btn.textContent = 'Create List';
    idInput.value = '';
  }

  modal.classList.remove('hidden');
  nameInput.focus();
}

function wireEvents() {
  // Close context menus on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.list-menu-btn') && !e.target.closest('.list-context-menu')) {
      document.querySelectorAll('.list-context-menu').forEach(el => el.classList.add('hidden'));
    }
  });

  // Search input
  qs('#searchMovie').addEventListener('input', (e) => {
    viewState.movieFilter = e.target.value.trim();
    renderLists();
  });

  // Genre Filter
  const genreMultiselect = qs('#filterGenre');
  const genreDisplay = genreMultiselect.querySelector('.multiselect-selected');
  const genreDropdown = genreMultiselect.querySelector('.multiselect-dropdown');

  genreDisplay.addEventListener('click', () => genreDropdown.classList.toggle('hidden'));
  
  genreDropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('multiselect-option')) {
      const genre = e.target.dataset.genre;
      if (viewState.genres.includes(genre)) {
        viewState.genres = viewState.genres.filter(g => g !== genre);
        e.target.classList.remove('selected');
      } else {
        viewState.genres.push(genre);
        e.target.classList.add('selected');
      }
      updateGenreDisplay(genreDisplay);
      renderLists();
    }
  });

  document.addEventListener('click', (e) => {
    if (!genreMultiselect.contains(e.target)) genreDropdown.classList.add('hidden');
  });

  // Watcher Filter
  const watcherMultiselect = qs('#filterWatcher');
  const watcherDisplay = watcherMultiselect.querySelector('.multiselect-selected');
  const watcherDropdown = watcherMultiselect.querySelector('.multiselect-dropdown');

  watcherDisplay.addEventListener('click', () => watcherDropdown.classList.toggle('hidden'));

  watcherDropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('multiselect-option')) {
      const wId = e.target.dataset.watcherId;
      if (viewState.watchers.includes(wId)) {
        viewState.watchers = viewState.watchers.filter(w => w !== wId);
        e.target.classList.remove('selected');
      } else {
        viewState.watchers.push(wId);
        e.target.classList.add('selected');
      }
      updateWatcherDisplay(watcherDisplay);
      renderLists();
    }
  });

  document.addEventListener('click', (e) => {
    if (!watcherMultiselect.contains(e.target)) watcherDropdown.classList.add('hidden');
  });

  // Add/Edit List Modal
  const modal = qs('#createListModal');
  const form = qs('#createListForm');
  
  qs('#addListBtn').addEventListener('click', () => {
    openListModal();
  });

  qs('.modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = qs('#newListName');
    const name = nameInput.value.trim();
    const id = qs('#listEditId').value;
    const error = qs('#listNameError');
    
    if (!name) {
      error.textContent = 'List name is required';
      return;
    }

    // Check for duplicates
    const lists = getLists();
    const duplicate = lists.find(l => l.name.toLowerCase() === name.toLowerCase() && l.id !== id);
    if (duplicate) {
      error.textContent = 'A list with this name already exists';
      return;
    }

    if (id) {
      // Update
      const list = lists.find(l => l.id === id);
      if (list) {
        list.name = name;
        list.updatedAt = Date.now();
        updateList(id, list);
      }
    } else {
      // Create
      addList(createList({ name }));
    }

    form.reset();
    modal.classList.add('hidden');
    renderLists();
  });
}

function updateGenreDisplay(el) {
  if (viewState.genres.length === 0) {
    el.textContent = 'All Genres';
  } else {
    el.textContent = viewState.genres.join(', ');
  }
}

function updateWatcherDisplay(el) {
  const names = viewState.watchers.map(id => {
    const w = getWatcherById(id);
    return w ? w.firstName : '';
  }).filter(Boolean);
  
  if (names.length === 0) {
    el.textContent = 'All Watchers';
  } else {
    el.textContent = names.join(', ');
  }
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
