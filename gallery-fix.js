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
    return;
  }

  const finalScript = document.createElement('script');
  finalScript.src = 'final-fixes.js';
  finalScript.onload = () => {
    const emptyScript = document.createElement('script');
    emptyScript.src = 'empty-fields-fix.js';
    document.head.appendChild(emptyScript);
  };
  document.head.appendChild(finalScript);
})();
