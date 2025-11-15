// Watcher data models & validation

/** Watcher object shape
 *  {
 *    id: string (uuid),
 *    firstName: string,
 *    lastName?: string,
 *    createdAt: number (epoch ms),
 *    updatedAt: number (epoch ms)
 *  }
 */

export function createWatcher(data) {
  const now = Date.now();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'w_' + Math.random().toString(36).slice(2, 11),
    firstName: data.firstName.trim(),
    lastName: (data.lastName || '').trim(),
    createdAt: now,
    updatedAt: now
  };
}

export function validateWatcherFields(fields) {
  const errors = {};
  if (!fields.firstName || !fields.firstName.trim()) {
    errors.firstName = 'First name is required';
  }
  if (fields.firstName && fields.firstName.trim().length > 50) {
    errors.firstName = 'Max 50 chars';
  }
  if (fields.lastName && fields.lastName.length > 50) {
    errors.lastName = 'Max 50 chars';
  }
  return errors;
}

export function updateWatcher(original, updates) {
  return {
    ...original,
    firstName: updates.firstName.trim(),
    lastName: (updates.lastName || '').trim(),
    updatedAt: Date.now()
  };
}

export function getWatcherFullName(watcher) {
  if (!watcher) return '';
  const parts = [watcher.firstName];
  if (watcher.lastName) parts.push(watcher.lastName);
  return parts.join(' ');
}
