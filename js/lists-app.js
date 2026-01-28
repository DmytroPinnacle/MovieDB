import { getLists, addList, updateList, deleteList, loadLists } from './list-storage.js';
import { getMovies, loadMovies } from './storage.js';
import { getWatchers, loadWatchers } from './watcher-storage.js';
import { getSessions, loadSessions } from './session-storage.js';
import { createList } from './list-models.js';
import { qs, populateGenreFilter, populateWatcherFilter } from './ui.js';

const viewState = {
  movieFilter: '',
  genres: [],
  watchers: []
};

async function init() {
  try {
    await Promise.all([
      loadMovies(),
      loadWatchers(),
      loadSessions(),
      loadLists()
    ]);

    populateGenreFilter();
    populateWatcherFilter();
    renderLists();
    wireEvents();
  } catch (err) {
    console.error("Initialization failed", err);
  }
}

function renderLists() {
  const grid = qs('#listsGrid');
  const emptyState = qs('#emptyState');
  const tpl = qs('#listCardTemplate');
  let lists = getLists();
  const allMovies = getMovies();

  grid.innerHTML = '';

  // Filter based on viewState
  if (viewState.movieFilter && viewState.movieFilter.length >= 2) {
      lists = lists.filter(list => {
          if (!list.movieIds || list.movieIds.length === 0) return false;
          
          const term = viewState.movieFilter.toLowerCase();
          // Check if any movie in the list matches
          return list.movieIds.some(mid => {
              const m = allMovies.find(mov => mov.id === mid);
              return m && m.title.toLowerCase().includes(term);
          });
      });
  }

  // Filter by Genres (OR logic)
  if (viewState.genres.length > 0) {
    lists = lists.filter(list => {
        if (!list.movieIds || list.movieIds.length === 0) return false;
        return list.movieIds.some(mid => {
            const m = allMovies.find(mov => mov.id === mid);
            if (!m) return false;
            const movieGenres = Array.isArray(m.genres) ? m.genres : (m.genre ? [m.genre] : []);
            return viewState.genres.some(selected => 
                movieGenres.some(mg => mg.toLowerCase() === selected.toLowerCase())
            );
        });
    });
  }

  // Filter by Watchers (OR logic: list must contain at least one movie watched by one of the selected watchers)
  if (viewState.watchers.length > 0) {
    // Optimization: Get map of Watched Movies for selected watchers first?
    // For now, iterate directly
    lists = lists.filter(list => {
        if (!list.movieIds || list.movieIds.length === 0) return false;
        
        // Find if ANY movie in the list has been watched by ANY selected watcher
        return list.movieIds.some(movieId => {
           // We need to know if movieId was watched by any watcher in viewState.watchers
           // We can ask session repository or check movie sessions
           const sessions = getSessions(); 
           // Filter sessions for this movie
           const movieSessions = sessions.filter(s => s.movieId === movieId);
           
           return movieSessions.some(session => {
               return session.watcherIds.some(wid => viewState.watchers.includes(wid));
           });
        });
    });
  }

  if (lists.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } 
  
  emptyState.classList.add('hidden');

  lists.forEach(list => {
    // Clone template
    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector('.list-card');
    card.dataset.id = list.id;
    
    // Fill data
    const nameEl = card.querySelector('.list-name');
    nameEl.textContent = list.name;
    // Make name clickable to go to detail
    nameEl.style.cursor = 'pointer';
    nameEl.addEventListener('click', () => {
        window.location.href = `list-detail.html?id=${list.id}`;
    });

    const metaEl = card.querySelector('.list-meta');
    const count = list.movieIds ? list.movieIds.length : 0;
    metaEl.textContent = `${count} movie${count !== 1 ? 's' : ''}`;
    
    const previewEl = card.querySelector('.list-movies-preview');
    // Simple preview text from description or maybe list items names if we wanted
    previewEl.textContent = list.description || '';

    // Actions
    const menuBtn = card.querySelector('.list-menu-btn');
    const menu = card.querySelector('.list-context-menu');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other menus first
      document.querySelectorAll('.list-context-menu').forEach(el => {
        if (el !== menu) el.classList.add('hidden');
      });
      menu.classList.toggle('hidden');
    });

    const renameBtn = card.querySelector('.rename-list-btn');
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.add('hidden');
      openModal(list);
    });
    
    const deleteBtn = card.querySelector('.delete-list-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.add('hidden');
      deleteListAction(list.id);
    });
    
    grid.appendChild(card);
  });
}

