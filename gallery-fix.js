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
