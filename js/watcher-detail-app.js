// Watcher Detail Page Application
console.log('=== Watcher Detail App Starting ===');

import { getWatcherById } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';
import { getSessionsByWatcherId, getWatchedMovieIdsByWatcherId } from './session-storage.js';
import { loadMovies } from './storage.js';

console.log('All imports successful');

// Get watcher ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const watcherId = urlParams.get('id');

console.log('Watcher ID from URL:', watcherId);

// Global state
let watcher = null;
let allSessions = [];
let filteredSessions = [];
let allMovies = [];
let watchedMovies = [];
let carouselPosition = 0;

// DOM elements
const watcherNameEl = document.getElementById('watcherName');
const avatarInitialsEl = document.getElementById('avatarInitials');
const sessionCountEl = document.getElementById('sessionCount');
const movieCountEl = document.getElementById('movieCount');
const filteredCountEl = document.getElementById('filteredCount');
const sessionsListEl = document.getElementById('sessionsList');
const carouselTrackEl = document.getElementById('carouselTrack');
const carouselEmptyEl = document.getElementById('carouselEmpty');
const carouselPrevBtn = document.getElementById('carouselPrev');
const carouselNextBtn = document.getElementById('carouselNext');
const watchedDateRangeBtn = document.getElementById('watchedDateRangeBtn');
const releaseYearRangeBtn = document.getElementById('releaseYearRangeBtn');
const sortOrderEl = document.getElementById('sortOrder');
const clearFiltersBtn = document.getElementById('clearFilters');

// Range selector elements
const watchedDateRangePopup = document.getElementById('watchedDateRangePopup');
const watchedDateRangeDisplay = document.getElementById('watchedDateRangeDisplay');
const watchedDateRangeApply = document.getElementById('watchedDateRangeApply');
const watchedDateRangeReset = document.getElementById('watchedDateRangeReset');

const yearRangeStart = document.getElementById('yearRangeStart');
const yearRangeEnd = document.getElementById('yearRangeEnd');
const yearRangeProgress = document.getElementById('yearRangeProgress');
const yearRangeLabels = document.getElementById('yearRangeLabels');

const monthRangeStart = document.getElementById('monthRangeStart');
const monthRangeEnd = document.getElementById('monthRangeEnd');
const monthRangeProgress = document.getElementById('monthRangeProgress');
const monthRangeLabels = document.getElementById('monthRangeLabels');

const movieYearRangePopup = document.getElementById('movieYearRangePopup');
const movieYearRangeStart = document.getElementById('movieYearRangeStart');
const movieYearRangeEnd = document.getElementById('movieYearRangeEnd');
const movieYearRangeDisplay = document.getElementById('movieYearRangeDisplay');
const movieYearRangeProgress = document.getElementById('movieYearRangeProgress');
const movieYearRangeLabels = document.getElementById('movieYearRangeLabels');
const movieYearRangeApply = document.getElementById('movieYearRangeApply');
const movieYearRangeReset = document.getElementById('movieYearRangeReset');

