import { getLists, addMovieToList, removeMovieFromList } from './list-storage.js';
import { getMovies, loadMovies } from './storage.js';
import { loadSessions, getLatestSessionByMovieId, getSessionsByMovieId } from './session-storage.js';
import { loadWatchers, isFavorite } from './watcher-storage.js';
import { qs } from './ui.js';

let currentListId = null;
let currentList = null;
let allMovies = [];

function init() {
  const params = new URLSearchParams(window.location.search);
  currentListId = params.get('id');
  
  if (!currentListId) {
    window.location.href = 'lists.html';
    return;
  }

  loadMovies();
  loadSessions();
  loadWatchers();
  
  allMovies = getMovies();
  const lists = getLists();
  currentList = lists.find(l => l.id === currentListId);
  
  if (!currentList) {
    alert('List not found');
    window.location.href = 'lists.html';
    return;
  }

  renderHeader();
  renderTable();
  wireEvents();
}

function renderHeader() {
  qs('#listName').textContent = currentList.name;
  qs('#listMeta').textContent = `${currentList.movieIds.length} movies`;
  document.title = `${currentList.name} - MovieDB`;
}

function getListMovies() {
  return allMovies.filter(m => currentList.movieIds.includes(m.id)).map(m => {
    const sessions = getSessionsByMovieId(m.id);
    const latestSession = getLatestSessionByMovieId(m.id);
    
    // 1. Calculate Avg Watcher Rating (Favorites only, latest rating per watcher)
    let avgRating = 0;
    let ratingCount = 0;
    
    // Map watcherId -> rating (from latest session)
    const latestRatings = new Map();
    
    // Sort sessions newest first to find latest rating easily
    const sortedSessions = [...sessions].sort((a, b) => b.watchedDate - a.watchedDate);
    
    sortedSessions.forEach(session => {
      if (!session.watcherRatings) return;
      Object.entries(session.watcherRatings).forEach(([wId, rating]) => {
        if (isFavorite(wId) && !latestRatings.has(wId)) {
          const r = Number(rating);
          if (!isNaN(r)) {
            latestRatings.set(wId, r);
          }
        }
      });
    });

    if (latestRatings.size > 0) {
      let sum = 0;
      latestRatings.forEach(r => sum += r);
      avgRating = sum / latestRatings.size;
      ratingCount = latestRatings.size;
    }

    // 2. Calculate Watched Times (Sessions with at least one favorite watcher)
    const watchedTimes = sessions.filter(s => 
      s.watcherIds && s.watcherIds.some(wId => isFavorite(wId))
    ).length;

    // 3. Calculate Number of Watchers (Unique favorite watchers)
    const uniqueWatchers = new Set();
    sessions.forEach(s => {
      if (s.watcherIds) {
        s.watcherIds.forEach(wId => {
          if (isFavorite(wId)) uniqueWatchers.add(wId);
        });
      }
    });
    const watchersCount = uniqueWatchers.size;

    return {
      ...m,
      lastWatched: latestSession ? latestSession.watchedDate : null,
      avgWatcherRating: avgRating,
      ratingCount,
      watchedTimes,
      watchersCount
    };
  });
}

