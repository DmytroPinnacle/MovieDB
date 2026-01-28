import { tierListRepository, watcherRepository, movieRepository } from './dal/index.js';
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
async function init() {
  // Ensure modals are closed on page load
  if (tierListModal) tierListModal.close();
  if (deleteModal) deleteModal.close();
  
  // Seed repositories so dropdowns and lists have data
  await Promise.all([
      tierListRepository.load(),
      watcherRepository.load(), // Needed for participants maybe?
      movieRepository.load() // Needed for tier items?
  ]);

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
    const errorEl = document.getElementById(`${field}Error`);
    if (errorEl) errorEl.textContent = message;
  }
}

async function handleSave(e) {
  e.preventDefault();
  
  const formData = new FormData(tierListForm);
  const name = formData.get('name');
  
  const updatedData = {
    name: name
  };
  
  const errors = validateTierListFields(updatedData);
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }
  
  if (currentEditId) {
    // Merge existing
    const existing = tierListRepository.getById(currentEditId);
    const merged = { ...existing, ...updatedData };
    await tierListRepository.update(currentEditId, merged);
  } else {
    const newTierList = createTierList(updatedData);
    await tierListRepository.add(newTierList);
  }
  
  loadTierLists();
  renderTierLists();
  closeModal();
}

function handleDeleteConfirm(id) {
  pendingDeleteId = id;
  deleteModal.showModal();
}

function closeDeleteModal() {
  deleteModal.close();
  pendingDeleteId = null;
}

async function handleDelete() {
  if (pendingDeleteId) {
    await tierListRepository.delete(pendingDeleteId);
    loadTierLists();
    renderTierLists();
    closeDeleteModal();
  }
}

function renderTierLists() {
  tierListsContainer.innerHTML = '';
  
  if (tierLists.length === 0) {
    tierListsContainer.innerHTML = `
      <div class="col-12 text-center p-5">
        <p class="text-muted fs-4">No Tier Lists yet. Creates one!</p>
      </div>
    `;
    return;
  }
  
  tierLists.forEach(list => {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4 mb-4';
    card.innerHTML = `
      <div class="card h-100 tier-list-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title text-truncate">
              <a href="tier-list-detail.html?id=${list.id}" class="text-decoration-none text-dark stretched-link">
                ${list.name}
              </a>
            </h5>
            <div class="dropdown" style="z-index: 2;">
              <button class="btn btn-link text-dark p-0 list-menu-btn" type="button">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end list-context-menu shadow hidden">
                <li><a class="dropdown-item edit-btn" href="#" data-id="${list.id}">Edit</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger delete-btn" href="#" data-id="${list.id}">Delete</a></li>
              </ul>
            </div>
          </div>
          <p class="card-text text-muted small">
            Participants: ${list.participantIds.length}<br>
            Created: ${new Date(list.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div class="card-footer bg-transparent border-top-0">
          <a href="tier-list-detail.html?id=${list.id}" class="btn btn-sm btn-outline-primary w-100 position-relative" style="z-index: 1;">View Tier List</a>
        </div>
      </div>
    `;
    
    // Wire up events
    const menuBtn = card.querySelector('.list-menu-btn');
    const menu = card.querySelector('.list-context-menu');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Close others first
      document.querySelectorAll('.list-context-menu').forEach(el => {
        if (el !== menu) el.classList.add('hidden');
      });
      menu.classList.toggle('hidden');
    });
    
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.add('hidden');
      openModal(list.id);
    });
    
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.add('hidden');
      handleDeleteConfirm(list.id);
    });
    
    tierListsContainer.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', init);
