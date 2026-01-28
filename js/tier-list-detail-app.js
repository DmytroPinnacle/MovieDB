
import { tierListRepository, watcherRepository, movieRepository, directorRepository } from './dal/index.js';
import { getWatcherFullName } from './watcher-models.js';
import { GenreDropdown } from './genre-dropdown.js';
import { WatcherDropdown } from './watcher-dropdown.js';
import { DirectorDropdown } from './director-dropdown.js';

// State
let tierList = null;
let currentTierListId = null;
let dragSource = null;
let contextMenuTarget = null;

// Dropdown instances
let genreDropdown = null;
let watcherDropdown = null;
let directorDropdown = null;

// DOM Elements
const tierListTitle = document.getElementById('tierListTitle');
const participantSelect = document.getElementById('participantSelect');
const addParticipantBtn = document.getElementById('addParticipantBtn');
const tierListGrid = document.getElementById('tierListGrid');
const selectedMoviesGrid = document.getElementById('selectedMoviesGrid');
const searchInput = document.getElementById('searchInput');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const sortSelect = document.getElementById('sortSelect');
const addFilteredBtn = document.getElementById('addFilteredBtn');
const clearSelectedBtn = document.getElementById('clearSelectedBtn');


// Init
async function init() {
  const params = new URLSearchParams(window.location.search);
  currentTierListId = params.get('id');

  if (!currentTierListId) {
    window.location.href = 'tier-lists.html';
    return;
  }
  
  await Promise.all([
      tierListRepository.load(),
      watcherRepository.load(),
      movieRepository.load(),
      directorRepository.load()
  ]);

  loadData();
  
  if (!tierList) {
    alert('Tier List not found');
    window.location.href = 'tier-lists.html';
    return;
  }

  initDropdowns();
  renderHeader();
  renderParticipantDropdown();
  renderBoard(); // Renders the tiers
  sortAndRenderMoviePool(); // Renders the selected movies pool
  
  attachEventListeners();
}

function loadData() {
  tierList = tierListRepository.getById(currentTierListId);
}

function initDropdowns() {
    // Genre
    genreDropdown = new GenreDropdown('filterGenre', {
        placeholder: 'Filter by Genre'
    });

    // Watcher (Filter)
    watcherDropdown = new WatcherDropdown('filterWatcher', {
        placeholder: 'Seen by Watcher...',
        onChange: (ids) => { /* Only needed if we auto-filter, but we use a button */ }
    });
    
    // Director
    directorDropdown = new DirectorDropdown('filterDirector', {
        placeholder: 'Filter by Director'
    });
}

function renderHeader() {
  tierListTitle.textContent = tierList.name;
}

function renderParticipantDropdown() {
  const allWatchers = watcherRepository.getAll();
  const existingIds = tierList.participantIds || [];
  
  // Clear and reset default option
  participantSelect.innerHTML = '<option value="">-- Select Watcher --</option>';
  
  allWatchers.forEach(w => {
    if (!existingIds.includes(w.id)) {
      const option = document.createElement('option');
      option.value = w.id;
      option.textContent = getWatcherFullName(w);
      participantSelect.appendChild(option);
    }
  });
}

