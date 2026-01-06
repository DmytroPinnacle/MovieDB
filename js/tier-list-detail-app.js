import { tierListRepository, movieRepository, watcherRepository, directorRepository, sessionRepository } from './dal/index.js';
import { initializeSeedData } from './DataSeed/initializer.js';
import { validateTierListFields } from './tier-list-models.js';
import { GenreDropdown } from './genre-dropdown.js';
import { DirectorDropdown } from './director-dropdown.js';
import { WatcherDropdown } from './watcher-dropdown.js';

// State
let currentTierList = null;
let allMovies = [];
let filteredMovies = [];
let draggedMovieId = null;
let draggedFromSelected = false;
let draggedFromTier = null;

const viewState = {
  filterText: '',
  genres: [],
  watchers: [],
  directors: [],
  sort: 'title-asc'
};

// DOM Elements
const tierListTitle = document.getElementById('tierListTitle');
const participantSelect = document.getElementById('participantSelect');
const addParticipantBtn = document.getElementById('addParticipantBtn');
const tierListGrid = document.getElementById('tierListGrid');
const selectedMoviesGrid = document.getElementById('selectedMoviesGrid');
const selectedCount = document.getElementById('selectedCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const addFilteredBtn = document.getElementById('addFilteredBtn');
const addAllBtn = document.getElementById('addAllBtn');
const editTierListBtn = document.getElementById('editTierListBtn');
const deleteTierListBtn = document.getElementById('deleteTierListBtn');
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editForm = document.getElementById('editForm');
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const contextMenu = document.getElementById('contextMenu');

let genreFilterDropdown = null;
let watcherFilterDropdown = null;
let directorFilterDropdown = null;

// Initialize
function init() {
  // Ensure core data exists (movies, watchers, directors, sessions)
  initializeSeedData();

  // Ensure modals are closed on page load
  if (editModal) editModal.close();
  if (deleteModal) deleteModal.close();
  
  const urlParams = new URLSearchParams(window.location.search);
  const tierListId = urlParams.get('id');
  
  if (!tierListId) {
    alert('No tier list specified');
    window.location.href = 'tier-lists.html';
    return;
  }
  
  currentTierList = tierListRepository.getById(tierListId);
  
  if (!currentTierList) {
    alert('Tier list not found');
    window.location.href = 'tier-lists.html';
    return;
  }
  
  allMovies = movieRepository.getAll();
  
  initializeDropdowns();
  setupAutocomplete();
  renderPage();
  attachEventListeners();
  updateFilteredMovies();
}

function setupAutocomplete() {
  const autocompleteDropdown = document.getElementById('autocompleteDropdown');
  let selectedIndex = -1;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
      autocompleteDropdown.classList.add('hidden');
      return;
    }
    
    // Filter movies by title, limit to 10
    const matches = allMovies
      .filter(movie => movie.title.toLowerCase().includes(query))
      .slice(0, 10);
    
    if (matches.length === 0) {
      autocompleteDropdown.classList.add('hidden');
      return;
    }
    
    // Render autocomplete items
    autocompleteDropdown.innerHTML = matches
      .map((movie, index) => `
        <div class="autocomplete-item" data-index="${index}" data-title="${escapeHtml(movie.title)}">
          ${escapeHtml(movie.title)}
          <span class="movie-year">(${movie.year || 'N/A'})</span>
        </div>
      `)
      .join('');
    
    autocompleteDropdown.classList.remove('hidden');
    selectedIndex = -1;
    
    // Add click handlers
    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        searchInput.value = item.dataset.title;
        autocompleteDropdown.classList.add('hidden');
        viewState.filterText = item.dataset.title;
        updateFilteredMovies();
      });
    });
  });
  
  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    
    if (items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateAutocompleteSelection(items, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateAutocompleteSelection(items, selectedIndex);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      items[selectedIndex].click();
    } else if (e.key === 'Escape') {
      autocompleteDropdown.classList.add('hidden');
    }
  });
  
  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      autocompleteDropdown.classList.add('hidden');
    }
  });
}