// Filter state
let yearFrom = new Date().getFullYear();
let yearTo = new Date().getFullYear();
let monthFrom = 0;
let monthTo = 11;
let movieYearFrom = null;
let movieYearTo = null;

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Initialize the page
function init() {
  console.log('init() called');
  try {
    console.log('watcherId:', watcherId);
    if (!watcherId) {
      console.log('No watcher ID provided');
      showError('No watcher ID provided');
      return;
    }

    // Load data
    console.log('Attempting to get watcher by ID...');
    console.log('Type of watcherId:', typeof watcherId);
    console.log('watcherId value:', watcherId);
    watcher = getWatcherById(watcherId);
    console.log('Watcher found:', watcher);
    
    if (!watcher) {
      console.log('Watcher not found in storage');
      showError('Watcher not found');
      return;
    }

    console.log('Loading movies...');
    allMovies = loadMovies();
    console.log('Loaded movies:', allMovies.length);
    
    console.log('Loading sessions for watcher...');
    allSessions = getSessionsByWatcherId(watcherId);
    console.log('Loaded sessions for watcher:', allSessions.length, allSessions);
    
    // Enrich sessions with movie data
    allSessions = allSessions.map(session => ({
      ...session,
      movie: allMovies.find(m => m.id === session.movieId)
    }));

    // Get unique watched movies
    const watchedMovieIds = getWatchedMovieIdsByWatcherId(watcherId);
    console.log('Watched movie IDs:', watchedMovieIds);
    
    watchedMovies = watchedMovieIds
      .map(id => allMovies.find(m => m.id === id))
      .filter(Boolean);

    console.log('Watched movies:', watchedMovies.length);

    // Display watcher info
    console.log('Displaying watcher info...');
    displayWatcherInfo();

    // Populate year filter
    console.log('Populating year filter...');
    populateYearFilter();

    // Apply initial filters and display
    console.log('Applying filters...');
    applyFilters();

    // Display carousel
    console.log('Displaying carousel...');
    displayCarousel();

    // Attach event listeners
    console.log('Attaching event listeners...');
    attachEventListeners();
    
    console.log('Initialization complete!');
  } catch (error) {
    console.error('Error initializing watcher detail page:', error);
    console.error('Error stack:', error.stack);
    showError('Error loading watcher details: ' + error.message);
  }
}

function displayWatcherInfo() {
  const fullName = getWatcherFullName(watcher);
  watcherNameEl.textContent = fullName;
  
  // Create initials for avatar
  const initials = watcher.firstName.charAt(0).toUpperCase() + 
    (watcher.lastName ? watcher.lastName.charAt(0).toUpperCase() : '');
  avatarInitialsEl.textContent = initials;

  // Update stats
  const uniqueMovies = new Set(allSessions.map(s => s.movieId));
  sessionCountEl.textContent = `${allSessions.length} ${allSessions.length === 1 ? 'session' : 'sessions'}`;
  movieCountEl.textContent = `${uniqueMovies.size} ${uniqueMovies.size === 1 ? 'movie' : 'movies'}`;
}

function populateYearFilter() {
  const years = new Set();
  const movieYears = new Set();
  
  allSessions.forEach(session => {
    const date = new Date(session.watchedDate);
    years.add(date.getFullYear());
    if (session.movie && session.movie.year) {
      movieYears.add(session.movie.year);
    }
  });

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const sortedMovieYears = Array.from(movieYears).sort((a, b) => a - b);
  const currentYear = new Date().getFullYear();
  
  // Setup watched year range
  if (sortedYears.length > 0) {
    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];
    
    yearRangeStart.min = minYear;
    yearRangeStart.max = maxYear;
    yearRangeEnd.min = minYear;
    yearRangeEnd.max = maxYear;
    
    if (sortedYears.includes(currentYear)) {
      yearFrom = currentYear;
      yearTo = currentYear;
    } else {
      yearFrom = maxYear;
      yearTo = maxYear;
    }
    
    yearRangeStart.value = yearFrom;
    yearRangeEnd.value = yearTo;
    updateYearRangeDisplay();
    createYearLabels(minYear, maxYear, yearRangeLabels);
  }
  
  // Setup movie year range
  if (sortedMovieYears.length > 0) {
    const minMovieYear = sortedMovieYears[0];
    const maxMovieYear = sortedMovieYears[sortedMovieYears.length - 1];
    
    movieYearRangeStart.min = minMovieYear;
    movieYearRangeStart.max = maxMovieYear;
    movieYearRangeEnd.min = minMovieYear;
    movieYearRangeEnd.max = maxMovieYear;
    
    movieYearFrom = minMovieYear;
    movieYearTo = maxMovieYear;
    
    movieYearRangeStart.value = movieYearFrom;
    movieYearRangeEnd.value = movieYearTo;
    updateMovieYearRangeDisplay();
    createYearLabels(minMovieYear, maxMovieYear, movieYearRangeLabels);
  }
  
  // Create month labels
  createMonthLabels();
  
  updateWatchedDateButton();
  updateReleaseYearButton();
}

