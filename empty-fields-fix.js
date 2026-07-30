'use strict';

/* Masque automatiquement du rapport les lignes/sections non remplies.
   Une date ajoutée automatiquement ne suffit pas à rendre une ligne visible.
   Les photos ne sont affichées que lorsqu'une image existe réellement. */
(function hideUnfilledReportContent() {
  const photoKeys = new Set(['photoDataUrl', 'photoUrl', 'photo']);

  function hasRealPhoto(row) {
    return Boolean(row?.photoDataUrl || row?.photo?.dataUrl || row?.photoUrl);
  }

  window.rowHasUsefulData = function rowHasUsefulData(kind, row) {
    if (!row) return false;
    if (kind === 'satellite') return hasText(row.cn);

    const ignored = new Set(['date', ...photoKeys]);
    if (kind === 'tx' || kind === 'clim') ignored.add('service');

    const hasValues = Object.entries(row).some(([key, value]) => {
      if (ignored.has(key)) return false;
      return hasText(value);
    });

    return hasValues || hasRealPhoto(row);
  };

  window.visibleRows = function visibleRows(section) {
    const kind = section?.kind || '';
    return (section?.rows || []).filter(row => window.rowHasUsefulData(kind, row));
  };

  window.sectionHasData = function sectionHasData(section, photos) {
    return window.visibleRows(section).length > 0 || photosHasData(photos);
  };
})();
