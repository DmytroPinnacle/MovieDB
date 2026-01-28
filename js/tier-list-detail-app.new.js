// See tier-list-storage.js which wraps repository
import { tierListRepository, watcherRepository, movieRepository } from './dal/index.js';
import { getWatcherFullName } from './watcher-models.js';

// State
let tierList = null;
let currentTierListId = null;
let dragSource = null;

// DOM Elements
const tierListTitle = document.getElementById('tierListTitle');
const addParticipantBtn = document.getElementById('addParticipantBtn');
const participantModal = document.getElementById('participantModal');
const closeParticipantModalBtn = document.getElementById('closeParticipantModalBtn');
const watcherSelect = document.getElementById('watcherSelect');
const addParticipantConfirmBtn = document.getElementById('addParticipantConfirmBtn');
const tierContainer = document.getElementById('tierContainer');
const unrankedContainer = document.getElementById('unrankedContainer');

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
      movieRepository.load()
  ]);

  loadData();
  
  if (!tierList) {
    alert('Tier List not found');
    window.location.href = 'tier-lists.html';
    return;
  }

  renderHeader();
  renderBoard();
  attachEventListeners();
}

function loadData() {
  tierList = tierListRepository.getById(currentTierListId);
}

function renderHeader() {
  tierListTitle.textContent = tierList.name;
}

function renderBoard() {
  // Clear containers
  tierContainer.innerHTML = '';
  // We need to render a set of tiers for EACH participant? 
  // Or just one shared board if multiple participants?
  // The current model seems to support per-watcher tiers in the same list?
  // checking tier-list-models.js/repository...
  
  // Actually, UI likely assumes one watcher at a time, or shows all side-by-side?
  // For simplicity, let's render Tabs for participants
  
  renderParticipantTabs();
}

let activeParticipantId = null;

function renderParticipantTabs() {
  const container = document.getElementById('participantTabs');
  if (!container) return; // If tabs container exists
  
  // Implementation of tabs or dropdown to switch view
  // For now let's use the first participant if any
  if (tierList.participantIds.length > 0 && !activeParticipantId) {
    activeParticipantId = tierList.participantIds[0];
  }
  
  renderTiersForParticipant(activeParticipantId);
}

function renderTiersForParticipant(watcherId) {
  if (!watcherId) {
      tierContainer.innerHTML = '<div class="p-4 text-center">Add a participant to start ranking!</div>';
      unrankedContainer.innerHTML = '';
      return;
  }

  // Tiers S, A, B, C, D, F
  const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
  const watcherTiers = tierList.tiers[watcherId] || { S:[], A:[], B:[], C:[], D:[], F:[] };
  
  tierContainer.innerHTML = '';
  tiers.forEach(tier => {
    const row = document.createElement('div');
    row.className = 'tier-row mb-3';
    
    // Tier Label
    const label = document.createElement('div');
    label.className = `tier-label tier-${tier}`;
    label.textContent = tier;
    
    // Tier content (droppable)
    const content = document.createElement('div');
    content.className = 'tier-content';
    content.dataset.tier = tier;
    
    // Movies in this tier
    const movieIds = watcherTiers[tier] || [];
    movieIds.forEach(movieId => {
      const movie = movieRepository.getById(movieId);
      if (movie) {
        content.appendChild(createMovieCard(movie));
      }
    });
    
    row.appendChild(label);
    row.appendChild(content);
    tierContainer.appendChild(row);
  });
  
  // Unranked
  // Find movies watched by this person but not in any tier?
  // Or just a pool of movies?
  // Assuming a pool of all movies or specific list...
  
  // For now, let's just show movies NOT in any tier for this watcher
  const rankedMovies = new Set();
  tiers.forEach(t => (watcherTiers[t] || []).forEach(id => rankedMovies.add(id)));
  
  const allMovies = movieRepository.getAll();
  // Filter maybe only watched movies?
  
  unrankedContainer.innerHTML = '';
  allMovies.forEach(movie => {
    if (!rankedMovies.has(movie.id)) {
      unrankedContainer.appendChild(createMovieCard(movie));
    }
  });

  setupDragAndDrop();
}

function createMovieCard(movie) {
  const img = document.createElement('img');
  img.src = movie.posterUrl && movie.posterUrl !== 'N/A' ? movie.posterUrl : 'assets/placeholder.png';
  img.className = 'tier-item';
  img.draggable = true;
  img.dataset.movieId = movie.id;
  img.title = movie.title;
  return img;
}

function attachEventListeners() {
  addParticipantBtn.addEventListener('click', openParticipantModal);
  closeParticipantModalBtn.addEventListener('click', closeParticipantModal);
  addParticipantConfirmBtn.addEventListener('click', handleAddParticipant);
}

function openParticipantModal() {
  // Populate watcher select
  const allWatchers = watcherRepository.getAll();
  // Filter out existing
  const available = allWatchers.filter(w => !tierList.participantIds.includes(w.id));
  
  watcherSelect.innerHTML = '';
  available.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = getWatcherFullName(w);
    watcherSelect.appendChild(opt);
  });
  
  participantModal.showModal();
}

function closeParticipantModal() {
  participantModal.close();
}

async function handleAddParticipant() {
  const watcherId = watcherSelect.value;
  if (watcherId) {
    if (!tierList.participantIds.includes(watcherId)) {
       tierList.participantIds.push(watcherId);
       // Init tiers
       tierList.tiers[watcherId] = { S:[], A:[], B:[], C:[], D:[], F:[] };
       
       await tierListRepository.update(tierList.id, tierList);
       
       activeParticipantId = watcherId;
       renderBoard();
    }
    closeParticipantModal();
  }
}

function setupDragAndDrop() {
  document.querySelectorAll('.tier-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });
  
  document.querySelectorAll('.tier-content, #unrankedContainer').forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  dragSource = e.target;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.target.dataset.movieId);
  setTimeout(() => e.target.classList.add('opacity-50'), 0);
}

function handleDragEnd(e) {
  e.target.classList.remove('opacity-50');
  dragSource = null;
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  e.target.closest('.tier-content, #unrankedContainer')?.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.target.closest('.tier-content, #unrankedContainer')?.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  const container = e.target.closest('.tier-content, #unrankedContainer');
  if (!container) return;
  
  container.classList.remove('drag-over');
  
  const movieId = e.dataTransfer.getData('text/plain');
  const targetTier = container.dataset.tier; // undefined if unranked
  
  // Update Model
  if (!activeParticipantId) return;
  
  const watcherTiers = tierList.tiers[activeParticipantId];
  
  // Remove from old tier if any
  for (const t in watcherTiers) {
    watcherTiers[t] = watcherTiers[t].filter(id => id !== movieId);
  }
  
  // Add to new tier
  if (targetTier) {
    if (!watcherTiers[targetTier]) watcherTiers[targetTier] = [];
    watcherTiers[targetTier].push(movieId);
  }
  
  await tierListRepository.update(tierList.id, tierList);
  
  // Re-render
  renderTiersForParticipant(activeParticipantId);
}

document.addEventListener('DOMContentLoaded', init);
