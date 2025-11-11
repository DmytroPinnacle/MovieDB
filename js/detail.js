// Movie detail page logic
import { loadMovies } from './storage.js';

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
  
  const imdbHtml = movie.imdbId && movie.imdbId.trim()
    ? `<a href="https://www.imdb.com/title/${movie.imdbId}/" target="_blank" rel="noopener" class="small">View on IMDB</a>`
    : '';
  
  const notesHtml = movie.notes && movie.notes.trim()
    ? `<div class="detail-section">
         <h3>Personal Notes</h3>
         <div class="detail-notes">${escapeHtml(movie.notes)}</div>
       </div>`
    : '';
  
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
          <a href="index.html" class="small secondary">Edit Movie</a>
          ${imdbHtml}
        </div>
      </div>
    </div>
    
    <div class="detail-section">
      <h3>Movie Information</h3>
      <div class="detail-field">
        <span class="detail-field-label">Title:</span>
        <span class="detail-field-value">${escapeHtml(movie.title)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Year:</span>
        <span class="detail-field-value">${movie.year}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Genre:</span>
        <span class="detail-field-value">${escapeHtml(movie.genre)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Rating:</span>
        <span class="detail-field-value">${movie.rating != null ? movie.rating + ' / 10' : 'Not rated'}</span>
      </div>
      ${movie.imdbId ? `
      <div class="detail-field">
        <span class="detail-field-label">IMDB ID:</span>
        <span class="detail-field-value">${escapeHtml(movie.imdbId)}</span>
      </div>
      ` : ''}
      <div class="detail-field">
        <span class="detail-field-label">Added:</span>
        <span class="detail-field-value">${formatDate(movie.createdAt)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Last Updated:</span>
        <span class="detail-field-value">${formatDate(movie.updatedAt)}</span>
      </div>
    </div>
    
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
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