function renderTable() {
  const tbody = qs('#movieTableBody');
  const emptyState = qs('#emptyState');
  const sortMode = qs('#sortSelect').value;
  
  let movies = getListMovies();

  if (movies.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Sorting
  movies.sort((a, b) => {
    switch (sortMode) {
      case 'watched-desc':
        if (a.lastWatched && b.lastWatched) return b.lastWatched - a.lastWatched;
        if (a.lastWatched) return -1;
        if (b.lastWatched) return 1;
        return 0;
      case 'watched-asc':
        if (a.lastWatched && b.lastWatched) return a.lastWatched - b.lastWatched;
        if (a.lastWatched) return -1;
        if (b.lastWatched) return 1;
        return 0;
      
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      
      case 'year-desc':
        return b.year - a.year;
      case 'year-asc':
        return a.year - b.year;
      
      case 'rating-desc':
        return (b.rating || 0) - (a.rating || 0);
      case 'rating-asc':
        return (a.rating || 0) - (b.rating || 0);
      
      case 'avg-rating-desc':
        return b.avgWatcherRating - a.avgWatcherRating;
      case 'avg-rating-asc':
        return a.avgWatcherRating - b.avgWatcherRating;
      
      case 'watchers-count-desc':
        return b.watchersCount - a.watchersCount;
      case 'watchers-count-asc':
        return a.watchersCount - b.watchersCount;
      
      case 'watched-times-desc':
        return b.watchedTimes - a.watchedTimes;
      case 'watched-times-asc':
        return a.watchedTimes - b.watchedTimes;

      default:
        return 0;
    }
  });

  tbody.innerHTML = movies.map(m => `
    <tr>
      <td class="col-poster">
        ${m.posterUrl ? `<img src="${m.posterUrl}" class="table-poster" alt="${m.title}">` : '<div class="table-poster"></div>'}
      </td>
      <td>
        <a href="detail.html?id=${m.id}" class="title-link" style="font-weight: 600;">${m.title}</a>
      </td>
      <td>${m.year}</td>
      <td>${renderRatingBadge(m.rating)}</td>
      <td>${m.avgWatcherRating > 0 ? m.avgWatcherRating.toFixed(1) : '-'}</td>
      <td>${m.lastWatched ? new Date(m.lastWatched).toLocaleDateString() : '<span style="color:var(--muted)">-</span>'}</td>
      <td class="col-actions">
        <button class="icon-btn danger remove-btn" data-id="${m.id}" title="Remove from list">&times;</button>
      </td>
    </tr>
  `).join('');

  // Wire remove buttons
  tbody.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const movieId = btn.dataset.id;
      if (confirm('Remove this movie from the list?')) {
        removeMovieFromList(currentListId, movieId);
        // Refresh data
        const lists = getLists();
        currentList = lists.find(l => l.id === currentListId);
        renderHeader();
        renderTable();
      }
    });
  });
}

function renderRatingBadge(rating) {
  if (rating == null) return '-';
  let cls = 'low';
  if (rating >= 7) cls = 'high';
  else if (rating >= 5) cls = 'med';
  return `<span class="rating-badge ${cls}">${rating}</span>`;
}

function wireEvents() {
  qs('#sortSelect').addEventListener('change', renderTable);

  // Autocomplete
  const input = qs('#addMovieInput');
  const dropdown = qs('#autocompleteDropdown');

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    if (term.length < 1) {
      dropdown.classList.add('hidden');
      return;
    }

    // Filter movies: matches title AND not already in list
    const matches = allMovies.filter(m => 
      m.title.toLowerCase().includes(term) && 
      !currentList.movieIds.includes(m.id)
    ).slice(0, 10); // Limit to 10

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="autocomplete-item" style="cursor:default; color:var(--muted)">No matches found</div>';
    } else {
      dropdown.innerHTML = matches.map(m => `
        <div class="autocomplete-item" data-id="${m.id}">
          ${m.posterUrl ? `<img src="${m.posterUrl}" class="autocomplete-poster">` : '<div class="autocomplete-poster"></div>'}
          <div>
            <div style="font-weight:500">${m.title}</div>
            <div style="font-size:0.8rem; color:var(--muted)">${m.year}</div>
          </div>
        </div>
      `).join('');
    }
    dropdown.classList.remove('hidden');
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Select item
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (item && item.dataset.id) {
      const movieId = item.dataset.id;
      addMovieToList(currentListId, movieId);
      
      // Refresh
      const lists = getLists();
      currentList = lists.find(l => l.id === currentListId);
      
      input.value = '';
      dropdown.classList.add('hidden');
      renderHeader();
      renderTable();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