function updateAutocompleteSelection(items, selectedIndex) {
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function populateAutocomplete() {
  // No longer needed - removed datalist approach
}

function initializeDropdowns() {
  console.log('Initializing dropdowns...');
  console.log('Watchers available:', watcherRepository.getAll().length);
  console.log('Directors available:', directorRepository.getAll().length);
  console.log('Movies available:', movieRepository.getAll().length);
  
  // Genre filter
  try {
    genreFilterDropdown = new GenreDropdown('filterGenre', {
      selectedGenres: [],
      placeholder: 'All Genres',
      mode: 'filter',
      onChange: (selectedGenres) => {
        viewState.genres = selectedGenres;
        updateFilteredMovies();
      }
    });
    console.log('Genre dropdown initialized');
  } catch (err) {
    console.error('Failed to initialize genre dropdown:', err);
  }
  
  // Watcher filter
  try {
    watcherFilterDropdown = new WatcherDropdown('filterWatcher', {
      placeholder: 'All Watchers',
      onChange: (selectedIds) => {
        viewState.watchers = selectedIds;
        updateFilteredMovies();
      }
    });
    console.log('Watcher dropdown initialized');
  } catch (err) {
    console.error('Failed to initialize watcher dropdown:', err);
  }
  
  // Director filter
  try {
    directorFilterDropdown = new DirectorDropdown('filterDirector', {
      placeholder: 'All Directors',
      onChange: (selectedIds) => {
        viewState.directors = selectedIds;
        updateFilteredMovies();
      }
    });
    console.log('Director dropdown initialized');
  } catch (err) {
    console.error('Failed to initialize director dropdown:', err);
  }
}

function attachEventListeners() {
  addParticipantBtn.addEventListener('click', handleAddParticipant);
  
  searchInput.addEventListener('input', () => {
    viewState.filterText = searchInput.value;
    updateFilteredMovies();
  });
  
  sortSelect.addEventListener('change', () => {
    viewState.sort = sortSelect.value;
    updateFilteredMovies();
  });
  
  addFilteredBtn.addEventListener('click', () => addMoviesToSelected(filteredMovies));
  const clearSelectedBtn = document.getElementById('clearSelectedBtn');
  if (clearSelectedBtn) {
    clearSelectedBtn.addEventListener('click', handleClearSelected);
  }
  
  editTierListBtn.addEventListener('click', openEditModal);
  deleteTierListBtn.addEventListener('click', () => deleteModal.showModal());
  
  closeEditModalBtn.addEventListener('click', () => editModal.close());
  cancelEditBtn.addEventListener('click', () => editModal.close());
  editForm.addEventListener('submit', handleEditSave);
  
  closeDeleteModalBtn.addEventListener('click', () => deleteModal.close());
  cancelDeleteBtn.addEventListener('click', () => deleteModal.close());
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
  // Context menu
  document.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
  });
  
  contextMenu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action) {
      handleContextMenuAction(action);
    }
  });
  
  // Close context menu on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      contextMenu.classList.add('hidden');
    }
  });
}

function renderPage() {
  tierListTitle.textContent = currentTierList.name;
  renderParticipantSelect();
  renderTierListGrid();
  renderSelectedMovies();
}

function renderParticipantSelect() {
  const allWatchers = watcherRepository.getAll();
  const availableWatchers = allWatchers.filter(w => 
    !currentTierList.participantIds.includes(w.id)
  );
  
  participantSelect.innerHTML = '<option value="">-- Select Watcher --</option>' +
    availableWatchers.map(w => 
      `<option value="${w.id}">${escapeHtml(getWatcherFullName(w))}</option>`
    ).join('');
}

function handleAddParticipant() {
  const watcherId = participantSelect.value;
  if (!watcherId) {
    alert('Please select a watcher');
    return;
  }
  
  // Collect all movies currently in any tier
  const moviesInTiers = new Set();
  for (const participantId of currentTierList.participantIds) {
    const watcherTiers = currentTierList.tiers[participantId] || {};
    for (const tierName in watcherTiers) {
      for (const movieId of watcherTiers[tierName]) {
        moviesInTiers.add(movieId);
      }
    }
  }
  
  // Add participant
  tierListRepository.addParticipant(currentTierList.id, watcherId);
  currentTierList = tierListRepository.getById(currentTierList.id);
  
  // Add movies from tiers back to the pool so new participant can select them
  if (moviesInTiers.size > 0) {
    tierListRepository.addMoviesToSelected(currentTierList.id, Array.from(moviesInTiers));
    currentTierList = tierListRepository.getById(currentTierList.id);
  }
  
  renderParticipantSelect();
  renderTierListGrid();
  renderSelectedMovies();
}

