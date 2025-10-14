# MovieDB (Pure JS Learning Project)

A minimal client-side movie collection app using only **HTML**, **CSS**, and **vanilla JavaScript**. Data persists locally in your browser using `localStorage`.

## Features
- Add movies with title, year, genre, rating, poster URL, and notes
- Edit and delete existing movies
- Client-side search (title) + genre filter + sort (title, year, rating)
- Inline validation with helpful messages
- Accessible, responsive layout (desktop ↔ mobile)
- No frameworks, no build step
- Optional automatic seeding of 100 well-known films (first load only)

## Project Structure
```
index.html          # Main page + template
css/styles.css      # Styling (layout, components, utilities)
js/models.js        # Data model + validation helpers
js/storage.js       # localStorage CRUD abstraction + cache
js/ui.js            # Rendering & DOM utilities
js/app.js           # App entrypoint: wiring + orchestration
```

## Data Model
A movie object (persisted as JSON):
```json
{
  "id": "uuid",
  "title": "The Matrix",
  "year": 1999,
  "genre": "Sci-Fi",
  "rating": 9.2,
  "posterUrl": "https://...",
  "notes": "Rewatch soon",
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

## Key Technical Concepts
### 1. Separation of Concerns
- `models.js`: define and validate shape of data.
- `storage.js`: single module controlling persistence (source of truth is in-memory `cache`).
- `ui.js`: converts data → DOM; never mutates core state directly.
- `app.js`: coordinates events (Controller role) and updates model/storage.

### 2. State vs DOM
The canonical movie list lives in memory + localStorage. The DOM is re-rendered from state when filters change or data mutates (idempotent rendering). This avoids fragile incremental DOM tweaks.

### 3. Rendering Strategy
`renderMovieList` filters + sorts then rebuilds the `<ul>` content. For small data sets (hundreds of items) rebuilding is simpler and fast. For larger sets, diffing or virtualization could be added.

### 4. Event Delegation
Instead of attaching per-item listeners, a single `click` handler on the list captures events for Edit/Delete buttons (`e.target.matches`). This scales better and avoids re-binding after re-renders.

### 5. Validation Flow
- Gather form fields via `FormData`.
- Run `validateMovieFields` returning an `errors` map.
- Display messages by matching `[data-error-for]` elements.
- Abort submit if errors exist.

### 6. Persistence Layer
`storage.js` lazily loads once, keeps an in-memory `cache`, and writes through to `localStorage` on each mutation. This reduces repeated JSON parse/stringify overhead when listing.

### 7. Sorting & Filtering
The current view controls (`viewState`) stay in memory. Each change triggers a call to `renderMovieList(viewState)` ensuring a single deterministic rendering path.

### 8. Accessibility Considerations
- Form inputs have associated `<label>` elements.
- List updates announced with `aria-live="polite"` on the `<ul>` parent container.
- Focus returned to a sensible element after delete/edit actions (`Add Movie` button or title input).
- Color contrast chosen for legibility on dark theme.

### 9. Progressive Enhancement
App works with basic HTML; JavaScript augments interactivity. If JS fails, the static form is still visible (though non-functional persistence-wise).

### 10. Extensibility Ideas
- Tagging or multiple genres per movie
- Import/Export JSON
- Pagination or lazy rendering
- Offline-first with IndexedDB for bigger datasets
- Integration with a public movie API (OMDb, TMDb) for auto-filling data
- Unit tests using a lightweight test harness
- Drag & drop reordering or favorites

### 11. Seeding Strategy
On first load (when localStorage is empty) the app imports `SEED_MOVIES` from `js/seed.js` and creates 100 movie entries using the normal `createMovie` pathway. This keeps the code path identical to user-added movies (good for consistency/testing). Poster URLs are intentionally blank to avoid distributing copyrighted artwork; you can later enhance seeding to fetch posters from an API or add your own local images.

## How to Run
Simply open `index.html` in a modern browser (Chrome, Firefox, Edge). No build tools required.

If using VS Code Live Server extension, right-click `index.html` → "Open with Live Server" for auto-reload.

## Learning Checklist
- [x] Modular organization without bundler
- [x] DOM templating via `<template>`
- [x] Event delegation pattern
- [x] Form validation & UX feedback
- [x] Local persistence abstraction
- [x] Separation of concerns (Model / Storage / UI / App)

## License
MIT (feel free to experiment / modify)
