# Favorites Feature - Technical Overview

## Overview
The favorites feature allows you to mark certain watchers as favorites. Favorites always appear first in the dropdown list on the Details page, in the exact order they were favorited.

---

## ✨ Features

### For Users:
- **Star button** on each watcher in the Watchers page
- **Filled star (⭐)** = Favorite
- **Empty star (☆)** = Not favorite
- Click to toggle favorite status
- Favorites show with a star icon in dropdowns
- Favorites always appear first in dropdown lists

### Ordering:
- Favorites appear in the **order they were selected** (FIFO - First In, First Out)
- Non-favorites appear alphabetically after favorites
- Search respects this ordering

---

## 🔧 Technical Implementation

### 1. **Data Storage**

#### Separate Storage Key
```javascript
const FAVORITES_KEY = 'moviedb.watchers.favorites.v1';
```

**Why separate?**
- Keeps favorites list independent from watcher data
- Allows easy bulk operations on favorites
- Simple to clear or export favorites separately

#### Data Structure
```javascript
favorites = ["uuid-1", "uuid-3", "uuid-5"]  // Array of watcher IDs
```

**Array instead of Set/Object:**
- Preserves insertion order (ES6+ guarantee)
- Simple to work with
- Direct index manipulation for removal

---

### 2. **State Management**

```javascript
let favorites = [];  // Module-level state
```

**Cached in memory:**
- Loaded once with watchers
- Persisted on every change
- Single source of truth

---

### 3. **Toggle Function**

```javascript
export function toggleFavorite(watcherId) {
  const index = favorites.indexOf(watcherId);
  if (index > -1) {
    favorites.splice(index, 1);  // Remove if exists
  } else {
    favorites.push(watcherId);    // Add to end if not exists
  }
  persistFavorites();
  return favorites.includes(watcherId);
}
```

**Key aspects:**
- **Idempotent**: Can call multiple times safely
- **Order preserving**: New favorites go to the end
- **Immediate persistence**: Saves to localStorage right away
- **Returns new state**: Allows UI to update immediately

---

### 4. **Sorting Algorithm**

```javascript
export function getWatchersSortedByFavorites() {
  const allWatchers = getWatchers();
  const favoriteWatchers = [];
  const nonFavoriteWatchers = [];
  
  // Step 1: Add favorites in selection order
  favorites.forEach(favId => {
    const watcher = allWatchers.find(w => w.id === favId);
    if (watcher) favoriteWatchers.push(watcher);
  });
  
  // Step 2: Add non-favorites
  allWatchers.forEach(watcher => {
    if (!favorites.includes(watcher.id)) {
      nonFavoriteWatchers.push(watcher);
    }
  });
  
  // Step 3: Concatenate
  return [...favoriteWatchers, ...nonFavoriteWatchers];
}
```

**Algorithm complexity:**
- Time: O(n × m) where n = watchers, m = favorites
- Space: O(n) for temporary arrays
- **Trade-off**: Simplicity over performance (fine for small datasets)

**Optimization opportunity** (for large datasets):
```javascript
// Convert favorites to Set for O(1) lookup
const favSet = new Set(favorites);
const favoriteWatchers = favorites
  .map(id => watcherMap.get(id))
  .filter(Boolean);
```

---

### 5. **UI Integration**

#### Watchers Page
```javascript
const isFav = isFavorite(watcher.id);

<button class="${isFav ? 'primary' : 'secondary'} favorite-btn">
  ${isFav ? '⭐' : '☆'}
</button>
```

**Visual feedback:**
- Color change: Blue (favorite) vs Gray (normal)
- Icon change: Filled star vs Empty star
- Button highlights on hover with scale transform

#### Dropdown Component
```javascript
const isFav = isFavorite(w.id);
<span>${isFav ? '⭐ ' : ''}${escapeHtml(fullName)}</span>
```

**Indicator:**
- Star prefix for favorites in dropdown
- Maintains sort order from `getWatchersSortedByFavorites()`

---

### 6. **Persistence Strategy**

**Separate persistence functions:**
```javascript
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function persistFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
```

