// Searchable dropdown component for watcher selection
import { getWatchers } from './watcher-storage.js';
import { getWatcherFullName } from './watcher-models.js';

/**
 * Creates a searchable dropdown for selecting multiple watchers
 * 
 * Technical aspects:
 * - Component-based approach: encapsulates dropdown logic in a reusable module
 * - Event delegation: uses single event listener on container for efficiency
 * - Partial matching: implements case-insensitive substring search
 * - State management: tracks selected watchers internally
 * - DOM manipulation: dynamically creates and updates dropdown elements
 */
export class WatcherDropdown {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.selectedWatcherIds = options.selectedIds || [];
    this.onChange = options.onChange || (() => {});
    this.placeholder = options.placeholder || 'Select watchers...';
    
    this.isOpen = false;
    this.filteredWatchers = [];
    
    this.render();
    this.attachEvents();
  }
  
  render() {
    const watchers = getWatchers().sort((a, b) => {
      const nameA = getWatcherFullName(a).toLowerCase();
      const nameB = getWatcherFullName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Build selected watchers display
    const selectedWatchers = this.selectedWatcherIds
      .map(id => watchers.find(w => w.id === id))
      .filter(Boolean);
    
    const selectedDisplay = selectedWatchers.length > 0
      ? selectedWatchers.map(w => `
          <span class="watcher-tag" data-id="${w.id}">
            ${this.escapeHtml(getWatcherFullName(w))}
            <button type="button" class="watcher-tag-remove" aria-label="Remove ${this.escapeHtml(getWatcherFullName(w))}">&times;</button>
          </span>
        `).join('')
      : `<span class="watcher-placeholder">${this.placeholder}</span>`;
    
    this.container.innerHTML = `
      <div class="watcher-dropdown">
        <div class="watcher-dropdown-trigger">
          <div class="watcher-dropdown-selected">
            ${selectedDisplay}
          </div>
          <button type="button" class="watcher-dropdown-arrow" aria-label="Toggle dropdown">▼</button>
        </div>
        <div class="watcher-dropdown-menu ${this.isOpen ? '' : 'hidden'}">
          <input 
            type="text" 
            name="watcherDropdownSearch"
            class="watcher-dropdown-search" 
            placeholder="Search watchers..."
            aria-label="Search watchers"
          />
          <div class="watcher-dropdown-list">
            ${this.renderWatcherList(watchers)}
          </div>
        </div>
      </div>
    `;
  }
  
  renderWatcherList(watchers) {
    if (watchers.length === 0) {
      return '<div class="watcher-dropdown-empty">No watchers available</div>';
    }
    
    return watchers.map(w => {
      const isSelected = this.selectedWatcherIds.includes(w.id);
      const fullName = getWatcherFullName(w);
      return `
        <label class="watcher-dropdown-item">
          <input 
            type="checkbox" 
            name="watcherDropdownSelection"
            value="${w.id}" 
            ${isSelected ? 'checked' : ''}
            data-watcher-name="${this.escapeHtml(fullName.toLowerCase())}"
          />
          <span>${this.escapeHtml(fullName)}</span>
        </label>
      `;
    }).join('');
  }
  
  attachEvents() {
    // Remove old listeners to prevent duplicates
    if (this.boundClickHandler) {
      this.container.removeEventListener('click', this.boundClickHandler);
    }
    if (this.boundChangeHandler) {
      this.container.removeEventListener('change', this.boundChangeHandler);
    }
    if (this.boundInputHandler) {
      this.container.removeEventListener('input', this.boundInputHandler);
    }
    if (this.boundOutsideClickHandler) {
      document.removeEventListener('click', this.boundOutsideClickHandler);
    }
    
    // Event delegation: single listener handles all interactions
    this.boundClickHandler = (e) => {
      // Don't toggle if clicking on a tag remove button
      if (e.target.matches('.watcher-tag-remove')) {
        e.stopPropagation();
        const tag = e.target.closest('.watcher-tag');
        if (tag) {
          const id = tag.dataset.id;
          this.removeWatcher(id);
        }
        return;
      }
      
      // Prevent menu clicks from bubbling
      if (e.target.closest('.watcher-dropdown-menu')) {
        e.stopPropagation();
        return;
      }
      
      // Toggle dropdown when clicking on trigger area (but not on tags themselves)
      const trigger = e.target.closest('.watcher-dropdown-trigger');
      const clickedOnTag = e.target.closest('.watcher-tag');
      
      if (trigger && !clickedOnTag) {
        e.stopPropagation();
        this.toggleDropdown();
      }
    };
    
    // Handle checkbox changes
    this.boundChangeHandler = (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        const id = e.target.value;
        if (e.target.checked) {
          this.addWatcher(id);
        } else {
          this.removeWatcher(id);
        }
      }
    };
    
    // Handle search input
    this.boundInputHandler = (e) => {
      if (e.target.matches('.watcher-dropdown-search')) {
        this.filterWatchers(e.target.value);
      }
    };
    
    // Close dropdown when clicking outside
    this.boundOutsideClickHandler = (e) => {
      if (!this.container.contains(e.target) && this.isOpen) {
        this.closeDropdown();
      }
    };
    
    this.container.addEventListener('click', this.boundClickHandler);
    this.container.addEventListener('change', this.boundChangeHandler);
    this.container.addEventListener('input', this.boundInputHandler);
    document.addEventListener('click', this.boundOutsideClickHandler);
  }
  
  /**
   * Implements partial matching search
   * Uses case-insensitive substring matching
   */
  filterWatchers(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const list = this.container.querySelector('.watcher-dropdown-list');
    const items = list.querySelectorAll('.watcher-dropdown-item');
    
    let visibleCount = 0;
    items.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const watcherName = checkbox.dataset.watcherName;
      
      // Partial match: check if search term is anywhere in the name
      if (term === '' || watcherName.includes(term)) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Show "no results" message if needed
    const existingEmpty = list.querySelector('.watcher-dropdown-no-results');
    if (existingEmpty) existingEmpty.remove();
    
    if (visibleCount === 0 && term !== '') {
      const noResults = document.createElement('div');
      noResults.className = 'watcher-dropdown-no-results';
      noResults.textContent = `No watchers found matching "${searchTerm}"`;
      list.appendChild(noResults);
    }
  }
  
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    const menu = this.container.querySelector('.watcher-dropdown-menu');
    menu.classList.toggle('hidden');
    
    if (this.isOpen) {
      // Focus search input when opening
      const searchInput = this.container.querySelector('.watcher-dropdown-search');
      setTimeout(() => searchInput.focus(), 0);
    }
  }
  
  closeDropdown() {
    this.isOpen = false;
    const menu = this.container.querySelector('.watcher-dropdown-menu');
    menu.classList.add('hidden');
  }
  
  addWatcher(id) {
    if (!this.selectedWatcherIds.includes(id)) {
      this.selectedWatcherIds.push(id);
      const wasOpen = this.isOpen;
      this.render();
      this.attachEvents();
      
      // Keep dropdown open after re-render
      if (wasOpen) {
        this.isOpen = true;
        const menu = this.container.querySelector('.watcher-dropdown-menu');
        if (menu) {
          menu.classList.remove('hidden');
        }
      }
      
      this.onChange(this.selectedWatcherIds);
    }
  }
  
  removeWatcher(id) {
    this.selectedWatcherIds = this.selectedWatcherIds.filter(wId => wId !== id);
    const wasOpen = this.isOpen;
    this.render();
    this.attachEvents();
    
    // Keep dropdown open after re-render
    if (wasOpen) {
      this.isOpen = true;
      const menu = this.container.querySelector('.watcher-dropdown-menu');
      if (menu) {
        menu.classList.remove('hidden');
      }
    }
    
    this.onChange(this.selectedWatcherIds);
  }
  
  getSelectedIds() {
    return this.selectedWatcherIds.slice();
  }
  
  setSelectedIds(ids) {
    this.selectedWatcherIds = ids || [];
    this.render();
    this.attachEvents();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    // Clean up event listeners
    if (this.boundClickHandler) {
      this.container.removeEventListener('click', this.boundClickHandler);
    }
    if (this.boundChangeHandler) {
      this.container.removeEventListener('change', this.boundChangeHandler);
    }
    if (this.boundInputHandler) {
      this.container.removeEventListener('input', this.boundInputHandler);
    }
    if (this.boundOutsideClickHandler) {
      document.removeEventListener('click', this.boundOutsideClickHandler);
    }
  }
}