function createYearLabels(min, max, container) {
  const range = max - min;
  const step = range <= 5 ? 1 : Math.ceil(range / 5);
  container.innerHTML = '';
  
  for (let year = min; year <= max; year += step) {
    const label = document.createElement('span');
    label.textContent = year;
    container.appendChild(label);
  }
  
  // Always add the last year if not included
  if ((max - min) % step !== 0) {
    const label = document.createElement('span');
    label.textContent = max;
    container.appendChild(label);
  }
}

function createMonthLabels() {
  monthRangeLabels.innerHTML = '';
  const monthAbbr = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  monthAbbr.forEach(abbr => {
    const label = document.createElement('span');
    label.textContent = abbr;
    monthRangeLabels.appendChild(label);
  });
}

function applyFilters() {
  const sortOrder = sortOrderEl.value;

  // Filter sessions
  filteredSessions = allSessions.filter(session => {
    const date = new Date(session.watchedDate);
    const sessionYear = date.getFullYear();
    const sessionMonth = date.getMonth();
    
    // Check year range
    if (sessionYear < yearFrom || sessionYear > yearTo) {
      return false;
    }
    
    // If same year, check month range
    if (sessionYear === yearFrom && sessionYear === yearTo) {
      // Within same year
      if (sessionMonth < monthFrom || sessionMonth > monthTo) {
        return false;
      }
    } else if (sessionYear === yearFrom) {
      // Start year - check if month is >= monthFrom
      if (sessionMonth < monthFrom) {
        return false;
      }
    } else if (sessionYear === yearTo) {
      // End year - check if month is <= monthTo
      if (sessionMonth > monthTo) {
        return false;
      }
    }
    
    // Check movie year range
    if (movieYearFrom !== null && movieYearTo !== null) {
      const movieYear = session.movie ? session.movie.year : null;
      if (movieYear && (movieYear < movieYearFrom || movieYear > movieYearTo)) {
        return false;
      }
    }
    
    return true;
  });

  // Sort sessions
  filteredSessions.sort((a, b) => {
    return sortOrder === 'desc' 
      ? b.watchedDate - a.watchedDate 
      : a.watchedDate - b.watchedDate;
  });

  // Update filtered count
  filteredCountEl.textContent = `${filteredSessions.length} ${filteredSessions.length === 1 ? 'session' : 'sessions'}`;

  // Display sessions
  displaySessions();
}

function displaySessions() {
  if (filteredSessions.length === 0) {
    sessionsListEl.innerHTML = '<p class="empty-message">No sessions match your filters.</p>';
    return;
  }

  sessionsListEl.innerHTML = '';
  
  filteredSessions.forEach(session => {
    const card = createSessionCard(session);
    sessionsListEl.appendChild(card);
  });
}

function createSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';
  
  const movie = session.movie;
  const movieTitle = movie ? movie.title : 'Unknown Movie';
  const movieYear = movie ? ` (${movie.year})` : '';
  const movieGenre = movie ? movie.genre : '';
  
  const watchedDate = new Date(session.watchedDate);
  const dateString = watchedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Get watcher's rating for this session
  const rating = session.watcherRatings && session.watcherRatings[watcherId];
  
  card.innerHTML = `
    <div class="session-header">
      <h3 class="session-movie-title">${movieTitle}${movieYear}</h3>
      <span class="session-date">${dateString}</span>
    </div>
    <div class="session-details">
      ${movieGenre ? `<span class="session-detail-item"><span class="icon">🎭</span> ${movieGenre}</span>` : ''}
      ${rating ? `<span class="session-detail-item"><span class="icon">⭐</span> <span class="session-rating">${rating}/10</span></span>` : ''}
      ${session.watcherIds.length > 1 ? `<span class="session-detail-item"><span class="icon">👥</span> ${session.watcherIds.length} watchers</span>` : ''}
    </div>
    ${session.notes ? `<div class="session-notes">"${session.notes}"</div>` : ''}
  `;

  // Make card clickable to go to movie detail
  if (movie) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      window.location.href = `detail.html?id=${movie.id}`;
    });
  }

  return card;
}