**Why separate?**
- Favorites change more frequently than watcher data
- Reduces unnecessary writes to watcher storage
- Clear separation of concerns
- Easier to debug

---

### 7. **Data Integrity**

**Orphaned favorites handling:**
```javascript
favorites.forEach(favId => {
  const watcher = allWatchers.find(w => w.id === favId);
  if (watcher) favoriteWatchers.push(watcher);  // Only add if exists
});
```

**Automatic cleanup:**
- If a favorited watcher is deleted, it's silently skipped
- No explicit cleanup needed (lazy cleanup on render)
- Could add explicit cleanup on delete for optimization

**Future enhancement:**
```javascript
export function deleteWatcher(id) {
  cache = cache.filter(w => w.id !== id);
  favorites = favorites.filter(fId => fId !== id);  // Clean up favorites
  persist();
  persistFavorites();
}
```

---

### 8. **Search Interaction**

The search functionality in the dropdown filters the **already-sorted** list:

```javascript
// In WatcherDropdown.render()
const watchers = getWatchersSortedByFavorites();  // Already sorted

// Search filters this sorted list
filterWatchers(searchTerm) {
  // Items maintain their DOM order (favorites first)
  items.forEach(item => {
    if (watcherName.includes(term)) {
      item.style.display = '';  // Show
    } else {
      item.style.display = 'none';  // Hide
    }
  });
}
```

**Behavior:**
- Favorites stay at top even when filtering
- Hidden items don't affect visual order
- CSS `display: none` preserves DOM position

---

## 🎯 Use Cases

### Scenario 1: Family Movie Nights
```
Favorites (in order): Mom, Dad, Sister
Others: Grandma, Uncle Joe, Cousin Alex
```
When logging a session, parents and sister appear first since you watch with them most.

### Scenario 2: Core Friend Group
```
Favorites: John, Sarah, Mike
Others: Bob, Alice, Tom, ...
```
Your regular movie buddies are always at the top.

---

## 🔄 User Workflow

1. **Navigate to Watchers page**
2. **Click star (☆)** next to a watcher → becomes favorite (⭐)
3. **Click star (⭐)** again → removes from favorites (☆)
4. **Go to movie Details page**
5. **Open watcher dropdown** → Favorites appear first with star icon
6. **Search in dropdown** → Favorites remain at top of results

---

## 📊 Data Flow

```
User clicks favorite button
    ↓
handleToggleFavorite(watcherId)
    ↓
toggleFavorite(watcherId)
    ↓
favorites array updated
    ↓
persistFavorites() → localStorage
    ↓
renderWatchers() refreshes UI
    ↓
Button changes: ☆ ↔ ⭐

Later...
User opens dropdown
    ↓
getWatchersSortedByFavorites()
    ↓
Favorites listed first
    ↓
Each favorite shown with ⭐ prefix
```

---

## 🚀 Future Enhancements

1. **Drag-and-drop reordering**: Manually change favorite order
2. **Favorite groups**: Create named groups of watchers
3. **Favorite limit**: Cap at top 5 favorites
4. **Quick select**: "Select all favorites" button
5. **Statistics**: Show most-watched with favorites
6. **Export**: Share favorite list with others
7. **Smart favorites**: Auto-favorite based on watch frequency
8. **Sync**: Share favorites across devices (with backend)

---

## 🐛 Edge Cases Handled

1. **Deleted favorited watcher**: Silently skipped in dropdown
2. **Empty favorites list**: No special handling needed, shows all watchers alphabetically
3. **All watchers favorited**: Entire list in selection order
4. **Toggling rapidly**: Each click persists immediately
5. **Search with no favorites**: Works like normal alphabetical list

---

## 💡 Key Learnings

1. **Order preservation**: Arrays maintain insertion order reliably
2. **Separation of concerns**: Favorites storage independent from watcher storage
3. **Visual feedback**: Clear icons make state obvious
4. **Progressive enhancement**: Works without breaking existing functionality
5. **Simple data structure**: Plain array is sufficient for this use case
6. **Lazy cleanup**: Don't need explicit orphan removal if handled on render
7. **Immediate feedback**: Toggle + re-render provides instant visual update
