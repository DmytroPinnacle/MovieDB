/**
 * Watchers CRUD Application
 * Main controller for the watchers management page
 */

import { createWatcher, validateWatcherFields, updateWatcher, getWatcherFullName } from './watcher-models.js';
import { loadWatchers, addWatcher, updateWatcherInStore, deleteWatcher, getWatchers, toggleFavorite, isFavorite, getFavorites } from './watcher-storage.js';
import { initializeSeedData } from './DataSeed/initializer.js';

// ===== STATE MANAGEMENT =====
let currentEditId = null;
let searchTerm = '';

// ===== DOM REFERENCES =====
const form = document.getElementById('watcherForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const editingIdInput = document.getElementById('editingId');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');
const watcherList = document.getElementById('watcherList');
const emptyMessage = document.getElementById('emptyMessage');
const watcherCount = document.getElementById('watcherCount');
const searchInput = document.getElementById('searchInput');

// ===== INITIALIZATION =====
function init() {
  initializeSeedData(); // Initialize seed data if needed
  loadWatchers();
  renderWatchers();
  attachEventListeners();
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
  form.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', resetForm);
  searchInput.addEventListener('input', handleSearch);
}

// ===== FORM HANDLING =====
function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();
  
  const formData = {
    firstName: firstNameInput.value,
    lastName: lastNameInput.value
  };
  
  // Validate input
  const errors = validateWatcherFields(formData);
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }
  
  // Create or update watcher
  if (currentEditId) {
    handleUpdate(formData);
  } else {
    handleCreate(formData);
  }
}

function handleCreate(formData) {
  const newWatcher = createWatcher(formData);
  addWatcher(newWatcher);
  renderWatchers();
  resetForm();
  highlightWatcher(newWatcher.id);
}

function handleUpdate(formData) {
  const watchers = getWatchers();
  const originalWatcher = watchers.find(w => w.id === currentEditId);
  
  if (!originalWatcher) {
    console.error('Watcher not found for update');
    return;
  }
  
  const updatedWatcher = updateWatcher(originalWatcher, formData);
  updateWatcherInStore(currentEditId, updatedWatcher);
  renderWatchers();
  resetForm();
  highlightWatcher(updatedWatcher.id);
}

// ===== SEARCH FUNCTIONALITY =====
function handleSearch(e) {
  searchTerm = e.target.value.toLowerCase().trim();
  renderWatchers();
}

function filterWatchers(watchers) {
  if (!searchTerm) return watchers;
  
  return watchers.filter(watcher => {
    const fullName = getWatcherFullName(watcher).toLowerCase();
    return fullName.includes(searchTerm);
  });
}

// ===== RENDERING =====
function renderWatchers() {
  const watchers = getWatchers();
  const filtered = filterWatchers(watchers);
  
  // Update count
  updateWatcherCount(filtered.length, watchers.length);
  
  // Show/hide empty message
  if (filtered.length === 0) {
    watcherList.classList.add('hidden');
    emptyMessage.classList.remove('hidden');
    emptyMessage.textContent = searchTerm 
      ? 'No watchers match your search.' 
      : 'No watchers found. Add your first watcher!';
    return;
  }
  
  watcherList.classList.remove('hidden');
  emptyMessage.classList.add('hidden');
  
  // Sort: favorites first (in selection order), then alphabetically by name
  const favorites = [];
  const nonFavorites = [];
  
  filtered.forEach(watcher => {
    if (isFavorite(watcher.id)) {
      favorites.push(watcher);
    } else {
      nonFavorites.push(watcher);
    }
  });
  
  // Sort non-favorites alphabetically
  nonFavorites.sort((a, b) => 
    getWatcherFullName(a).localeCompare(getWatcherFullName(b))
  );
  
  // Favorites maintain their selection order (from storage)
  const favoriteIds = getFavorites();
  favorites.sort((a, b) => {
    return favoriteIds.indexOf(a.id) - favoriteIds.indexOf(b.id);
  });
  
  const sorted = [...favorites, ...nonFavorites];
  
  // Render list items
  watcherList.innerHTML = sorted.map(watcher => createWatcherItem(watcher)).join('');
  
  // Attach event listeners to action buttons
  attachListItemListeners();
}