function displayCarousel() {
  if (watchedMovies.length === 0) {
    carouselTrackEl.innerHTML = '';
    carouselEmptyEl.classList.remove('hidden');
    carouselPrevBtn.disabled = true;
    carouselNextBtn.disabled = true;
    return;
  }

  carouselEmptyEl.classList.add('hidden');
  carouselTrackEl.innerHTML = '';

  watchedMovies.forEach(movie => {
    const item = createCarouselItem(movie);
    carouselTrackEl.appendChild(item);
  });

  updateCarouselButtons();
}

function createCarouselItem(movie) {
  const item = document.createElement('div');
  item.className = 'carousel-item';

  const poster = movie.posterUrl 
    ? `<img src="${movie.posterUrl}" alt="${movie.title}" class="carousel-poster" />`
    : `<div class="carousel-placeholder">🎬</div>`;

  item.innerHTML = `
    ${poster}
    <div class="carousel-title">${movie.title}</div>
  `;

  item.addEventListener('click', () => {
    window.location.href = `detail.html?id=${movie.id}`;
  });

  return item;
}

function scrollCarousel(direction) {
  const itemWidth = 150 + 16; // width + gap
  const containerWidth = carouselTrackEl.parentElement.offsetWidth;
  const maxScroll = Math.max(0, (watchedMovies.length * itemWidth) - containerWidth);
  
  if (direction === 'next') {
    carouselPosition = Math.min(carouselPosition + itemWidth * 3, maxScroll);
  } else {
    carouselPosition = Math.max(carouselPosition - itemWidth * 3, 0);
  }

  carouselTrackEl.style.transform = `translateX(-${carouselPosition}px)`;
  updateCarouselButtons();
}

function updateCarouselButtons() {
  const itemWidth = 150 + 16;
  const containerWidth = carouselTrackEl.parentElement.offsetWidth;
  const maxScroll = Math.max(0, (watchedMovies.length * itemWidth) - containerWidth);

  carouselPrevBtn.disabled = carouselPosition <= 0;
  carouselNextBtn.disabled = carouselPosition >= maxScroll;
}

function clearFilters() {
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set(allSessions.map(s => new Date(s.watchedDate).getFullYear()))).sort((a, b) => a - b);
  
  if (years.includes(currentYear)) {
    yearFrom = currentYear;
    yearTo = currentYear;
  } else if (years.length > 0) {
    const latestYear = years[years.length - 1];
    yearFrom = latestYear;
    yearTo = latestYear;
  }
  
  monthFrom = 0;
  monthTo = 11;
  
  yearRangeStart.value = yearFrom;
  yearRangeEnd.value = yearTo;
  monthRangeStart.value = monthFrom;
  monthRangeEnd.value = monthTo;
  
  updateWatchedDateButton();
  sortOrderEl.value = 'desc';
  applyFilters();
}

// Range selector functions
function updateWatchedDateRangeDisplay() {
  updateYearRangeDisplay();
  updateMonthRangeDisplay();
  updateWatchedDateButton();
}

function updateYearRangeDisplay() {
  const start = parseInt(yearRangeStart.value);
  const end = parseInt(yearRangeEnd.value);
  const min = parseInt(yearRangeStart.min);
  const max = parseInt(yearRangeStart.max);
  
  // Update progress bar only (no text display)
  const range = max - min;
  const leftPercent = ((Math.min(start, end) - min) / range) * 100;
  const rightPercent = ((max - Math.max(start, end)) / range) * 100;
  yearRangeProgress.style.left = leftPercent + '%';
  yearRangeProgress.style.right = rightPercent + '%';
}

function updateMonthRangeDisplay() {
  const start = parseInt(monthRangeStart.value);
  const end = parseInt(monthRangeEnd.value);
  
  // Update progress bar only (no text display)
  const leftPercent = (Math.min(start, end) / 11) * 100;
  const rightPercent = ((11 - Math.max(start, end)) / 11) * 100;
  monthRangeProgress.style.left = leftPercent + '%';
  monthRangeProgress.style.right = rightPercent + '%';
}

