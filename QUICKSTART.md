# Quick Start Guide - New Data Layer

## What You Need to Know

Your MovieDB app now uses **in-memory storage** instead of localStorage. This means:

- ✅ Data is faster and has no size limits
- ⚠️ Data is temporary (lost when you close the browser)
- 💾 You can export/import JSON files to save your data

## Getting Started

### 1. First Time Setup

Open `index.html` in your browser. The app will automatically:
- Load 100 sample movies
- Create 7 sample watchers
- Add watching sessions

### 2. Using the App

Everything works exactly as before:
- Add/edit/delete movies
- Manage watchers and favorites
- Track watching sessions
- Search and filter

### 3. Saving Your Data

**Option A: Use the Data Manager**
1. Open `data-manager.html`
2. Click "Export to JSON"
3. Save the file somewhere safe

**Option B: Export Programmatically**
```javascript
import { dataManager } from './js/dal/index.js';
dataManager.downloadJSON('my-backup.json');
```

### 4. Restoring Your Data

**Option A: Use the Data Manager**
1. Open `data-manager.html`
2. Click "Import (Replace All)" or "Import (Merge)"
3. Select your JSON file

**Option B: Import Programmatically**
```javascript
const fileInput = document.querySelector('input[type="file"]');
await dataManager.uploadJSON(fileInput.files[0]);
```

## Common Tasks

### Export All Data
```javascript
import { dataManager } from './js/dal/index.js';
dataManager.downloadJSON('backup.json');
```

### Clear Everything
```javascript
import { dataManager } from './js/dal/index.js';
dataManager.clearAll();
```

### Load Sample Data
```javascript
import { initializeSeedData } from './js/DataSeed/initializer.js';
initializeSeedData();
```

### Get Statistics
```javascript
import { dataManager } from './js/dal/index.js';
const stats = dataManager.getStats();
console.log(stats); // { movies: 100, watchers: 7, sessions: 45, favorites: 0 }
```

## Developer Usage

### Access Repositories Directly
```javascript
import { movieRepository, watcherRepository, sessionRepository } from './js/dal/index.js';

// Movies
const allMovies = movieRepository.getAll();
const movie = movieRepository.getById('some-id');
const dramaMovies = movieRepository.filterByGenre('Drama');

// Watchers
const allWatchers = watcherRepository.getAll();
const favorites = watcherRepository.getAllSortedByFavorites();
watcherRepository.toggleFavorite('watcher-id');

// Sessions
const movieSessions = sessionRepository.getByMovieId('movie-id');
const watcherSessions = sessionRepository.getByWatcherId('watcher-id');
```

### Add Custom Queries
You can extend repositories with custom methods:

```javascript
// In MovieRepository.js
getHighRatedMovies(minRating = 8) {
  return this.findWhere(movie => movie.rating >= minRating);
}
```

## Important Notes

### ⚠️ Remember to Export
Since data is in-memory:
- Export before closing the browser
- Set up auto-export if needed
- Keep backups of important data

### ✅ No localStorage Issues
Benefits of the new system:
- No 5-10MB storage limits
- No quota exceeded errors
- No JSON parsing overhead
- Faster data access

### 🔄 Easy Migration
The old API still works:
```javascript
// Old way (still works)
import { loadMovies } from './storage.js';
const movies = loadMovies();

// New way (recommended)
import { movieRepository } from './js/dal/index.js';
const movies = movieRepository.getAll();
```

## Troubleshooting

**Q: I lost my data!**  
A: Data is temporary. Always export before closing the browser.

**Q: Can I make it permanent?**  
A: Yes! The repository pattern makes it easy to swap in IndexedDB or another persistent storage later.

**Q: How do I share data between devices?**  
A: Export JSON from one device, import on another.

**Q: Can I edit the JSON file?**  
A: Yes! The JSON is human-readable. Edit carefully and validate before importing.

## Files to Know

- `data-manager.html` - Visual data management interface
- `js/dal/` - All repository and data access code
- `DAL_DOCUMENTATION.md` - Complete technical documentation
- `MIGRATION_SUMMARY.md` - What changed from localStorage

## Support

For more details, see:
- `DAL_DOCUMENTATION.md` - Full API documentation
- `MIGRATION_SUMMARY.md` - Migration guide
- Repository source files in `js/dal/`

Enjoy your improved MovieDB! 🎬
