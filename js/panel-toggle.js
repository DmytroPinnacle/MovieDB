document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('togglePanelBtn');
  const panel = document.getElementById('addMoviePanel');
  const layout = document.getElementById('mainLayout');
  const verticalTab = document.getElementById('verticalTab');

  if (!toggleBtn || !panel || !layout || !verticalTab) return;

  function togglePanel() {
    const isFolded = panel.classList.toggle('folded');
    // layout.classList.toggle('folded'); // No longer needed as we use min-content
    
    if (isFolded) {
      verticalTab.classList.remove('hidden');
      toggleBtn.setAttribute('aria-label', 'Expand panel');
    } else {
      verticalTab.classList.add('hidden');
      toggleBtn.setAttribute('aria-label', 'Collapse panel');
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent bubbling
    togglePanel();
  });

  // Allow clicking the folded panel to expand it
  panel.addEventListener('click', (e) => {
    if (panel.classList.contains('folded')) {
      togglePanel();
    }
  });
});