function renderTierListGrid() {
  if (currentTierList.participantIds.length === 0) {
    tierListGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <p>No participants yet. Add watchers to start ranking movies.</p>
      </div>
    `;
    return;
  }
  
  const tiers = ['S', 'A', 'B', 'C', 'D'];
  
  let html = '<table class="tier-grid-table"><thead><tr>';
  html += '<th class="tier-header">Tier</th>';
  
  for (const watcherId of currentTierList.participantIds) {
    const watcher = watcherRepository.getById(watcherId);
    if (watcher) {
      html += `<th class="tier-cell-header">
        <div class="participant-header-content">
          ${escapeHtml(getWatcherFullName(watcher))}
          <button class="participant-menu-btn" aria-label="Participant options">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          <div class="participant-context-menu hidden">
            <button class="remove-participant-btn" data-watcher-id="${watcherId}">🗑️ Remove</button>
          </div>
        </div>
      </th>`;
    }
  }
  
  html += '</tr></thead><tbody>';
  
  for (const tier of tiers) {
    html += `<tr><td class="tier-header tier-${tier}">${tier}</td>`;
    
    for (const watcherId of currentTierList.participantIds) {
      const movieIds = currentTierList.tiers[watcherId]?.[tier] || [];
      html += `<td class="tier-cell" data-watcher-id="${watcherId}" data-tier="${tier}">`;
      html += '<div class="tier-cell-content">';
      
      for (const movieId of movieIds) {
        const movie = movieRepository.getById(movieId);
        if (movie) {
          html += `<img 
            src="${movie.posterUrl || ''}" 
            alt="${escapeHtml(movie.title)}"
            class="tier-movie-poster"
            draggable="true"
            data-movie-id="${movieId}"
            data-watcher-id="${watcherId}"
            data-tier="${tier}"
            title="${escapeHtml(movie.title)}"
          />`;
        }
      }
      
      html += '</div></td>';
    }
    
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  
  tierListGrid.innerHTML = html;
  
  // Attach drag and drop events and error handlers
  attachImageErrorHandlers();
  attachTierDragEvents();
  
  // Attach participant menu events
  tierListGrid.querySelectorAll('.participant-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close all other open menus first
      document.querySelectorAll('.participant-context-menu').forEach(menu => {
        if (menu !== btn.nextElementSibling) {
          menu.classList.add('hidden');
        }
      });
      
      // Toggle current menu
      const menu = btn.nextElementSibling;
      menu.classList.toggle('hidden');
    });
  });

  // Close menus when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.participant-header-content')) {
      document.querySelectorAll('.participant-context-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });

  // Remove participant buttons
  tierListGrid.querySelectorAll('.remove-participant-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const watcherId = btn.dataset.watcherId;
      if (confirm('Remove this participant from the tier list?')) {
        tierListRepository.removeParticipant(currentTierList.id, watcherId);
        currentTierList = tierListRepository.getById(currentTierList.id);
        renderParticipantSelect();
        renderTierListGrid();
        renderSelectedMovies();
      }
    });
  });
}

function attachImageErrorHandlers() {
  // Handle image load errors by hiding image content but keeping alt text visible
  document.querySelectorAll('.tier-movie-poster, .selected-movie-poster').forEach(img => {
    img.addEventListener('error', (e) => {
      // Remove src so alt text displays in styled container
      e.target.removeAttribute('src');
    });
  });
}

function attachTierDragEvents() {
  // Draggable posters in tiers
  tierListGrid.querySelectorAll('.tier-movie-poster').forEach(poster => {
    poster.addEventListener('dragstart', handleTierPosterDragStart);
    poster.addEventListener('dragend', handleDragEnd);
    poster.addEventListener('contextmenu', handlePosterContextMenu);
  });
  
  // Drop zones (tier cells)
  tierListGrid.querySelectorAll('.tier-cell').forEach(cell => {
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleTierDrop);
  });
}

function renderSelectedMovies() {
  const movieIds = currentTierList.selectedMovieIds;
  selectedCount.textContent = movieIds.length;
  
  if (movieIds.length === 0) {
    selectedMoviesGrid.innerHTML = `
      <div class="empty-state" style="width: 100%;">
        <p style="font-size: 0.9rem;">No movies selected. Use filters above to add movies.</p>
      </div>
    `;
    return;
  }
  
  selectedMoviesGrid.innerHTML = movieIds.map(movieId => {
    const movie = movieRepository.getById(movieId);
    if (!movie) return '';
    
    return `
      <div class="selected-movie-item" data-movie-id="${movieId}">
        <img 
          src="${movie.posterUrl || ''}"
          alt="${escapeHtml(movie.title)}"
          class="selected-movie-poster"
          draggable="true"
          data-movie-id="${movieId}"
          title="${escapeHtml(movie.title)}"
        />
      </div>
    `;
  }).join('');
  
  // Attach drag events for selected movies and error handlers
  attachImageErrorHandlers();
  selectedMoviesGrid.querySelectorAll('.selected-movie-poster').forEach(poster => {
    poster.addEventListener('dragstart', handleSelectedPosterDragStart);
    poster.addEventListener('dragend', handleDragEnd);
    poster.addEventListener('contextmenu', handleSelectedPosterContextMenu);
  });
}

function handleSelectedPosterDragStart(e) {
  draggedMovieId = e.target.dataset.movieId;
  draggedFromSelected = true;
  draggedFromTier = null;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleTierPosterDragStart(e) {
  draggedMovieId = e.target.dataset.movieId;
  draggedFromSelected = false;
  draggedFromTier = {
    watcherId: e.target.dataset.watcherId,
    tier: e.target.dataset.tier
  };
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.tier-cell').forEach(cell => {
    cell.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
  e.dataTransfer.dropEffect = 'move';
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleTierDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const watcherId = e.currentTarget.dataset.watcherId;
  const tier = e.currentTarget.dataset.tier;
  
  if (!draggedMovieId || !watcherId || !tier) return;
  
  // Only allow drops from selected movies, not from other participants' tiers
  if (draggedFromTier) {
    // Movie is being dragged from a tier
    if (draggedFromTier.watcherId !== watcherId) {
      // Trying to move to a different participant's tier - not allowed
      draggedMovieId = null;
      draggedFromSelected = false;
      draggedFromTier = null;
      return;
    }
    
    // Check if it's the same tier for the same watcher
    if (draggedFromTier.tier === tier) {
      // Same tier, don't allow the "move"
      draggedMovieId = null;
      draggedFromSelected = false;
      draggedFromTier = null;
      return;
    }
  } else if (draggedFromSelected) {
    // If dragging from selected movies, check if movie is already in ANY tier for this watcher
    const watcherTiers = currentTierList.tiers[watcherId] || {};
    for (const tierName in watcherTiers) {
      if (watcherTiers[tierName].includes(draggedMovieId)) {
        // Movie already exists in a tier for this watcher, don't add it again
        draggedMovieId = null;
        draggedFromSelected = false;
        draggedFromTier = null;
        return;
      }
    }
  }
  
  // Remove from old location if dragged from tier
  if (draggedFromTier) {
    tierListRepository.removeMovieFromTier(
      currentTierList.id,
      draggedFromTier.watcherId,
      draggedFromTier.tier,
      draggedMovieId
    );
  }
  
  // Add to new tier
  tierListRepository.addMovieToTier(currentTierList.id, watcherId, tier, draggedMovieId);
  
  currentTierList = tierListRepository.getById(currentTierList.id);
  renderTierListGrid();
  renderSelectedMovies();
  
  draggedMovieId = null;
  draggedFromSelected = false;
  draggedFromTier = null;
}

function updateFilteredMovies() {
  filteredMovies = allMovies.filter(movie => {
    // Text filter
    if (viewState.filterText) {
      const searchLower = viewState.filterText.toLowerCase();
      if (!movie.title.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Genre filter
    if (viewState.genres.length > 0) {
      if (!movie.genres || !movie.genres.some(g => viewState.genres.includes(g))) {
        return false;
      }
    }
    
    // Watcher filter - check if any selected watcher has watched this movie
    if (viewState.watchers.length > 0) {
      const sessions = sessionRepository.getByMovieId(movie.id);
      const movieWatcherIds = new Set();
      sessions.forEach(session => {
        if (session.watcherIds && Array.isArray(session.watcherIds)) {
          session.watcherIds.forEach(wid => movieWatcherIds.add(wid));
        }
      });
      if (!viewState.watchers.some(wid => movieWatcherIds.has(wid))) {
        return false;
      }
    }
    
    // Director filter
    if (viewState.directors.length > 0) {
      if (!movie.directorIds || !movie.directorIds.some(did => viewState.directors.includes(did))) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort
  sortMovies(filteredMovies, viewState.sort);
}

function sortMovies(movies, sortBy) {
  movies.sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'year-asc':
        return (a.year || 0) - (b.year || 0);
      case 'year-desc':
        return (b.year || 0) - (a.year || 0);
      case 'rating-asc':
        return (a.rating || 0) - (b.rating || 0);
      case 'rating-desc':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });
}

function addMoviesToSelected(movies) {
  // Filter out movies that are already in the selected list or in any tier
  const moviesToAdd = movies.filter(movie => {
    // Check if already in selected movies
    if (currentTierList.selectedMovieIds.includes(movie.id)) {
      return false;
    }
    
    // Check if already in any tier for any participant
    for (const watcherId of currentTierList.participantIds) {
      const watcherTiers = currentTierList.tiers[watcherId] || {};
      for (const tierName in watcherTiers) {
        if (watcherTiers[tierName].includes(movie.id)) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  const movieIds = moviesToAdd.map(m => m.id);
  if (movieIds.length > 0) {
    tierListRepository.addMoviesToSelected(currentTierList.id, movieIds);
    currentTierList = tierListRepository.getById(currentTierList.id);
    renderSelectedMovies();
  }
}

function handleClearSelected() {
  // Clear all selected movies (does not affect movies already placed in tiers)
  tierListRepository.update(currentTierList.id, {
    ...currentTierList,
    selectedMovieIds: [],
    updatedAt: Date.now()
  });
  currentTierList = tierListRepository.getById(currentTierList.id);
  renderSelectedMovies();
}

function openEditModal() {
  document.getElementById('editName').value = currentTierList.name;
  editModal.showModal();
}

function handleEditSave(e) {
  e.preventDefault();
  
  const formData = new FormData(editForm);
  const data = { name: formData.get('name') };
  
  const errors = validateTierListFields(data);
  if (Object.keys(errors).length > 0) {
    // Show errors
    for (const [field, message] of Object.entries(errors)) {
      const errorEl = document.querySelector(`[data-error-for="${field}"]`);
      if (errorEl) errorEl.textContent = message;
    }
    return;
  }
  
  tierListRepository.update(currentTierList.id, { 
    ...currentTierList, 
    name: data.name.trim(), 
    updatedAt: Date.now() 
  });
  
  currentTierList = tierListRepository.getById(currentTierList.id);
  tierListTitle.textContent = currentTierList.name;
  editModal.close();
}

function handleDelete() {
  tierListRepository.delete(currentTierList.id);
  window.location.href = 'tier-lists.html';
}

function handlePosterContextMenu(e) {
  e.preventDefault();
  const movieId = e.target.dataset.movieId;
  showContextMenu(e.clientX, e.clientY, movieId, false);
}

function handleSelectedPosterContextMenu(e) {
  e.preventDefault();
  const movieId = e.target.dataset.movieId;
  showContextMenu(e.clientX, e.clientY, movieId, true);
}

let contextMenuMovieId = null;
let contextMenuFromSelected = false;

function showContextMenu(x, y, movieId, fromSelected) {
  contextMenuMovieId = movieId;
  contextMenuFromSelected = fromSelected;
  
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.remove('hidden');
  
  // Show/hide appropriate options
  const removeSelectedOption = contextMenu.querySelector('[data-action="remove-selected"]');
  const removeAllTiersOption = contextMenu.querySelector('[data-action="remove-all-tiers"]');
  
  if (fromSelected) {
    removeSelectedOption.style.display = 'block';
    removeAllTiersOption.style.display = 'none';
  } else {
    removeSelectedOption.style.display = 'none';
    removeAllTiersOption.style.display = 'block';
  }
}

function handleContextMenuAction(action) {
  if (!contextMenuMovieId) return;
  
  if (action === 'remove-selected') {
    tierListRepository.removeMovieFromSelected(currentTierList.id, contextMenuMovieId);
    currentTierList = tierListRepository.getById(currentTierList.id);
    renderSelectedMovies();
  } else if (action === 'remove-all-tiers') {
    // Remove from all tiers
    for (const watcherId of currentTierList.participantIds) {
      for (const tier of ['S', 'A', 'B', 'C', 'D']) {
        tierListRepository.removeMovieFromTier(
          currentTierList.id, 
          watcherId, 
          tier, 
          contextMenuMovieId
        );
      }
    }
    currentTierList = tierListRepository.getById(currentTierList.id);
    renderTierListGrid();
    renderSelectedMovies();
  }
  
  contextMenu.classList.add('hidden');
  contextMenuMovieId = null;
}

function getWatcherFullName(watcher) {
  if (!watcher) return '';
  const parts = [watcher.firstName];
  if (watcher.lastName) parts.push(watcher.lastName);
  return parts.join(' ');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start app
init();