function updateMovieYearRangeDisplay() {
  const start = parseInt(movieYearRangeStart.value);
  const end = parseInt(movieYearRangeEnd.value);
  const min = parseInt(movieYearRangeStart.min);
  const max = parseInt(movieYearRangeStart.max);
  
  if (start === min && end === max) {
    movieYearRangeDisplay.textContent = 'All Years';
  } else if (start === end) {
    movieYearRangeDisplay.textContent = start;
  } else {
    movieYearRangeDisplay.textContent = `${start} - ${end}`;
  }
  
  // Update progress bar
  const range = max - min;
  const leftPercent = ((Math.min(start, end) - min) / range) * 100;
  const rightPercent = ((max - Math.max(start, end)) / range) * 100;
  movieYearRangeProgress.style.left = leftPercent + '%';
  movieYearRangeProgress.style.right = rightPercent + '%';
}

function updateFilterButtons() {
  updateWatchedDateButton();
  updateReleaseYearButton();
}

function updateWatchedDateButton() {
  const yearStart = parseInt(yearRangeStart.value);
  const yearEnd = parseInt(yearRangeEnd.value);
  const monthStart = parseInt(monthRangeStart.value);
  const monthEnd = parseInt(monthRangeEnd.value);
  
  let displayText = '';
  
  // If all months selected (Jan-Dec)
  if (monthStart === 0 && monthEnd === 11) {
    if (yearStart === yearEnd) {
      displayText = `${yearStart}`;
    } else {
      displayText = `${yearStart}-${yearEnd}`;
    }
  } else {
    // Specific months selected
    const yearText = yearStart === yearEnd ? `${yearStart}` : `${yearStart}-${yearEnd}`;
    const monthText = monthStart === monthEnd ? monthNames[monthStart] : `${monthNames[monthStart]}-${monthNames[monthEnd]}`;
    displayText = `${yearText}, ${monthText}`;
  }
  
  watchedDateRangeBtn.textContent = displayText;
  watchedDateRangeDisplay.textContent = displayText;
}

function updateReleaseYearButton() {
  const minReleaseYear = parseInt(movieYearRangeStart.min);
  const maxReleaseYear = parseInt(movieYearRangeStart.max);
  
  if (movieYearFrom === minReleaseYear && movieYearTo === maxReleaseYear) {
    releaseYearRangeBtn.textContent = 'All';
  } else if (movieYearFrom === movieYearTo) {
    releaseYearRangeBtn.textContent = movieYearFrom;
  } else {
    releaseYearRangeBtn.textContent = `${movieYearFrom}-${movieYearTo}`;
  }
}

function openWatchedDateRangePopup() {
  yearRangeStart.value = yearFrom;
  yearRangeEnd.value = yearTo;
  monthRangeStart.value = monthFrom;
  monthRangeEnd.value = monthTo;
  updateWatchedDateRangeDisplay();
  watchedDateRangePopup.classList.remove('hidden');
}

function closeWatchedDateRangePopup() {
  watchedDateRangePopup.classList.add('hidden');
}

function applyWatchedDateRange() {
  let yearStart = parseInt(yearRangeStart.value);
  let yearEnd = parseInt(yearRangeEnd.value);
  let monthStart = parseInt(monthRangeStart.value);
  let monthEnd = parseInt(monthRangeEnd.value);
  
  // Ensure start <= end
  if (yearStart > yearEnd) {
    [yearStart, yearEnd] = [yearEnd, yearStart];
    yearRangeStart.value = yearStart;
    yearRangeEnd.value = yearEnd;
  }
  
  if (monthStart > monthEnd) {
    [monthStart, monthEnd] = [monthEnd, monthStart];
    monthRangeStart.value = monthStart;
    monthRangeEnd.value = monthEnd;
  }
  
  yearFrom = yearStart;
  yearTo = yearEnd;
  monthFrom = monthStart;
  monthTo = monthEnd;
  
  updateWatchedDateButton();
  closeWatchedDateRangePopup();
  applyFilters();
}

