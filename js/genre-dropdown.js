// Searchable dropdown component for genre selection
// Similar to watcher dropdown but for genres

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western'
];

export class GenreDropdown {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.selectedGenres = options.selectedGenres || [];
    this.onChange = options.onChange || (() => {});
    this.placeholder = options.placeholder || 'Select genres...';
    
    this.isOpen = false;
    
    this.render();
    this.attachEvents();
  }
  
  render() {
    const selectedDisplay = this.selectedGenres.length > 0
      ? this.selectedGenres.map(genre => `
          <span class="watcher-tag" data-genre="${this.escapeHtml(genre)}">
            ${this.escapeHtml(genre)}
            <button type="button" class="watcher-tag-remove" aria-label="Remove ${this.escapeHtml(genre)}">&times;</button>
          </span>
        `).join('')
      : `<span class="watcher-placeholder">${this.placeholder}</span>`;
    
    const genreListHTML = this.renderGenreList();
    
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
            name="genreDropdownSearch"
            class="watcher-dropdown-search" 
            placeholder="Search genres..."
            aria-label="Search genres"
          />
          <div class="watcher-dropdown-list">
            ${genreListHTML}
          </div>
        </div>
      </div>
    `;
  }
  
  renderGenreList() {
    if (!AVAILABLE_GENRES || AVAILABLE_GENRES.length === 0) {
      return '<div class="watcher-dropdown-empty">No genres available</div>';
    }
    
    return AVAILABLE_GENRES.map(genre => {
      const isSelected = this.selectedGenres.includes(genre);
      return `
        <label class="watcher-dropdown-item">
          <input 
            type="checkbox" 
            name="genreDropdownSelection"
            value="${this.escapeHtml(genre)}" 
            ${isSelected ? 'checked' : ''}
            data-genre-name="${this.escapeHtml(genre.toLowerCase())}"
          />
          <span>${this.escapeHtml(genre)}</span>
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
    
    this.boundClickHandler = (e) => {
      if (e.target.matches('.watcher-tag-remove')) {
        e.stopPropagation();
        const tag = e.target.closest('.watcher-tag');
        if (tag) {
          const genre = tag.dataset.genre;
          this.removeGenre(genre);
        }
        return;
      }
      
      if (e.target.closest('.watcher-dropdown-menu')) {
        e.stopPropagation();
        return;
      }
      
      const trigger = e.target.closest('.watcher-dropdown-trigger');
      const clickedOnTag = e.target.closest('.watcher-tag');
      
      if (trigger && !clickedOnTag) {
        e.stopPropagation();
        this.toggleDropdown();
      }
    };
    
    this.boundChangeHandler = (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        const genre = e.target.value;
        if (e.target.checked) {
          this.addGenre(genre);
        } else {
          this.removeGenre(genre);
        }
      }
    };
    
    this.boundInputHandler = (e) => {
      if (e.target.matches('.watcher-dropdown-search')) {
        this.filterGenres(e.target.value);
      }
    };
    
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
  
  filterGenres(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const list = this.container.querySelector('.watcher-dropdown-list');
    const items = list.querySelectorAll('.watcher-dropdown-item');
    
    let visibleCount = 0;
    items.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const genreName = checkbox.dataset.genreName;
      
      if (term === '' || genreName.includes(term)) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    const existingEmpty = list.querySelector('.watcher-dropdown-no-results');
    if (existingEmpty) existingEmpty.remove();
    
    if (visibleCount === 0 && term !== '') {
      const noResults = document.createElement('div');
      noResults.className = 'watcher-dropdown-no-results';
      noResults.textContent = `No genres found matching "${searchTerm}"`;
      list.appendChild(noResults);
    }
  }
  
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    const menu = this.container.querySelector('.watcher-dropdown-menu');
    menu.classList.toggle('hidden');
    
    // Check if items are rendered
    const list = this.container.querySelector('.watcher-dropdown-list');
    const items = list.querySelectorAll('.watcher-dropdown-item');
    
    if (this.isOpen) {
      const searchInput = this.container.querySelector('.watcher-dropdown-search');
      setTimeout(() => searchInput.focus(), 0);
    }
  }
  
  closeDropdown() {
    this.isOpen = false;
    const menu = this.container.querySelector('.watcher-dropdown-menu');
    menu.classList.add('hidden');
  }
  
  addGenre(genre) {
    if (!this.selectedGenres.includes(genre)) {
      this.selectedGenres.push(genre);
      const wasOpen = this.isOpen;
      this.render();
      this.attachEvents();
      
      if (wasOpen) {
        this.isOpen = true;
        const menu = this.container.querySelector('.watcher-dropdown-menu');
        if (menu) {
          menu.classList.remove('hidden');
        }
      }
      
      this.onChange(this.selectedGenres);
    }
  }
  
  removeGenre(genre) {
    this.selectedGenres = this.selectedGenres.filter(g => g !== genre);
    const wasOpen = this.isOpen;
    this.render();
    this.attachEvents();
    
    if (wasOpen) {
      this.isOpen = true;
      const menu = this.container.querySelector('.watcher-dropdown-menu');
      if (menu) {
        menu.classList.remove('hidden');
      }
    }
    
    this.onChange(this.selectedGenres);
  }
  
  getSelectedGenres() {
    return this.selectedGenres.slice();
  }
  
  setSelectedGenres(genres) {
    this.selectedGenres = genres || [];
    this.render();
    this.attachEvents();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
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