function renderBoard() {
    tierListGrid.innerHTML = '';

    // If no participants, show message
    if (!tierList.participantIds || tierList.participantIds.length === 0) {
        tierListGrid.innerHTML = '<div class="no-data">Add a participant to start ranking.</div>';
        return;
    }

    // For this simple view, we'll render tiers for the FIRST participant or create a tabbed interface.
    // Given the HTML structure doesn't show tabs obviously, we might just be showing all?
    // Let's assume we show the first participant for now, or all participants as columns?
    // "tier-list-grid" suggests a grid.
    
    // Let's iterate over participants and show their boards.
    tierList.participantIds.forEach(participantId => {
        const participant = watcherRepository.getById(participantId);
        if (!participant) return;

        const participantSection = document.createElement('div');
        participantSection.className = 'participant-tiers-section';
        
        const header = document.createElement('h3');
        header.innerHTML = `
            <div class="participant-header-content">
                <span>${getWatcherFullName(participant)}</span>
                <button class="participant-menu-btn" data-action="toggle-menu" data-participant-id="${participantId}">
                    ⋮
                </button>
                <div class="participant-context-menu hidden" id="menu-${participantId}">
                    <button class="remove-participant-btn" data-action="remove-participant" data-participant-id="${participantId}">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
        participantSection.appendChild(header);
        
        const tiersContainer = document.createElement('div');
        tiersContainer.className = 'tiers-container';

        const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
        const watcherTiers = (tierList.tiers && tierList.tiers[participantId]) || { S:[], A:[], B:[], C:[], D:[], F:[] };

        tiers.forEach(tier => {
            const row = document.createElement('div');
            row.className = 'tier-row';
            
            const label = document.createElement('div');
            label.className = `tier-label tier-${tier}`;
            label.textContent = tier;
            
            const content = document.createElement('div');
            content.className = 'tier-content';
            content.dataset.tier = tier;
            content.dataset.participantId = participantId; // Important for drop

            // Content Items
            const movieIds = watcherTiers[tier] || [];
            movieIds.forEach(movieId => {
                const movie = movieRepository.getById(movieId);
                if (movie) {
                    content.appendChild(createMovieCard(movie));
                }
            });

            row.appendChild(label);
            row.appendChild(content);
            tiersContainer.appendChild(row);
        });

        participantSection.appendChild(tiersContainer);
        tierListGrid.appendChild(participantSection);
    });

    setupDragAndDrop();
}

function sortAndRenderMoviePool() {
    selectedMoviesGrid.innerHTML = '';
    
    // Get movies currently in selected pool
    let moviesToShow = [];
    if (tierList.selectedMovieIds && tierList.selectedMovieIds.length > 0) {
        moviesToShow = tierList.selectedMovieIds
            .map(id => movieRepository.getById(id))
            .filter(m => m);
    }
    
    // Filter out movies ranked by ALL participants
    const participants = tierList.participantIds || [];
    if (participants.length > 0) {
        moviesToShow = moviesToShow.filter(movie => {
            // Check if every participant has this movie in one of their tiers
            const isRankedByAll = participants.every(pId => {
                const pTiers = (tierList.tiers && tierList.tiers[pId]) || {};
                // Check all tier arrays (S, A, B, etc.)
                return Object.values(pTiers).some(tierArray => Array.isArray(tierArray) && tierArray.includes(movie.id));
            });
            return !isRankedByAll;
        });
    }

    // Apply Sort from sortSelect
    const sortValue = sortSelect.value;
    moviesToShow.sort((a, b) => {
        switch(sortValue) {
            case 'title-asc': return a.title.localeCompare(b.title);
            case 'title-desc': return b.title.localeCompare(a.title);
            case 'year-desc': return b.year - a.year;
            case 'year-asc': return a.year - b.year;
            case 'rating-desc': return (b.rating || 0) - (a.rating || 0);
            case 'rating-asc': return (a.rating || 0) - (b.rating || 0);
            default: return 0;
        }
    });

    document.getElementById('selectedCount').textContent = moviesToShow.length;

    moviesToShow.forEach(movie => {
        const card = createMovieCard(movie);
        card.classList.add('pool-item');
        selectedMoviesGrid.appendChild(card);
    });
    
    // Add "Empty state" only if pool is empty
    if(moviesToShow.length === 0) {
        selectedMoviesGrid.innerHTML = '<div class="empty-state">No movies selected. Use filters above to add movies.</div>';
    }

    setupDragAndDrop();
}


function createMovieCard(movie) {
  const div = document.createElement('div');
  div.className = 'tier-item';
  div.draggable = true;
  div.dataset.movieId = movie.id;
  div.title = movie.title;
  
  const img = document.createElement('img');
  const placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="%23334155"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%2394a3b8">No Image</text></svg>';
  
  img.src = movie.posterUrl && movie.posterUrl !== 'N/A' ? movie.posterUrl : placeholder;
  img.draggable = false;
  img.onerror = () => { img.src = placeholder; };
  
  div.appendChild(img);
  return div;
}

function attachEventListeners() {
    addParticipantBtn.addEventListener('click', handleAddParticipant);
    
    // Filter Actions
    addFilteredBtn.addEventListener('click', handleAddFilteredMovies);
    clearSelectedBtn.addEventListener('click', handleClearSelectedMovies);
    sortSelect.addEventListener('change', sortAndRenderMoviePool);
    
    // Search Autocomplete
    searchInput.addEventListener('input', handleSearchInput);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-autocomplete-wrapper')) {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    // Delegate events for participant menu
    tierListGrid.addEventListener('click', handleParticipantMenuEvents);

    // Close any open menus when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.participant-header-content')) {
            document.querySelectorAll('.participant-context-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
        // Close context menu
        const ctxMenu = document.getElementById('contextMenu');
        if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
            ctxMenu.classList.add('hidden');
        }
    });

    // Right Click Context Menu
    document.addEventListener('contextmenu', handleContextMenu);
    document.getElementById('contextMenu').addEventListener('click', handleContextAction);
    
    // Hide context menu on scroll
    window.addEventListener('scroll', () => {
        const ctxMenu = document.getElementById('contextMenu');
        if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
            ctxMenu.classList.add('hidden');
        }
    }, { passive: true });
}

// ---- Context Menu Logic ----

function handleContextMenu(e) {
    const tierItem = e.target.closest('.tier-item');
    if (!tierItem) return;

    e.preventDefault();
    contextMenuTarget = tierItem;
    
    // Determine context (Pool or Tier)
    // .tier-grid is used for tier list board, .selected-movies-grid for pool
    const isInTier = tierItem.closest('.tier-list-grid');
    const isInPool = tierItem.closest('.selected-movies-grid');
    
    const menu = document.getElementById('contextMenu');
    menu.innerHTML = ''; // Rebuild
    
    if (isInTier) {
        // Option: Unrank (Remove from this tier)
        const unrankBtn = document.createElement('div');
        unrankBtn.className = 'context-menu-item';
        unrankBtn.textContent = 'Unrank (Remove from Tier)';
        unrankBtn.dataset.action = 'unrank';
        menu.appendChild(unrankBtn);
    } else if (isInPool) {
         // Option: Remove from Selected (Pool) entirely
         const removePoolBtn = document.createElement('div');
         removePoolBtn.className = 'context-menu-item';
         removePoolBtn.textContent = 'Remove from Pool';
         removePoolBtn.dataset.action = 'remove-from-pool';
         menu.appendChild(removePoolBtn);
    }

    // Position menu relative to page (standard absolute behavior)
    // Use pageX/Y to account for scroll
    const x = e.pageX;
    const y = e.pageY;
    
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;
    menu.classList.remove('hidden');
}

async function handleContextAction(e) {
    const action = e.target.dataset.action;
    if (!action || !contextMenuTarget) return;
    
    const movieId = contextMenuTarget.dataset.movieId;
    
    // For Unrank: we need participant ID
    const tierContent = contextMenuTarget.closest('.tier-content');
    const participantId = tierContent ? tierContent.dataset.participantId : null;
    
    if (action === 'unrank' && participantId) {
        const watcherTiers = tierList.tiers[participantId];
        Object.keys(watcherTiers).forEach(tierKey => {
            watcherTiers[tierKey] = watcherTiers[tierKey].filter(id => id !== movieId);
        });
        await tierListRepository.update(tierList.id, tierList);
        renderBoard();
        sortAndRenderMoviePool();
    }
    
    if (action === 'remove-from-pool') {
        // Check if ranked by ANYONE
        let isRanked = false;
        if (tierList.tiers) {
            Object.values(tierList.tiers).forEach(wTiers => {
                Object.values(wTiers).forEach(tList => {
                    if (Array.isArray(tList) && tList.includes(movieId)) isRanked = true;
                });
            });
        }

        let shouldProceed = true;
        if (isRanked) {
             shouldProceed = confirm('This movie is currently ranked in one or more tier lists. Removing it will remove it from ALL tier lists and the pool. Continue?');
        }

        if (shouldProceed) {
            // Remove from selectedMovieIds
            if (tierList.selectedMovieIds) {
                tierList.selectedMovieIds = tierList.selectedMovieIds.filter(id => id !== movieId);
            }
            
            // Remove from ALL tiers
            if (tierList.tiers) {
                 Object.keys(tierList.tiers).forEach(wId => {
                     const wTiers = tierList.tiers[wId];
                     Object.keys(wTiers).forEach(tierKey => {
                         wTiers[tierKey] = wTiers[tierKey].filter(id => id !== movieId);
                     });
                 });
            }
            
            await tierListRepository.update(tierList.id, tierList);
            renderBoard(); 
            sortAndRenderMoviePool();
        }
    }
    
    document.getElementById('contextMenu').classList.add('hidden');
}

// ---- Filter Logic ----

async function handleAddFilteredMovies(e) {
    // PREVENT SUBMIT
    if (e && e.preventDefault) e.preventDefault();
    console.log('--- handleAddFilteredMovies CALLED ---');

    const term = searchInput.value.trim().toLowerCase();
    const genres = genreDropdown.selectedGenres;
    const watcherIds = watcherDropdown.selectedWatcherIds;
    const directorIds = directorDropdown.selectedDirectorIds;

    const allMovies = movieRepository.getAll();
    
    const matches = allMovies.filter(movie => {
        // Search Term
        if (term && !movie.title.toLowerCase().includes(term)) return false;
        
        // Genres (OR logic? or AND? usually must have ALL selected genres or ANY? Let's do ANY)
        // If we want strict filtering "Must match all selected", we use EVERY.
        // Usually UI behavior for multiselect is OR or AND. With Genres "Action, Comedy" usually means "Action OR Comedy" or "Action AND Comedy".
        // Let's assume OR for now (matches any selected genre), unless it's filtering down list.
        // Actually, for "Filter", usually it narrows down.
        // Let's go with: If genres selected, movie must have at least one of them.
        if (genres && genres.length > 0) {
             const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
             const hasGenre = genres.some(selected => movieGenres.includes(selected.toLowerCase()));
             if (!hasGenre) return false;
        }
        
        // Watchers: "Seen by". If filters selected, movie must be seen by ALL selected watchers? Or ANY?
        // Let's assume "Movies that Watcher A AND Watcher B have seen".
        if (watcherIds && watcherIds.length > 0) {
            const hasSeen = watcherIds.every(wid => (movie.watcherIds || []).includes(wid));
            if (!hasSeen) return false;
        }

        // Directors: Movie must be by ANY of the selected directors?
        if (directorIds && directorIds.length > 0) {
            if (!directorIds.includes(movie.directorId)) return false;
        }
        
        return true;
    });
    
    if (matches.length === 0) {
        alert('No movies matching your criteria.');
        return;
    }
    
    // Add matches to selectedMovieIds (avoid duplicates)
    if (!tierList.selectedMovieIds) tierList.selectedMovieIds = [];
    
    let addedCount = 0;
    matches.forEach(m => {
        if (!tierList.selectedMovieIds.includes(m.id)) {
            tierList.selectedMovieIds.push(m.id);
            addedCount++;
        }
    });
    
    await tierListRepository.update(tierList.id, tierList);
    console.log('--- REPO UPDATE COMPLETE ---');
    sortAndRenderMoviePool();
    
    // Clear inputs?
    // searchInput.value = '';
    // genreDropdown.clear(); // If method exists
    console.log(`Added ${addedCount} movies to pool.`);
}

async function handleClearSelectedMovies(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('--- handleClearSelectedMovies CALLED ---');
    
    if (confirm('Clear all movies from the pool? (This will not remove them from tiers)')) {
        tierList.selectedMovieIds = [];
        await tierListRepository.update(tierList.id, tierList);
        sortAndRenderMoviePool();
    }
}

// ---- Search Autocomplete ----

function handleSearchInput(e) {
    const term = e.target.value.toLowerCase().trim();
    if (term.length < 2) {
        autocompleteDropdown.classList.add('hidden');
        return;
    }
    
    const matches = movieRepository.getAll()
        .filter(m => m.title.toLowerCase().includes(term))
        .slice(0, 5); // Limit 5
    
    if (matches.length > 0) {
        autocompleteDropdown.innerHTML = '';
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `${m.title} <span class="movie-year">(${m.year})</span>`;
            div.addEventListener('click', () => {
                searchInput.value = m.title;
                autocompleteDropdown.classList.add('hidden');
            });
            autocompleteDropdown.appendChild(div);
        });
        autocompleteDropdown.classList.remove('hidden');
    } else {
        autocompleteDropdown.classList.add('hidden');
    }
}

function handleParticipantMenuEvents(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const action = target.dataset.action;
    const participantId = target.dataset.participantId;

    if (action === 'toggle-menu') {
        // Toggle this menu
        const menu = document.getElementById(`menu-${participantId}`);
        if (menu) {
            // Close others first
            document.querySelectorAll('.participant-context-menu').forEach(m => {
                if(m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        }
    } else if (action === 'remove-participant') {
        if (confirm('Remove this participant from the tier list?')) {
            removeParticipant(participantId);
        }
    }
}

async function removeParticipant(participantId) {
    if (!tierList.participantIds) return;

    // Remove ID
    tierList.participantIds = tierList.participantIds.filter(id => id !== participantId);
    
    // Optional: Only if we want to clean up data, actually keep it in case re-added? 
    // Usually better to keep the data in `tiers` object but remove from `participantIds` visibility list.
    // So if they are re-added, their tiers are restored.
    
    await tierListRepository.update(tierList.id, tierList);
    
    // Refresh
    renderParticipantDropdown();
    renderBoard();
    sortAndRenderMoviePool();
}

async function handleAddParticipant(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('--- handleAddParticipant CALLED ---');
    
    const watcherId = participantSelect.value;
    if (!watcherId) return;

    if (!tierList.participantIds) tierList.participantIds = [];
    
    if (!tierList.participantIds.includes(watcherId)) {
        tierList.participantIds.push(watcherId);
        
        // Init tiers for this watcher
        if (!tierList.tiers) tierList.tiers = {};
        if (!tierList.tiers[watcherId]) {
            tierList.tiers[watcherId] = { S:[], A:[], B:[], C:[], D:[], F:[] };
        }

        await tierListRepository.update(tierList.id, tierList);
        console.log('--- REPO UPDATE PARTICIPANT COMPLETE ---');
        
        // Refresh UI
        renderParticipantDropdown();
        renderBoard();
        sortAndRenderMoviePool();
    }
}

// Drag and Drop Logic
function setupDragAndDrop() {
    const items = document.querySelectorAll('.tier-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });

    const dropZones = document.querySelectorAll('.tier-content');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
    });
    
    // Also allow dropping back to pool? (Removing rank)
    selectedMoviesGrid.addEventListener('dragover', handleDragOver);
    selectedMoviesGrid.addEventListener('drop', handleDropToPool);
}

function handleDragStart(e) {
    dragSource = e.target.closest('.tier-item');
    if (!dragSource) return;

    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', dragSource.dataset.movieId);
    
    // If dragging from a tier, we need to know the origin participant
    const parentTierContent = dragSource.closest('.tier-content');
    if (parentTierContent) {
        const pId = parentTierContent.dataset.participantId;
        const tier = parentTierContent.dataset.tier;
        console.log(`Dragging from Tier: ${tier}, Participant: ${pId}`);
        e.dataTransfer.setData('source-participant', pId);
        e.dataTransfer.setData('source-tier', tier);
    } else {
        console.log('Dragging from Pool');
    }
    
    dragSource.classList.add('dragging');
}

function handleDragEnd(e) {
    if (dragSource) dragSource.classList.remove('dragging');
    dragSource = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.preventDefault) e.preventDefault();
    const zone = e.currentTarget; // .tier-content
    zone.classList.remove('drag-over');
    
    const movieId = e.dataTransfer.getData('text/plain');
    const sourceParticipant = e.dataTransfer.getData('source-participant');
    const targetTier = zone.dataset.tier;
    const participantId = zone.dataset.participantId;
    
    if (!movieId || !targetTier || !participantId) return;

    // CHECK: If dragging from Pool (no sourceParticipant) AND already ranked by this participant -> ABORT
    if (!sourceParticipant) {
        // ... (existing poll check)
        const pTiers = tierList.tiers[participantId];
        const isAlreadyRanked = Object.values(pTiers).some(arr => arr.includes(movieId));
        if (isAlreadyRanked) {
             console.log('Movie already ranked by participant. Ignoring drop from pool.');
             return;
        }
    } else {
        // Dragging from another participant list?
        if (sourceParticipant !== participantId) {
             console.log('Dragging from another participant is not allowed.');
             return;
        }
    }

    // Update Model
    const watcherTiers = tierList.tiers[participantId];
    
    // Remove from other tiers for this watcher
    Object.keys(watcherTiers).forEach(tierKey => {
        watcherTiers[tierKey] = watcherTiers[tierKey].filter(id => id !== movieId);
    });

    // Add to new tier
    if (!watcherTiers[targetTier].includes(movieId)) {
        watcherTiers[targetTier].push(movieId);
    }
    
    await tierListRepository.update(tierList.id, tierList);
    renderBoard();
    sortAndRenderMoviePool();
}

async function handleDropToPool(e) {
    if (e.preventDefault) e.preventDefault();
    
    // Drop logic to unrank
    const movieId = e.dataTransfer.getData('text/plain');
    const sourceParticipant = e.dataTransfer.getData('source-participant');
    
    if (sourceParticipant && movieId) {
        const watcherTiers = tierList.tiers[sourceParticipant];
        // Remove from all tiers for this watcher
        Object.keys(watcherTiers).forEach(tierKey => {
            watcherTiers[tierKey] = watcherTiers[tierKey].filter(id => id !== movieId);
        });
        
        await tierListRepository.update(tierList.id, tierList);
        renderBoard(); // Update tiers UI
        sortAndRenderMoviePool(); // Update pool (movie might reappear)
    }
}

document.addEventListener('DOMContentLoaded', init);