function createWatcherItem(watcher) {
  const fullName = getWatcherFullName(watcher);
  const createdDate = new Date(watcher.createdAt).toLocaleDateString();
  const wasUpdated = watcher.updatedAt !== watcher.createdAt;
  const updatedDate = wasUpdated ? new Date(watcher.updatedAt).toLocaleDateString() : null;
  const isFav = isFavorite(watcher.id);
  
  return `
    <li class="watcher-item" data-id="${watcher.id}">
      <a href="watcher-detail.html?id=${watcher.id}" class="watcher-info watcher-link">
        <h3 class="watcher-name">${escapeHtml(fullName)}</h3>
        <p class="watcher-meta">
          Added: ${createdDate}
          ${wasUpdated ? `• Updated: ${updatedDate}` : ''}
        </p>
      </a>
      <div class="watcher-actions">
        <button class="small ${isFav ? 'primary' : 'secondary'} favorite-btn" data-id="${watcher.id}" aria-label="${isFav ? 'Remove from' : 'Add to'} favorites" title="${isFav ? 'Remove from' : 'Add to'} favorites">
          ${isFav ? '⭐' : '☆'}
        </button>
        <button class="small secondary edit-btn" data-id="${watcher.id}" aria-label="Edit ${escapeHtml(fullName)}">
          ✏️ Edit
        </button>
        <button class="small danger delete-btn" data-id="${watcher.id}" aria-label="Delete ${escapeHtml(fullName)}">
          🗑️ Delete
        </button>
      </div>
    </li>
  `;
}

function attachListItemListeners() {
  // Favorite buttons
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', handleToggleFavorite);
  });
  
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', handleEdit);
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

function updateWatcherCount(displayedCount, totalCount) {
  const text = displayedCount === totalCount
    ? `${totalCount} watcher${totalCount !== 1 ? 's' : ''}`
    : `${displayedCount} of ${totalCount} watcher${totalCount !== 1 ? 's' : ''}`;
  watcherCount.textContent = text;
}

// ===== EDIT / DELETE HANDLERS =====
function handleEdit(e) {
  const watcherId = e.currentTarget.dataset.id;
  const watchers = getWatchers();
  const watcher = watchers.find(w => w.id === watcherId);
  
  if (!watcher) return;
  
  // Populate form with watcher data
  currentEditId = watcherId;
  editingIdInput.value = watcherId;
  firstNameInput.value = watcher.firstName;
  lastNameInput.value = watcher.lastName || '';
  
  // Update UI to show edit mode
  formTitle.textContent = 'Edit Watcher';
  submitBtn.textContent = 'Update Watcher';
  cancelBtn.classList.remove('hidden');
  
  // Focus first input
  firstNameInput.focus();
  
  // Scroll to form on mobile
  if (window.innerWidth <= 900) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleToggleFavorite(e) {
  const watcherId = e.currentTarget.dataset.id;
  toggleFavorite(watcherId);
  renderWatchers();
}

function handleDelete(e) {
  const watcherId = e.currentTarget.dataset.id;
  const watchers = getWatchers();
  const watcher = watchers.find(w => w.id === watcherId);
  
  if (!watcher) return;
  
  const fullName = getWatcherFullName(watcher);
  const confirmed = confirm(`Are you sure you want to delete "${fullName}"?`);
  
  if (!confirmed) return;
  
  deleteWatcher(watcherId);
  renderWatchers();
  
  // If we were editing this watcher, reset the form
  if (currentEditId === watcherId) {
    resetForm();
  }
}

// ===== FORM UTILITIES =====
function resetForm() {
  form.reset();
  currentEditId = null;
  editingIdInput.value = '';
  formTitle.textContent = 'Add Watcher';
  submitBtn.textContent = 'Add Watcher';
  cancelBtn.classList.add('hidden');
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(el => {
    el.textContent = '';
  });
}

function displayErrors(errors) {
  Object.keys(errors).forEach(fieldName => {
    const errorElement = document.querySelector(`[data-error-for="${fieldName}"]`);
    if (errorElement) {
      errorElement.textContent = errors[fieldName];
    }
  });
}

// ===== VISUAL FEEDBACK =====
function highlightWatcher(watcherId) {
  // Add highlight animation to newly created/updated item
  setTimeout(() => {
    const item = document.querySelector(`.watcher-item[data-id="${watcherId}"]`);
    if (item) {
      item.classList.add('highlight');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== START APPLICATION =====
init();
