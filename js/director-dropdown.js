import { directorRepository } from './dal/index.js';

export class DirectorDropdown {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.selectedDirectorIds = options.selectedDirectorIds || [];
    this.onChange = options.onChange || (() => {});
    this.placeholder = options.placeholder || 'All Directors';
    
    this.isOpen = false;
    this.searchTerm = '';
    this.viewDirectors = [];
    
    // Bind methods
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    
    // Prepare initial list before first render
    this.prepareList();
    this.render();
    
    // Global listener
    document.addEventListener('click', this.handleDocumentClick);
  }
  
  dispose() {
      document.removeEventListener('click', this.handleDocumentClick);
  }

  handleDocumentClick(e) {
      if (!this.container.contains(e.target) && this.isOpen) {
          this.isOpen = false;
          this.render();
      }
  }
  
  prepareList() {
    let directors = directorRepository.getAll();
    
    // Sort: Selected first, then alphabetical
    directors.sort((a, b) => {
        const aSelected = this.selectedDirectorIds.includes(a.id);
        const bSelected = this.selectedDirectorIds.includes(b.id);
        
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        
        return a.name.localeCompare(b.name);
    });
    
    this.viewDirectors = directors;
  }

  getDirectors() {
    // Use the pre-sorted list if available, otherwise fallback (shouldn't happen if logic is correct)
    let directors = this.viewDirectors.length > 0 ? this.viewDirectors : directorRepository.getAll();
    
    if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        directors = directors.filter(d => d.name.toLowerCase().includes(term));
    }

    return directors;
  }
  
  render() {
    const directors = this.getDirectors();
    const allDirectors = directorRepository.getAll();
    const selectedDirectors = allDirectors.filter(d => this.selectedDirectorIds.includes(d.id));
    
    let displayText = this.placeholder;
    if (selectedDirectors.length > 0) {
        // Sort selected names alphabetically for display
        selectedDirectors.sort((a, b) => a.name.localeCompare(b.name));
        
        displayText = selectedDirectors.map(d => {
            const parts = d.name.trim().split(' ');
            return parts.length > 1 ? parts[parts.length - 1] : parts[0];
        }).join(', ');
    }
    
    const listHTML = this.renderList(directors);
    
    // Save scroll position
    const scrollContainer = this.container.querySelector('.director-list-scroll');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    this.container.innerHTML = `
      <div style="position:relative; width:100%;">
        <div class="multiselect-selected" tabindex="0" style="overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(displayText)}</div>
        <div class="multiselect-dropdown ${this.isOpen ? '' : 'hidden'}" style="overflow: hidden;">
          <div style="padding: 0.5rem; border-bottom: 1px solid #1e293b;">
            <input 
                type="text" 
                name="director-search"
                autocomplete="off"
                class="director-search-input" 
                placeholder="Search..." 
                value="${this.escapeHtml(this.searchTerm)}"
                style="width:100%; padding:0.4rem; background:#0f172a; border:1px solid #334155; color:white; border-radius:4px;"
                aria-label="Search directors"
            />
          </div>
          <div class="director-list-scroll" style="max-height: 200px; overflow-y: auto;">
            ${listHTML}
          </div>
        </div>
      </div>
    `;
    
    // Restore scroll position
    const newScrollContainer = this.container.querySelector('.director-list-scroll');
    if (newScrollContainer) {
        newScrollContainer.scrollTop = scrollTop;
    }

    this.attachLocalEvents();
    
    if (this.isOpen) {
        const input = this.container.querySelector('.director-search-input');
        if (input) {
            input.focus();
            // Move cursor to end
            const val = input.value;
            input.value = '';
            input.value = val;
        }
    }
  }
  
  
  renderList(directors) {
    if (!directors || directors.length === 0) {
      return '<div style="padding:0.5rem; color:#94a3b8; font-style:italic;">No directors found</div>';
    }
    
    return directors.map(d => {
      const isSelected = this.selectedDirectorIds.includes(d.id);
      return `
        <div class="multiselect-option ${isSelected ? 'selected' : ''}" data-id="${d.id}">
          ${this.escapeHtml(d.name)}
        </div>
      `;
    }).join('');
  }
  
  attachLocalEvents() {
    const trigger = this.container.querySelector('.multiselect-selected');
    const searchInput = this.container.querySelector('.director-search-input');
    const listContainer = this.container.querySelector('.director-list-scroll');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.isOpen) {
          this.prepareList();
      }
      this.isOpen = !this.isOpen;
      this.render();
    });
    
    searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render();
    });
    
    // Prevent closing when clicking inside search
    searchInput.addEventListener('click', (e) => e.stopPropagation());

    listContainer.addEventListener('click', (e) => {
        e.stopPropagation(); 
        
        const option = e.target.closest('.multiselect-option');
        if (option) {
            const id = option.dataset.id;
            
            if (this.selectedDirectorIds.includes(id)) {
                this.selectedDirectorIds = this.selectedDirectorIds.filter(sid => sid !== id);
            } else {
                this.selectedDirectorIds.push(id);
            }
            
            this.onChange(this.selectedDirectorIds);
            this.render();
        }
    });
  }
  
  getSelectedIds() {
    return this.selectedDirectorIds;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }
}
