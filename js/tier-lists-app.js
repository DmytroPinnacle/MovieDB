import { tierListRepository, watcherRepository, movieRepository } from './dal/index.js';
import { initializeSeedData } from './DataSeed/initializer.js';
import { createTierList, validateTierListFields } from './tier-list-models.js';

// State
let tierLists = [];
let currentEditId = null;

// DOM Elements
const tierListsContainer = document.getElementById('tierListsContainer');
const addTierListBtn = document.getElementById('addTierListBtn');
const tierListModal = document.getElementById('tierListModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const tierListForm = document.getElementById('tierListForm');
const modalTitle = document.getElementById('modalTitle');
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

let pendingDeleteId = null;

// Initialize
function init() {
  // Ensure modals are closed on page load
  if (tierListModal) tierListModal.close();
  if (deleteModal) deleteModal.close();
  
  // Seed repositories so dropdowns and lists have data
  initializeSeedData();

  loadTierLists();
  renderTierLists();
  attachEventListeners();
}

function loadTierLists() {
  tierLists = tierListRepository.getAll();
}

function attachEventListeners() {
  addTierListBtn.addEventListener('click', () => openModal());
  closeModalBtn.addEventListener('click', () => closeModal());
  cancelBtn.addEventListener('click', () => closeModal());
  tierListForm.addEventListener('submit', handleSave);
  
  closeDeleteModalBtn.addEventListener('click', () => closeDeleteModal());
  cancelDeleteBtn.addEventListener('click', () => closeDeleteModal());
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
  // Close modal on backdrop click
  tierListModal.addEventListener('click', (e) => {
    if (e.target === tierListModal) closeModal();
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Close context menus on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.list-menu-btn') && !e.target.closest('.list-context-menu')) {
      document.querySelectorAll('.list-context-menu').forEach(el => el.classList.add('hidden'));
    }
  });
}

function openModal(tierListId = null) {
  currentEditId = tierListId;
  
  if (tierListId) {
    const tierList = tierListRepository.getById(tierListId);
    if (tierList) {
      modalTitle.textContent = 'Edit Tier List';
      document.getElementById('tierListName').value = tierList.name;
      document.getElementById('tierListId').value = tierList.id;
    }
  } else {
    modalTitle.textContent = 'Create Tier List';
    tierListForm.reset();
  }
  
  clearErrors();
  tierListModal.showModal();
}

function closeModal() {
  tierListModal.close();
  tierListForm.reset();
  currentEditId = null;
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

function displayErrors(errors) {
  clearErrors();
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = message;
  }
}

function handleSave(e) {
  e.preventDefault();
  
  const formData = new FormData(tierListForm);
  const data = {
    name: formData.get('name')
  };
  
  const errors = validateTierListFields(data);
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }
  
  if (currentEditId) {
    const existing = tierListRepository.getById(currentEditId);
    if (existing) {
      tierListRepository.update(currentEditId, { ...existing, name: data.name.trim(), updatedAt: Date.now() });
    }
  } else {
    const newTierList = createTierList(data);
    tierListRepository.add(newTierList);
  }
  
  loadTierLists();
  renderTierLists();
  closeModal();
}

function openDeleteModal(tierListId) {
  pendingDeleteId = tierListId;
  deleteModal.showModal();
}

function closeDeleteModal() {
  deleteModal.close();
  pendingDeleteId = null;
}

function handleDelete() {
  if (pendingDeleteId) {
    tierListRepository.delete(pendingDeleteId);
    loadTierLists();
    renderTierLists();
  }
  closeDeleteModal();
}

function renderTierLists() {
  if (tierLists.length === 0) {
    tierListsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <p>No tier lists yet. Create your first one!</p>
      </div>
    `;
    return;
  }
  
  tierListsContainer.innerHTML = tierLists.map(tierList => {
    // Resolve participants
    const participantNames = tierList.participantIds
        .map(id => {
            const w = watcherRepository.getById(id);
            return w ? w.firstName : 'Unknown';
        })
        .join(', ');

    // Count movies and resolve names
    const movieCount = tierList.selectedMovieIds.length;
    let tieredMovieCount = 0;
    const tieredMovieIds = new Set();
    
    // Check tiers for more movies and count
    if (tierList.tiers) {
        for (const watcherId of tierList.participantIds) {
            const watcherTiers = tierList.tiers[watcherId];
            if (watcherTiers) {
                for (const tier of ['S', 'A', 'B', 'C', 'D']) {
                    const ids = watcherTiers[tier] || [];
                    tieredMovieCount += ids.length;
                    ids.forEach(id => tieredMovieIds.add(id));
                }
            }
        }
    }

    const movieNames = Array.from(tieredMovieIds)
        .map(id => {
            const m = movieRepository.getById(id);
            return m ? m.title : 'Unknown';
        })
        .join(', ');
    
    return `
      <div class="tier-list-card" data-id="${tierList.id}">
        <div class="tier-list-card-header">
          <h3>${escapeHtml(tierList.name)}</h3>
          <div style="position: relative;">
            <button class="list-menu-btn" data-id="${tierList.id}">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
            <div class="list-context-menu hidden">
                <button class="edit-btn" data-id="${tierList.id}">Rename</button>
                <button class="delete-btn danger" data-id="${tierList.id}">Delete</button>
            </div>
          </div>
        </div>
        <div class="tier-list-info">
          <p class="truncate-text" title="${participantNames}">👥 ${participantNames || 'No participants'}</p>
          <div>
            <div>🎬 ${movieCount} selected, ${tieredMovieCount} tiered</div>
            ${movieNames ? `<div class="truncate-text movie-preview" title="${movieNames}">${movieNames}</div>` : ''}
          </div>
          <p style="font-size: 0.8rem; color: var(--muted);">
            Created: ${new Date(tierList.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  tierListsContainer.querySelectorAll('.tier-list-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking menu button or menu items
      if (!e.target.closest('.list-menu-btn') && !e.target.closest('.list-context-menu')) {
        window.location.href = `tier-list-detail.html?id=${id}`;
      }
    });
  });

  // Menu toggles
  tierListsContainer.querySelectorAll('.list-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        
        // Close other menus
        document.querySelectorAll('.list-context-menu').forEach(el => {
            if (el !== menu) el.classList.add('hidden');
        });
        
        menu.classList.toggle('hidden');
    });
  });
  
  tierListsContainer.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close menu
      const menu = btn.closest('.list-context-menu');
      if (menu) menu.classList.add('hidden');

      openModal(btn.dataset.id);
    });
  });
  
  tierListsContainer.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close menu
      const menu = btn.closest('.list-context-menu');
      if (menu) menu.classList.add('hidden');

      openDeleteModal(btn.dataset.id);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start app
init();
