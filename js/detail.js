// Movie detail page logic
import { loadMovies } from './storage.js';
import { loadWatchers, getWatcherById, getWatchers } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';
import { loadSessions, getSessionsByMovieId, addSession, updateSessionInStore, deleteSession } from './session-storage.js';
import { createSession, validateSessionFields, updateSession, dateStringToTimestamp } from './session-models.js';

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
    
    ${renderSessionsSection(movie.id)}
    
    ${notesHtml}
  `;
}

function renderSessionsSection(movieId) {
  const sessions = getSessionsByMovieId(movieId);
  
  const sessionsListHtml = sessions.length > 0
    ? sessions.map(session => {
        const watcherNames = (session.watcherIds || [])
          .map(id => getWatcherById(id))
          .filter(Boolean)
          .map(w => getWatcherFullName(w));
        
        // Format date from timestamp (date only, no time)
        const sessionDate = new Date(session.watchedDate);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        return `
          <div class="session-item" data-session-id="${session.id}">
            <div class="session-header">
              <span class="session-date">📅 ${formattedDate}</span>
              <span class="session-watchers">👤 ${watcherNames.join(', ')}</span>
              <div class="session-actions">
                <button class="small edit-session-btn" aria-label="Edit session">Edit</button>
                <button class="small danger delete-session-btn" aria-label="Delete session">Delete</button>
              </div>
            </div>
            ${session.notes ? `<div class="session-notes">${escapeHtml(session.notes)}</div>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="no-sessions-msg">No watching sessions recorded</p>';
  
  return `
    <div class="detail-section sessions-section-detail">
      <div class="sessions-header">
        <h3>Watching Sessions</h3>
        <button class="small primary add-session-btn">Add Session</button>
      </div>
      <div class="sessions-list">
        ${sessionsListHtml}
      </div>
      <div class="session-form-container hidden">
        <form class="session-form" id="sessionForm">
          <input type="hidden" id="sessionId" />
          <div class="field">
            <label for="sessionDate">Watch Date</label>
            <input type="date" id="sessionDate" name="watchedDate" required />
            <small class="error" data-error-for="watchedDate"></small>
          </div>
          <div class="field">
            <span id="sessionWatchersLabel" class="field-label">Watchers</span>
            <div id="sessionWatcherCheckboxes" class="watcher-checkboxes" role="group" aria-labelledby="sessionWatchersLabel">
              <!-- Populated by JS -->
            </div>
            <small class="error" data-error-for="watcherIds"></small>
          </div>
          <div class="field">
            <label for="sessionNotes">Session Notes (optional)</label>
            <textarea id="sessionNotes" name="notes" rows="3" maxlength="1000"></textarea>
            <small class="help">Personal notes about this watching session (max 1000 chars)</small>
            <small class="error" data-error-for="notes"></small>
          </div>
          <div class="actions">
            <button type="submit" class="primary save-session-btn">Save Session</button>
            <button type="button" class="secondary cancel-session-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function showSessionForm(movieId, session = null) {
  const container = document.querySelector('.session-form-container');
  const form = document.getElementById('sessionForm');
  const sessionIdInput = document.getElementById('sessionId');
  const dateInput = document.getElementById('sessionDate');
  const notesInput = document.getElementById('sessionNotes');
  
  container.classList.remove('hidden');
  
  if (session) {
    // Edit mode
    sessionIdInput.value = session.id;
    // Convert timestamp to YYYY-MM-DD for date input
    const sessionDate = new Date(session.watchedDate);
    const year = sessionDate.getFullYear();
    const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const day = String(sessionDate.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    notesInput.value = session.notes || '';
    populateSessionWatcherCheckboxes(session.watcherIds || []);
    container.querySelector('.save-session-btn').textContent = 'Update Session';
  } else {
    // Add mode
    form.reset();
    sessionIdInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    populateSessionWatcherCheckboxes([]);
    container.querySelector('.save-session-btn').textContent = 'Save Session';
  }
  
  // Scroll to form
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  dateInput.focus();
}

function hideSessionForm() {
  const container = document.querySelector('.session-form-container');
  container.classList.add('hidden');
  clearSessionFormErrors();
}

function populateSessionWatcherCheckboxes(selectedIds = []) {
  const container = document.getElementById('sessionWatcherCheckboxes');
  const watchers = getWatchers().sort((a, b) => {
    const nameA = getWatcherFullName(a).toLowerCase();
    const nameB = getWatcherFullName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  if (watchers.length === 0) {
    container.innerHTML = '<span class="no-watchers">No watchers available</span>';
    return;
  }
  
  container.innerHTML = watchers.map(w => {
    const checked = selectedIds.includes(w.id) ? 'checked' : '';
    return `
      <label class="watcher-checkbox-label">
        <input type="checkbox" name="sessionWatcherIds" value="${w.id}" ${checked} />
        <span>${escapeHtml(getWatcherFullName(w))}</span>
      </label>
    `;
  }).join('');
}

function handleSessionSubmit(movie) {
  const form = document.getElementById('sessionForm');
  const formData = new FormData(form);
  
  // Convert date string to timestamp using helper function
  const dateString = formData.get('watchedDate');
  const watchedDate = dateStringToTimestamp(dateString);
  
  const fields = {
    movieId: movie.id,
    watchedDate: watchedDate,
    watcherIds: formData.getAll('sessionWatcherIds'),
    notes: formData.get('notes') || ''
  };
  
  const errors = validateSessionFields(fields);
  showSessionFormErrors(errors);
  if (Object.keys(errors).length) return;
  
  const sessionId = document.getElementById('sessionId').value;
  
  if (sessionId) {
    // Update existing session
    const existing = getSessionsByMovieId(movie.id).find(s => s.id === sessionId);
    if (existing) {
      const updated = updateSession(existing, fields);
      updateSessionInStore(sessionId, updated);
    }
  } else {
    // Create new session
    const session = createSession(fields);
    addSession(session);
  }
  
  hideSessionForm();
  renderMovieDetail(movie);
  setupInlineEditing(movie);
}

function showSessionFormErrors(errors) {
  clearSessionFormErrors();
  Object.entries(errors).forEach(([field, msg]) => {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = msg;
  });
}

function clearSessionFormErrors() {
  document.querySelectorAll('.session-form-container .error').forEach(el => el.textContent = '');
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
  loadSessions(); // Load sessions data
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
    
    // Session events
    if (e.target.matches('.add-session-btn')) {
      showSessionForm(movie.id);
    }
    
    if (e.target.matches('.edit-session-btn')) {
      const sessionItem = e.target.closest('.session-item');
      if (sessionItem) {
        const sessionId = sessionItem.dataset.sessionId;
        const session = getSessionsByMovieId(movie.id).find(s => s.id === sessionId);
        if (session) showSessionForm(movie.id, session);
      }
    }
    
    if (e.target.matches('.delete-session-btn')) {
      const sessionItem = e.target.closest('.session-item');
      if (sessionItem) {
        const sessionId = sessionItem.dataset.sessionId;
        if (confirm('Delete this watching session?')) {
          deleteSession(sessionId);
          renderMovieDetail(movie);
          setupInlineEditing(movie);
        }
      }
    }
    
    if (e.target.matches('.cancel-session-btn')) {
      hideSessionForm();
    }
  });
  
  // Session form submit
  const sessionForm = newContainer.querySelector('#sessionForm');
  if (sessionForm) {
    sessionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSessionSubmit(movie);
    });
  }
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
