// localStorage operations for Tier Lists
const STORAGE_KEY = 'movieDB_tierLists';

export function loadTierLists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load tier lists from localStorage:', err);
    return [];
  }
}

export function saveTierLists(tierLists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tierLists));
    return true;
  } catch (err) {
    console.error('Failed to save tier lists to localStorage:', err);
    return false;
  }
}
