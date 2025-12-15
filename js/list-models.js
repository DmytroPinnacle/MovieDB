export function createList(data) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'l_' + Math.random().toString(36).slice(2, 11),
    name: data.name.trim(),
    movieIds: Array.isArray(data.movieIds) ? data.movieIds : [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function validateListFields(data) {
  const errors = {};
  if (!data.name || !data.name.trim()) {
    errors.name = 'List name is required';
  }
  return errors;
}