// Modal Helpers
function openModal(list = null) {
  // Use try-catch in case elements are missing in HTML
  try {
      const modal = qs('#createListModal');
      const form = qs('#createListForm');
      const title = qs('#modalTitle');
      const btn = qs('#saveListBtn');
      
      form.reset();
      
      if (list) {
        title.textContent = 'Rename List';
        const idInput = form.querySelector('[name="listEditId"]');
        if (idInput) idInput.value = list.id;
        
        const nameInput = form.querySelector('[name="name"]');
        if (nameInput) nameInput.value = list.name;

        btn.textContent = 'Save Changes';
      } else {
        title.textContent = 'Create New List';
        const idInput = form.querySelector('[name="listEditId"]');
        if (idInput) idInput.value = '';
        btn.textContent = 'Create List';
      }
      
      modal.classList.remove('hidden');
  } catch (e) {
      console.error("Error opening modal", e);
  }
}

function closeModal() {
  const modal = qs('#createListModal');
  if (modal) modal.classList.add('hidden');
  const form = qs('#createListForm');
  if (form) form.reset();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  const id = formData.get('listEditId');
  const name = formData.get('name');
  
  // Disable button to prevent double submit
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (id) {
        // Edit
        const existing = getLists().find(l => l.id === id);
        if (existing) {
            const updated = { ...existing, name: name, updatedAt: Date.now() };
            await updateList(id, updated);
        }
    } else {
        // Create
        const newList = createList({ name: name });
        await addList(newList);
    }
    
    closeModal();
    renderLists();
  } catch(error) {
    console.error("Error saving list:", error);
    alert("Failed to save list.");
  } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
  }
}

async function deleteListAction(id) {
  if (confirm('Delete this list? This cannot be undone.')) {
    await deleteList(id);
    renderLists();
  }
}

function updateGenreDisplay() {
  const container = qs('#filterGenre');
  if (!container) return;
  const display = container.querySelector('.multiselect-selected');
  
  if (viewState.genres.length === 0) {
    display.textContent = 'All Genres';
    display.classList.remove('has-selection');
  } else {
    display.textContent = `${viewState.genres.length} selected`;
    display.classList.add('has-selection');
  }
}

function updateWatcherDisplay() {
  const container = qs('#filterWatcher');
  if (!container) return;
  const display = container.querySelector('.multiselect-selected');
  
  if (viewState.watchers.length === 0) {
    display.textContent = 'All Watchers';
    display.classList.remove('has-selection');
  } else {
    display.textContent = `${viewState.watchers.length} selected`;
    display.classList.add('has-selection');
  }
}

function wireEvents() {
    try {
      const searchInput = document.querySelector('#searchMovie');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            viewState.movieFilter = e.target.value.trim();
            renderLists();
        });
      }

      // Genre Filter Events
      const genreMultiselect = qs('#filterGenre');
      if (genreMultiselect) {
          const selectedDisplay = genreMultiselect.querySelector('.multiselect-selected');
          const dropdown = genreMultiselect.querySelector('.multiselect-dropdown');
          
          if (selectedDisplay && dropdown) {
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
                  renderLists();
                }
              });
              
              document.addEventListener('click', (e) => {
                if (!genreMultiselect.contains(e.target)) {
                  dropdown.classList.add('hidden');
                }
              });
          }
      }

      // Watcher Filter Events
      const watcherMultiselect = qs('#filterWatcher');
      if (watcherMultiselect) {
          const selectedDisplay = watcherMultiselect.querySelector('.multiselect-selected');
          const dropdown = watcherMultiselect.querySelector('.multiselect-dropdown');
          
          if (selectedDisplay && dropdown) {
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
                  const watcherId = e.target.dataset.watcherId; // Assumes populateWatcherFilter uses data-watcher-id
                  if (viewState.watchers.includes(watcherId)) {
                    viewState.watchers = viewState.watchers.filter(w => w !== watcherId);
                    e.target.classList.remove('selected');
                  } else {
                    viewState.watchers.push(watcherId);
                    e.target.classList.add('selected');
                  }
                  updateWatcherDisplay();
                  renderLists();
                }
              });
              
              document.addEventListener('click', (e) => {
                if (!watcherMultiselect.contains(e.target)) {
                  dropdown.classList.add('hidden');
                }
              });
          }
      }

      const addBtn = document.querySelector('#addListBtn');
      if (addBtn) addBtn.addEventListener('click', () => openModal(null));
      
      const closeBtn = document.querySelector('.modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      
      const form = document.querySelector('#createListForm');
      if (form) form.addEventListener('submit', handleFormSubmit);
    } catch(e) {
        console.error("Error wiring events", e);
    }
  
  // Close menu on click outside
  document.addEventListener('click', (e) => {
    // Close context menus
    if (!e.target.closest('.list-menu-btn') && !e.target.closest('.list-context-menu')) {
       document.querySelectorAll('.list-context-menu').forEach(el => el.classList.add('hidden'));
    }
    
    // Close modal on click outside (backdrop)
    const modal = document.querySelector('#createListModal');
    if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        closeModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
