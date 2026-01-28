/**
 * Watchers CRUD Application
 * Main controller for the watchers management page
 */

import { createWatcher, validateWatcherFields, updateWatcher, getWatcherFullName } from './watcher-models.js';
import { loadWatchers, addWatcher, updateWatcherInStore, deleteWatcher, getWatchers, toggleFavorite, isFavorite, getFavorites, getWatchersSortedByFavorites } from './watcher-storage.js';
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
async function init() {
  try {
    await initializeSeedData(); 
    await loadWatchers();
  } catch (err) {
    console.error("Initialization failed", err);
  }
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

async function handleCreate(formData) {
  const newWatcher = createWatcher(formData);
  await addWatcher(newWatcher);
  renderWatchers();
  resetForm();
  highlightWatcher(newWatcher.id);
}

async function handleUpdate(formData) {
  const watchers = getWatchers();
  const originalWatcher = watchers.find(w => w.id === currentEditId);
  
  if (!originalWatcher) {
    console.error('Watcher not found for update');
    return;
  }
  
  const updatedWatcher = updateWatcher(originalWatcher, formData);
  await updateWatcherInStore(currentEditId, updatedWatcher);
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
  const allWatchers = getWatchersSortedByFavorites();
  const filteredWatchers = filterWatchers(allWatchers);
  
  // Update counts
  if (watcherCount) {
    watcherCount.textContent = `${filteredWatchers.length} Watcher${filteredWatchers.length !== 1 ? 's' : ''}`;
  }
  
  // Empty state
  if (filteredWatchers.length === 0) {
    watcherList.innerHTML = '';
    emptyMessage.classList.remove('hidden');
    return;
  }
  
  emptyMessage.classList.add('hidden');
  watcherList.innerHTML = '';
  
  const fragment = document.createDocumentFragment();
  
  filteredWatchers.forEach(watcher => {
    const item = createWatcherItem(watcher);
    fragment.appendChild(item);
  });
  
  watcherList.appendChild(fragment);
}

function createWatcherItem(watcher) {
  const li = document.createElement('li');
  // Logic to highlight active item if needed
  const isActive = currentEditId === watcher.id ? 'border-primary' : '';
  li.className = `watcher-item ${isActive}`;
  li.id = `card-${watcher.id}`;
  
  const fullName = getWatcherFullName(watcher);
  const favoriteClass = isFavorite(watcher.id) ? 'active' : '';
  const starIcon = isFavorite(watcher.id) ? '★' : '☆';
  
  li.innerHTML = `
    <div class="watcher-info">
      <a href="watcher-detail.html?id=${watcher.id}" class="watcher-link" title="View details">
        <h3 class="watcher-name">${fullName}</h3>
        <p class="watcher-meta">ID: ${watcher.id.substring(0, 8)}...</p>
      </a>
    </div>
    <div class="watcher-actions">
      <button class="small secondary favorite-btn ${favoriteClass}" title="Toggle Favorite">${starIcon}</button>
      <button class="small secondary edit-btn">Edit</button>
      <button class="small danger delete-btn">Delete</button>
    </div>
  `;
  
  // Attach event listeners
  const editBtn = li.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => populateForm(watcher));
  
  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => confirmDelete(watcher.id));
  
  const favoriteBtn = li.querySelector('.favorite-btn');
  favoriteBtn.addEventListener('click', (e) => handleToggleFavorite(e, watcher.id));
  
  return li;
}

function getInitials(watcher) {
  return (watcher.firstName.charAt(0) + (watcher.lastName ? watcher.lastName.charAt(0) : '')).toUpperCase();
}

function getAvatarColor(id) {
  // Generate a consistent color based on ID
  const colors = ['bg-primary', 'bg-secondary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'bg-dark'];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

// ===== UI HELPERS =====
function populateForm(watcher) {
  firstNameInput.value = watcher.firstName;
  lastNameInput.value = watcher.lastName || '';
  editingIdInput.value = watcher.id;
  currentEditId = watcher.id;
  
  formTitle.textContent = 'Edit Watcher';
  submitBtn.textContent = 'Update Watcher';
  cancelBtn.classList.remove('hidden');
  
  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  currentEditId = null;
  editingIdInput.value = '';
  formTitle.textContent = 'Add New Watcher';
  submitBtn.textContent = 'Add Watcher';
  cancelBtn.classList.add('hidden');
  clearErrors();
  
  // Remove highlighting
  document.querySelectorAll('.watcher-card').forEach(c => c.classList.remove('border-primary'));
}

async function confirmDelete(id) {
  if (confirm('Are you sure you want to delete this watcher? This action cannot be undone.')) {
    await deleteWatcher(id);
    renderWatchers();
    // If we were editing this one, reset form
    if (currentEditId === id) {
      resetForm();
    }
  }
}

function handleToggleFavorite(e, id) {
  e.stopPropagation(); // Prevent row click or other events
  const isNowFav = toggleFavorite(id);
  
  // Re-render to update sorting
  renderWatchers();
}

function highlightWatcher(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('border-primary');
    // Remove highlight after animation
    setTimeout(() => {
        if(currentEditId !== id) {
            card.classList.remove('border-primary');
        }
    }, 2000);
  }
}

// ===== ERROR HANDLING =====
function displayErrors(errors) {
  // Clear previous errors
  clearErrors();
  
  // Display new errors
  Object.keys(errors).forEach(field => {
    const input = document.getElementById(field);
    if (input) {
      input.classList.add('is-invalid');
      const feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      feedback.textContent = errors[field];
      input.parentNode.appendChild(feedback);
    }
  });
}

function clearErrors() {
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
}

// Start app
document.addEventListener('DOMContentLoaded', init);
