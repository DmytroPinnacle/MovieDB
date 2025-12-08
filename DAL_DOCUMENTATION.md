# Data Access Layer (DAL) Documentation

## Overview

The MovieDB application now uses an in-memory data storage system with JSON import/export capabilities instead of localStorage. All data persistence is managed through a Repository pattern that encapsulates CRUD operations.

## Architecture

### Repository Pattern

The application uses the Repository pattern to abstract data access:

```
js/dal/
├── BaseRepository.js       # Base class with generic CRUD operations
├── MovieRepository.js      # Movie-specific data access
├── WatcherRepository.js    # Watcher-specific data access with favorites
├── SessionRepository.js    # Session-specific data access with queries
├── DataManager.js          # JSON import/export and backup functionality
└── index.js               # Centralized exports
```

### Storage Method

**In-Memory Storage with JSON Export/Import**

- **Temporary**: Data exists only during the browser session
- **Portable**: Easy to export/import via JSON files
- **No Quotas**: No localStorage size limitations
- **Privacy**: Data doesn't persist automatically between sessions

## Core Components

### 1. BaseRepository

Generic repository providing standard CRUD operations:

```javascript
import { BaseRepository } from './dal/BaseRepository.js';

const repo = new BaseRepository('EntityName');

// CRUD Operations
repo.add(entity)              // Create
repo.getById(id)              // Read by ID
repo.getAll()                 // Read all
repo.update(id, entity)       // Update
repo.delete(id)               // Delete

// Advanced Operations
repo.findWhere(predicate)     // Find with filter function
repo.deleteWhere(predicate)   // Delete matching predicate
repo.clear()                  // Clear all data
repo.count()                  // Get count
```

### 2. MovieRepository

Singleton instance managing movie data:

```javascript
import { movieRepository } from './dal/index.js';

// Specialized queries
movieRepository.searchByTitle('inception')
movieRepository.filterByGenre('Drama')
movieRepository.filterByYear(2010)
movieRepository.getByWatcherId(watcherId)
movieRepository.getAllSorted()  // By creation date
```

### 3. WatcherRepository

Singleton managing watchers with favorites support:

```javascript
import { watcherRepository } from './dal/index.js';

// Favorites management
watcherRepository.toggleFavorite(watcherId)
watcherRepository.isFavorite(watcherId)
watcherRepository.getFavorites()
watcherRepository.getAllSortedByFavorites()

// Search
watcherRepository.searchByName('John')
watcherRepository.getAllSorted()  // Alphabetically
```

### 4. SessionRepository

Singleton managing watching sessions:

```javascript
import { sessionRepository } from './dal/index.js';

// Query methods
sessionRepository.getByMovieId(movieId)
sessionRepository.getLatestByMovieId(movieId)
sessionRepository.getByWatcherId(watcherId)
sessionRepository.getWatchedMovieIdsByWatcherId(watcherId)
sessionRepository.getByDateRange(start, end)

// Bulk operations
sessionRepository.deleteByMovieId(movieId)
sessionRepository.deleteByWatcherId(watcherId)
```

### 5. DataManager

Singleton for import/export and backup:

```javascript
import { dataManager } from './dal/index.js';

// Export
const jsonData = dataManager.exportToJSON()
dataManager.downloadJSON('backup.json')

// Import
dataManager.importFromJSON(jsonData, merge=false)
await dataManager.uploadJSON(file, merge=false)

// Utilities
dataManager.getStats()        // Get counts
dataManager.clearAll()        // Clear all repositories
dataManager.createBackup()    // Create backup object
dataManager.restoreFromBackup(backup)
```

## Data Format

### JSON Export Structure

```json
{
  "version": "1.0",
  "exportDate": "2025-12-07T10:30:00.000Z",
  "data": {
    "movies": [
      {
        "id": "uuid",
        "title": "Movie Title",
        "year": 2024,
        "genre": "Drama",
        "rating": 8.5,
        "posterUrl": "https://...",
        "notes": "...",
        "imdbId": "tt1234567",
        "kinopoiskId": "123456",
        "watcherIds": ["uuid1", "uuid2"],
        "createdAt": 1701950000000,
        "updatedAt": 1701950000000
      }
    ],
    "watchers": {
      "watchers": [
        {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "createdAt": 1701950000000,
          "updatedAt": 1701950000000
        }
      ],
      "favorites": ["uuid1", "uuid2"]
    },
    "sessions": [
      {
        "id": "nanoid",
        "movieId": "uuid",
        "watcherIds": ["uuid1"],
        "watchedDate": 1701950000000,
        "notes": "Great movie!",
        "watcherRatings": {
          "uuid1": 9
        },
        "createdAt": 1701950000000,
        "updatedAt": 1701950000000
      }
    ]
  }
}
```

## Migration from localStorage

The old storage files (`storage.js`, `watcher-storage.js`, `session-storage.js`) now act as **compatibility layers** that wrap the new repository system. All existing code continues to work without changes.

### Old API (still works)
```javascript
import { loadMovies, addMovie } from './storage.js';
const movies = loadMovies();
addMovie(movie);
```

### New API (recommended)
```javascript
import { movieRepository } from './dal/index.js';
const movies = movieRepository.getAll();
movieRepository.add(movie);
```

## Usage Examples

### Initialize Data
```javascript
import { initializeSeedData } from './DataSeed/initializer.js';

// Load seed data (100 movies, 7 watchers, sessions)
initializeSeedData();
```

### Export Data
```javascript
import { dataManager } from './dal/index.js';

// Download as file
dataManager.downloadJSON('my-moviedb-backup.json');

// Get as object
const backup = dataManager.exportToJSON();
```

### Import Data
```javascript
// From file upload
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await dataManager.uploadJSON(file, merge=false);
});

// From object
dataManager.importFromJSON(jsonData, merge=false);
```

### Custom Queries
```javascript
import { movieRepository, sessionRepository } from './dal/index.js';

// Find movies watched by specific user in 2024
const watcherId = 'uuid';
const sessions = sessionRepository.getByWatcherId(watcherId);
const moviesIn2024 = sessions
  .filter(s => new Date(s.watchedDate).getFullYear() === 2024)
  .map(s => movieRepository.getById(s.movieId));
```

## Data Management UI

A dedicated data management page is available at `data-manager.html`:

- **View Statistics**: See counts of all data entities
- **Export Data**: Download complete database as JSON
- **Import Data**: Upload JSON files (replace or merge modes)
- **Load Seed Data**: Initialize sample data for testing
- **Clear All**: Remove all data from the application

## Best Practices

1. **Regular Backups**: Export data regularly since it's in-memory
2. **Use Repositories**: Access data through repositories, not directly
3. **Avoid Direct Mutation**: Use repository methods instead of modifying arrays
4. **Type Safety**: Repositories return copies to prevent external mutation
5. **Seed Data**: Use `initializeSeedData()` for consistent test data

## Advantages Over localStorage

✅ **Simple**: No parsing/serialization overhead  
✅ **Fast**: In-memory access is instant  
✅ **Portable**: JSON export/import across browsers/devices  
✅ **No Limits**: No storage quota issues  
✅ **Clean**: No persistent browser state  
✅ **Testable**: Easy to reset and seed data  
✅ **Encapsulated**: All CRUD operations in one place  

## Future Enhancements

Potential improvements to consider:

- **Auto-save**: Periodic JSON export to downloads folder
- **CSV Export**: Alternative format for spreadsheet compatibility
- **Partial Import**: Import specific entities only
- **Data Validation**: Schema validation on import
- **Compression**: Gzip compression for large exports
- **IndexedDB**: Upgrade to IndexedDB for persistent storage with same API
