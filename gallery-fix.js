'use strict';

/* Retire l'attribut capture qui force certains téléphones à ouvrir uniquement
   la caméra. Les champs image proposent ainsi Galerie / Photos / Caméra selon
   les options disponibles sur le téléphone. */
(function enableGallerySelection() {
  const selector = 'input[type="file"][accept*="image"]';

  function unlockImageInputs(root = document) {
    if (root.matches?.(selector)) root.removeAttribute('capture');
    root.querySelectorAll?.(selector).forEach(input => input.removeAttribute('capture'));
  }

  unlockImageInputs();
  document.addEventListener('DOMContentLoaded', () => unlockImageInputs());

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) unlockImageInputs(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

/* Charge les corrections dans l'ordre avant DOMContentLoaded. */
(function loadReportFixes() {
  if (document.readyState === 'loading') {
    document.write('<script src="final-fixes.js"><\/script>');
    document.write('<script src="empty-fields-fix.js"><\/script>');
    document.write('<script src="final-layout-v10.js"><\/script>');
    document.write('<script src="energy-empty-v11.js"><\/script>');
    document.write('<script src="date-sync-v12.js"><\/script>');
    document.write('<script src="energy-manual-remove-v13.js"><\/script>');
    return;
  }

  const loadScript = (src, done) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = done || null;
    document.head.appendChild(script);
  };

  loadScript('final-fixes.js', () => {
    loadScript('empty-fields-fix.js', () => {
      loadScript('final-layout-v10.js', () => {
        loadScript('energy-empty-v11.js', () => {
          loadScript('date-sync-v12.js', () => loadScript('energy-manual-remove-v13.js'));
        });
      });
    });
  });
})();