function resetWatchedDateRange() {
  const currentYear = new Date().getFullYear();
  yearFrom = currentYear;
  yearTo = currentYear;
  monthFrom = 0;
  monthTo = 11;
  yearRangeStart.value = yearFrom;
  yearRangeEnd.value = yearTo;
  monthRangeStart.value = monthFrom;
  monthRangeEnd.value = monthTo;
  updateWatchedDateRangeDisplay();
}

function openMovieYearRangePopup() {
  movieYearRangeStart.value = movieYearFrom;
  movieYearRangeEnd.value = movieYearTo;
  updateMovieYearRangeDisplay();
  movieYearRangePopup.classList.remove('hidden');
}

function closeMovieYearRangePopup() {
  movieYearRangePopup.classList.add('hidden');
}

function applyMovieYearRange() {
  let start = parseInt(movieYearRangeStart.value);
  let end = parseInt(movieYearRangeEnd.value);
  
  if (start > end) {
    [start, end] = [end, start];
    movieYearRangeStart.value = start;
    movieYearRangeEnd.value = end;
  }
  
  movieYearFrom = start;
  movieYearTo = end;
  
  updateReleaseYearButton();
  closeMovieYearRangePopup();
  applyFilters();
}

function resetMovieYearRange() {
  const min = parseInt(movieYearRangeStart.min);
  const max = parseInt(movieYearRangeStart.max);
  movieYearFrom = min;
  movieYearTo = max;
  movieYearRangeStart.value = movieYearFrom;
  movieYearRangeEnd.value = movieYearTo;
  updateMovieYearRangeDisplay();
}

function attachEventListeners() {
  // Watched date range selector (combined year + month)
  watchedDateRangeBtn.addEventListener('click', openWatchedDateRangePopup);
  watchedDateRangeApply.addEventListener('click', applyWatchedDateRange);
  watchedDateRangeReset.addEventListener('click', resetWatchedDateRange);
  yearRangeStart.addEventListener('input', updateWatchedDateRangeDisplay);
  yearRangeEnd.addEventListener('input', updateWatchedDateRangeDisplay);
  monthRangeStart.addEventListener('input', updateWatchedDateRangeDisplay);
  monthRangeEnd.addEventListener('input', updateWatchedDateRangeDisplay);
  
  // Movie year range selector
  releaseYearRangeBtn.addEventListener('click', openMovieYearRangePopup);
  movieYearRangeApply.addEventListener('click', applyMovieYearRange);
  movieYearRangeReset.addEventListener('click', resetMovieYearRange);
  movieYearRangeStart.addEventListener('input', updateMovieYearRangeDisplay);
  movieYearRangeEnd.addEventListener('input', updateMovieYearRangeDisplay);
  
  // Close popups
  watchedDateRangePopup.querySelector('.range-close').addEventListener('click', closeWatchedDateRangePopup);
  movieYearRangePopup.querySelector('.range-close').addEventListener('click', closeMovieYearRangePopup);
  
  // Close on background click
  watchedDateRangePopup.addEventListener('click', (e) => {
    if (e.target === watchedDateRangePopup) closeWatchedDateRangePopup();
  });
  movieYearRangePopup.addEventListener('click', (e) => {
    if (e.target === movieYearRangePopup) closeMovieYearRangePopup();
  });
  
  sortOrderEl.addEventListener('change', applyFilters);
  clearFiltersBtn.addEventListener('click', clearFilters);
  
  carouselPrevBtn.addEventListener('click', () => scrollCarousel('prev'));
  carouselNextBtn.addEventListener('click', () => scrollCarousel('next'));

  // Handle window resize for carousel
  window.addEventListener('resize', updateCarouselButtons);
}

function showError(message) {
  console.error('ERROR:', message);
  watcherNameEl.textContent = 'Error';
  avatarInitialsEl.textContent = '!';
  sessionsListEl.innerHTML = `<p class="empty-message">${message}. <a href="watchers.html">Return to Watchers</a></p>`;
}

// Initialize on load
console.log('About to call init()');
init();
console.log('init() completed');
