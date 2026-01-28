import { getLists, addMovieToList, removeMovieFromList, loadLists } from './list-storage.js';
import { getMovies, loadMovies } from './storage.js';
import { loadSessions, getLatestSessionByMovieId, getSessionsByMovieId } from './session-storage.js';
import { loadWatchers, isFavorite } from './watcher-storage.js';
import { qs } from './ui.js';
import { initializeSeedData } from './DataSeed/initializer.js';

let currentListId = null;
let currentList = null;
let allMovies = [];

async function init() {
  const params = new URLSearchParams(window.location.search);
  currentListId = params.get('id');
  
  if (!currentListId) {
    window.location.href = 'lists.html';
    return;
  }

  await initializeSeedData();
  await Promise.all([
      loadMovies(),
      loadSessions(),
      loadWatchers(),
      loadLists()
  ]);
  
  allMovies = getMovies();
  const lists = getLists();
  currentList = lists.find(l => l.id === currentListId);
  
  if (!currentList) {
    alert('List not found');
    window.location.href = 'lists.html';
    return;
  }
  
  renderHeader();
  renderItems();
  wireEvents();
}

function renderHeader() {
  qs('#listName').textContent = currentList.name;
  qs('#listDesc').textContent = currentList.description || '';
  const count = currentList.movieIds ? currentList.movieIds.length : 0;
  qs('#itemCount').textContent = `${count} items`;
}

function renderItems() {
  const listEl = qs('#listItems');
  const tableBody = qs('#movieTableBody');
  const container = listEl || tableBody;
  const emptyState = qs('#emptyState'); // From new HTML structure

  if (container) container.innerHTML = '';
  if (emptyState) emptyState.classList.add('hidden');
  
  if (!currentList.movieIds || currentList.movieIds.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
    } else if (container) {
      container.innerHTML = '<div class="text-center text-muted py-5">This list is empty. Add movies!</div>';
    }
    return;
  }

  if (!container) return;

  
  // Get movie objects
  const listMovies = currentList.movieIds
    .map(id => allMovies.find(m => m.id === id))
    .filter(Boolean);
    
  // Sort? Default to added order (reversed) for now
  // listMovies.reverse(); 

  listMovies.forEach(movie => {
     const item = createListItem(movie);
     container.appendChild(item);
  });
}

function createListItem(movie) {
  const tr = document.createElement('tr');
  tr.dataset.movieId = movie.id;
  
  const posterUrl = movie.posterUrl && movie.posterUrl !== 'N/A' ? movie.posterUrl : 'https://placehold.co/100x150?text=No+Poster';
  
  // Calculate average rating from sessions (if any)
  const sessions = getSessionsByMovieId(movie.id);
  let avgRating = '-';
  let avgRatingClass = ''; // default gray
  
  if (sessions.length > 0) {
      let totalRating = 0;
      let count = 0;
      sessions.forEach(s => {
          if (s.watcherRatings) {
              Object.values(s.watcherRatings).forEach(r => {
                  if (r) {
                      totalRating += Number(r);
                      count++;
                  }
              });
          }
      });
      if (count > 0) {
          const avg = totalRating / count;
          avgRating = avg.toFixed(1);
          if (avg >= 7.5) avgRatingClass = 'high';
          else if (avg >= 5) avgRatingClass = 'med';
          else avgRatingClass = 'low';
      }
  }

  // Last watched
  const latestSession = getLatestSessionByMovieId(movie.id);
  const lastWatched = latestSession ? new Date(latestSession.watchedDate).toLocaleDateString() : '-';
  
  // Movie Rating (OMDb) formatting
  const rating = parseFloat(movie.rating) || 0;
  let ratingClass = 'low';
  if (rating >= 7.5) ratingClass = 'high';
  else if (rating >= 6) ratingClass = 'med';

  tr.innerHTML = `
    <td class="col-poster">
      <img src="${posterUrl}" class="table-poster" alt="Poster">
    </td>
    <td>
      <a href="detail.html?id=${movie.id}" style="color: white; text-decoration: none; font-weight: 500;">
        ${movie.title}
      </a>
    </td>
    <td style="color: var(--muted);">${movie.year}</td>
    <td>
      ${movie.rating && movie.rating !== 'N/A' 
         ? `<span class="rating-badge ${ratingClass}">${movie.rating}</span>` 
         : '<span class="text-muted">-</span>'}
    </td>
    <td>
       <span class="rating-badge ${avgRatingClass}">${avgRating}</span>
    </td>
    <td style="color: var(--muted);">${lastWatched}</td>
    <td class="col-actions">
        <button class="remove-btn" title="Remove from list" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 1.1rem; padding: 0.25rem;">
            🗑️
        </button>
    </td>
  `;
  
  tr.querySelector('.remove-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    removeItem(movie.id);
  });
  
  return tr;
}

async function removeItem(movieId) {
  if (confirm('Remove movie from list?')) {
    await removeMovieFromList(currentListId, movieId); // Async wait
    // Reload list data
    const lists = getLists(); // This should be updated by removeMovieFromList internally in repo
    currentList = lists.find(l => l.id === currentListId);
    renderHeader();
    renderItems();
  }
}

function wireEvents() {
  const input = qs('#addMovieInput');
  const dropdown = qs('#autocompleteDropdown');
  
  if (input) {
    input.addEventListener('input', (e) => handleSearch(e, dropdown));
    input.addEventListener('focus', (e) => {
        if (e.target.value.length >= 2) handleSearch(e, dropdown);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-movie-container')) {
            dropdown.classList.add('hidden');
        }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') dropdown.classList.add('hidden');
    });
  }
}

function handleSearch(e, dropdown) {
  const term = e.target.value.toLowerCase();
  dropdown.innerHTML = '';
  
  if (term.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }
  
  const matches = allMovies.filter(m => 
    !currentList.movieIds.includes(m.id) && 
    m.title.toLowerCase().includes(term)
  );
  
  if (matches.length === 0) {
      dropdown.classList.add('hidden');
      return;
  }
  
  dropdown.classList.remove('hidden');
  
  matches.slice(0, 10).forEach(movie => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    const posterUrl = movie.posterUrl && movie.posterUrl !== 'N/A' ? movie.posterUrl : 'https://placehold.co/100x150?text=No+Poster';
    
    div.innerHTML = `
      <img src="${posterUrl}" class="autocomplete-poster">
      <div>
        <div style="font-weight: 500;">${movie.title}</div>
        <div class="small text-muted">${movie.year}</div>
      </div>
    `;
    
    div.addEventListener('click', () => addItem(movie.id));
    dropdown.appendChild(div);
  });
}

async function addItem(movieId) {
  await addMovieToList(currentListId, movieId); 
  qs('#addMovieInput').value = '';
  qs('#autocompleteDropdown').classList.add('hidden');
  
  // Update local ref
  const lists = getLists();
  currentList = lists.find(l => l.id === currentListId);
  renderHeader();
  renderItems();
}

document.addEventListener('DOMContentLoaded', init);
