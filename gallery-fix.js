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

/* app.js contenait encore les anciens IDs syncBtn, copyReportBtn et importJson.
   Le premier élément absent arrêtait init() et désactivait presque tous les boutons.
   Cette version relie uniquement les éléments réellement présents dans index.html. */
(function fixCurrentEventBindings() {
  if (typeof wireEvents !== 'function') return;

  const bind = (selector, eventName, handler) => {
    const node = document.querySelector(selector);
    if (node && typeof handler === 'function') node.addEventListener(eventName, handler);
  };

  wireEvents = function wireEventsWithCurrentIds() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    bind('#saveSettingsBtn', 'click', saveSettings);
    bind('#testConnectionBtn', 'click', syncReports);
    bind('#reportForm', 'submit', onSubmit);
    bind('#previewBtn', 'click', () => previewReport(collectReportFromForm()));
    bind('#resetBtn', 'click', resetForm);
    bind('#searchBox', 'input', renderHistory);
    bind('#monthFilter', 'input', renderHistory);
    bind('#printBtn', 'click', () => window.print());
    bind('#exportXlsBtn', 'click', exportCurrentXls);
    bind('#copyHtmlBtn', 'click', typeof copyReportHtml === 'function' ? copyReportHtml : null);
    bind('#exportJsonBtn', 'click', exportJson);
    bind('#importJsonInput', 'change', importJson);

    bind('#mainDate', 'change', () => {
      const dateInput = document.querySelector('#mainDate');
      const periodInput = document.querySelector('#period');
      const d = dateInput ? dateInput.value : '';
      if (periodInput && (!periodInput.value || periodInput.value === monthLabel(todayIso()))) {
        periodInput.value = monthLabel(d);
      }
      document.querySelectorAll('.row-date').forEach(input => {
        if (!input.value) input.value = d;
      });
      refreshNextNo(false);
    });

    bind('#sectionsContainer', 'click', sectionClickHandler);
    bind('#sectionsContainer', 'change', sectionChangeHandler);
  };
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
    document.write('<script src="backend-version-v14.js"><\/script>');
    document.write('<script src="report-title-v15.js"><\/script>');
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
          loadScript('date-sync-v12.js', () => {
            loadScript('energy-manual-remove-v13.js', () => {
              loadScript('backend-version-v14.js', () => loadScript('report-title-v15.js'));
            });
          });
        });
      });
    });
  });
})();
