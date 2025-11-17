// Movie detail page logic
import { loadMovies } from './storage.js';
import { loadWatchers, getWatcherById, getWatchers } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';

function getMovieIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function renderMovieDetail(movie) {
  const container = document.getElementById('movieDetail');
  
  const posterHtml = movie.posterUrl && movie.posterUrl.trim()
    ? `<img src="${movie.posterUrl}" alt="Poster for ${movie.title}" />`
    : 'No Poster';
  
  const ratingHtml = movie.rating != null
    ? `<div class="detail-meta-item"><span class="detail-rating">⭐ ${movie.rating}</span></div>`
    : '';
  
  const watcherIds = movie.watcherIds || [];
  const watcherNames = watcherIds
    .map(id => getWatcherById(id))
    .filter(Boolean)
    .map(w => escapeHtml(getWatcherFullName(w)));
  
  const imdbHtml = movie.imdbId && movie.imdbId.trim()
    ? `<a href="https://www.imdb.com/title/${movie.imdbId}/" target="_blank" rel="noopener" class="small">View on IMDB</a>`
    : '';
  
  const watchersHtml = `
    <div class="detail-section watchers-section-detail">
      <div class="watchers-inner editable" data-field="watchers">
        <h3>Watchers <button class="edit-field-btn" aria-label="Edit watchers">✏️</button></h3>
        <div class="watchers-display">
          ${watcherNames.length > 0 
            ? watcherNames.map(name => `<span class="watcher-tag">👤 ${name}</span>`).join('') 
            : '<span class="no-watchers-msg">No watchers assigned</span>'}
        </div>
      </div>
    </div>
  `;
  
  const notesHtml = `
    <div class="detail-section notes-section-detail">
      <div class="notes-inner editable" data-field="notes">
        <h3>Notes <button class="edit-field-btn" aria-label="Edit notes">✏️</button></h3>
        <div class="notes-display">
          ${movie.notes && movie.notes.trim() 
            ? `<div class="detail-notes">${escapeHtml(movie.notes)}</div>`
            : '<span class="no-notes-msg">No notes added</span>'}
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-poster">${posterHtml}</div>
      <div class="detail-info">
        <h1 class="detail-title">${escapeHtml(movie.title)}</h1>
        <div class="detail-meta">
          <div class="detail-meta-item">📅 ${movie.year}</div>
          <div class="detail-meta-item">🎭 ${escapeHtml(movie.genre)}</div>
          ${ratingHtml}
        </div>
        <div class="detail-actions">
          ${imdbHtml}
        </div>
      </div>
    </div>
    
    <div class="detail-section">
      <h3>Movie Information</h3>
      <div class="detail-field editable" data-field="title">
        <span class="detail-field-label">Title:</span>
        <span class="detail-field-value">${escapeHtml(movie.title)}</span>
        <button class="edit-field-btn" aria-label="Edit title">✏️</button>
      </div>
      <div class="detail-field editable" data-field="year">
        <span class="detail-field-label">Year:</span>
        <span class="detail-field-value">${movie.year}</span>
        <button class="edit-field-btn" aria-label="Edit year">✏️</button>
      </div>
      <div class="detail-field editable" data-field="genre">
        <span class="detail-field-label">Genre:</span>
        <span class="detail-field-value">${escapeHtml(movie.genre)}</span>
        <button class="edit-field-btn" aria-label="Edit genre">✏️</button>
      </div>
      <div class="detail-field editable" data-field="rating">
        <span class="detail-field-label">Rating:</span>
        <span class="detail-field-value">${movie.rating != null ? movie.rating + ' / 10' : 'Not rated'}</span>
        <button class="edit-field-btn" aria-label="Edit rating">✏️</button>
      </div>
      ${movie.imdbId || true ? `
      <div class="detail-field editable" data-field="imdbId">
        <span class="detail-field-label">IMDB ID:</span>
        <span class="detail-field-value">${movie.imdbId ? escapeHtml(movie.imdbId) : 'Not set'}</span>
        <button class="edit-field-btn" aria-label="Edit IMDB ID">✏️</button>
      </div>
      ` : ''}
      <div class="detail-field editable" data-field="posterUrl">
        <span class="detail-field-label">Poster URL:</span>
        <span class="detail-field-value">${movie.posterUrl ? escapeHtml(movie.posterUrl) : 'Not set'}</span>
        <button class="edit-field-btn" aria-label="Edit Poster URL">✏️</button>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Added:</span>
        <span class="detail-field-value">${formatDate(movie.createdAt)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Last Updated:</span>
        <span class="detail-field-value">${formatDate(movie.updatedAt)}</span>
      </div>
    </div>
    
    ${watchersHtml}
    
    ${notesHtml}
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotFound() {
  document.getElementById('movieDetail').classList.add('hidden');
  document.getElementById('notFound').classList.remove('hidden');
}

function init() {
  loadWatchers(); // Load watchers data
  const movieId = getMovieIdFromURL();
  
  if (!movieId) {
    showNotFound();
    return;
  }
  
  const movies = loadMovies();
  const movie = movies.find(m => m.id === movieId);
  
  if (!movie) {
    showNotFound();
    return;
  }
  
  // Update page title
  document.title = `${movie.title} - MovieDB`;
  
  renderMovieDetail(movie);
  setupInlineEditing(movie);
}

function setupInlineEditing(movie) {
  const container = document.getElementById('movieDetail');
  
  // Remove old listeners by cloning
  const newContainer = container.cloneNode(true);
  container.parentNode.replaceChild(newContainer, container);
  
  newContainer.addEventListener('click', (e) => {
    if (e.target.matches('.edit-field-btn')) {
      const fieldContainer = e.target.closest('.detail-field, .watchers-inner, .notes-inner');
      const fieldName = fieldContainer.dataset.field;
      
      if (fieldName === 'watchers') {
        enterWatchersEditMode(fieldContainer, movie);
      } else if (fieldName === 'notes') {
        enterNotesEditMode(fieldContainer, movie);
      } else {
        const valueSpan = fieldContainer.querySelector('.detail-field-value');
        enterEditMode(fieldContainer, fieldName, movie, valueSpan);
      }
    }
  });
}

function enterWatchersEditMode(sectionContainer, movie) {
  const watchersDisplay = sectionContainer.querySelector('.watchers-display');
  const editBtn = sectionContainer.querySelector('.edit-field-btn');
  const originalContent = watchersDisplay.innerHTML;
  
  editBtn.style.display = 'none';
  
  const watchers = getWatchers().sort((a, b) => {
    const nameA = getWatcherFullName(a).toLowerCase();
    const nameB = getWatcherFullName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  const currentWatcherIds = movie.watcherIds || [];
  
  let checkboxesHtml = '<div class="watchers-edit-container">';
  if (watchers.length === 0) {
    checkboxesHtml += '<p class="no-watchers-msg">No watchers available</p>';
  } else {
    watchers.forEach(w => {
      const checked = currentWatcherIds.includes(w.id) ? 'checked' : '';
      checkboxesHtml += `
        <label class="watcher-checkbox-label">
          <input type="checkbox" value="${w.id}" ${checked} />
          <span>${getWatcherFullName(w)}</span>
        </label>
      `;
    });
  }
  checkboxesHtml += '</div>';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.className = 'save-field-btn';
  saveBtn.setAttribute('aria-label', 'Save');
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.className = 'cancel-field-btn';
  cancelBtn.setAttribute('aria-label', 'Cancel');
  
  watchersDisplay.innerHTML = checkboxesHtml;
  watchersDisplay.appendChild(saveBtn);
  watchersDisplay.appendChild(cancelBtn);
  
  const save = async () => {
    const checkboxes = watchersDisplay.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    const { updateMovieInStore } = await import('./storage.js');
    const { updateMovie } = await import('./models.js');
    
    const updates = {
      ...movie,
      watcherIds: selectedIds
    };
    
    const updated = updateMovie(movie, updates);
    updateMovieInStore(movie.id, updated);
    
    Object.assign(movie, updated);
    renderMovieDetail(movie);
    setupInlineEditing(movie);
  };
  
  const cancel = () => {
    watchersDisplay.innerHTML = originalContent;
    editBtn.style.display = '';
  };
  
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
}

function enterNotesEditMode(sectionContainer, movie) {
  const notesDisplay = sectionContainer.querySelector('.notes-display');
  const editBtn = sectionContainer.querySelector('.edit-field-btn');
  const originalContent = notesDisplay.innerHTML;
  
  editBtn.style.display = 'none';
  
  const currentValue = movie.notes || '';
  
  const textarea = document.createElement('textarea');
  textarea.className = 'notes-field-input';
  textarea.value = currentValue;
  textarea.rows = 6;
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.className = 'save-field-btn';
  saveBtn.setAttribute('aria-label', 'Save');
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.className = 'cancel-field-btn';
  cancelBtn.setAttribute('aria-label', 'Cancel');
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '0.5rem';
  buttonContainer.style.marginTop = '0.5rem';
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(cancelBtn);
  
  notesDisplay.innerHTML = '';
  notesDisplay.appendChild(textarea);
  notesDisplay.appendChild(buttonContainer);
  
  textarea.focus();
  
  const save = async () => {
    const newValue = textarea.value.trim();
    
    const { updateMovieInStore } = await import('./storage.js');
    const { updateMovie } = await import('./models.js');
    
    const updates = {
      ...movie,
      notes: newValue
    };
    
    const updated = updateMovie(movie, updates);
    updateMovieInStore(movie.id, updated);
    
    Object.assign(movie, updated);
    renderMovieDetail(movie);
    setupInlineEditing(movie);
  };
  
  const cancel = () => {
    notesDisplay.innerHTML = originalContent;
    editBtn.style.display = '';
  };
  
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancel();
    }
  });
}

function enterEditMode(fieldContainer, fieldName, movie, valueSpan) {
  const currentValue = fieldName === 'rating' 
    ? (movie[fieldName] != null ? movie[fieldName] : '')
    : movie[fieldName];
  
  let input;
  if (fieldName === 'year') {
    input = document.createElement('input');
    input.type = 'number';
    input.min = 1888;
    input.max = 2100;
  } else if (fieldName === 'rating') {
    input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.max = 10;
    input.step = 0.1;
  } else if (fieldName === 'genre') {
    input = document.createElement('select');
    const genres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Fantasy', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Crime', 'Biography'];
    genres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      if (genre === currentValue) {
        option.selected = true;
      }
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = 'text';
  }
  
  if (fieldName !== 'genre') {
    input.value = currentValue;
  }
  input.className = 'detail-field-input';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.className = 'save-field-btn';
  saveBtn.setAttribute('aria-label', 'Save');
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.className = 'cancel-field-btn';
  cancelBtn.setAttribute('aria-label', 'Cancel');
  
  const originalContent = valueSpan.innerHTML;
  const editBtn = fieldContainer.querySelector('.edit-field-btn');
  editBtn.style.display = 'none';
  
  valueSpan.innerHTML = '';
  valueSpan.appendChild(input);
  valueSpan.appendChild(saveBtn);
  valueSpan.appendChild(cancelBtn);
  
  input.focus();
  if (fieldName !== 'genre') {
    input.select();
  }
  
  const save = async () => {
    const newValue = fieldName === 'genre' ? input.value : input.value.trim();
    
    // Validate
    if (fieldName === 'title' && !newValue) {
      alert('Title is required');
      return;
    }
    if (fieldName === 'year') {
      const year = Number(newValue);
      if (!year || year < 1888 || year > 2100) {
        alert('Year must be between 1888 and 2100');
        return;
      }
    }
    if (fieldName === 'rating' && newValue !== '') {
      const rating = Number(newValue);
      if (isNaN(rating) || rating < 0 || rating > 10) {
        alert('Rating must be between 0 and 10');
        return;
      }
    }
    if (fieldName === 'imdbId' && newValue !== '') {
      const imdbPattern = /^tt\d{7,8}$/;
      if (!imdbPattern.test(newValue)) {
        alert('IMDB ID must be in format: tt1234567 (tt followed by 7-8 digits)');
        return;
      }
    }
    
    // Import storage functions
    const { updateMovieInStore } = await import('./storage.js');
    const { updateMovie } = await import('./models.js');
    
    // Update movie
    const updates = {
      ...movie,
      [fieldName]: fieldName === 'year' || fieldName === 'rating' 
        ? (newValue === '' ? null : Number(newValue))
        : (newValue === '' ? '' : newValue)
    };
    
    const updated = updateMovie(movie, updates);
    updateMovieInStore(movie.id, updated);
    
    // Refresh display
    Object.assign(movie, updated);
    if (fieldName === 'title') {
      document.title = `${movie.title} - MovieDB`;
    }
    renderMovieDetail(movie);
    setupInlineEditing(movie);
  };
  
  const cancel = () => {
    valueSpan.innerHTML = originalContent;
    editBtn.style.display = '';
  };
  
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
