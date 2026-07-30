'use strict';

/* La Date générale devient la source unique pour TNT, FM, Climatisation et
   Energie. Elle est copiée automatiquement dans toutes les lignes existantes
   et dans chaque nouvelle ligne ajoutée. Satellite reste inchangé. */

const DATE_SYNC_SECTION_KEYS = new Set(['tnt', 'fm', 'clim', 'energie']);

function syncGeneralDateToRows(value = null) {
  const generalDate = value === null ? ($('#mainDate')?.value || '') : String(value || '');

  document.querySelectorAll('#sectionsContainer .excel-section').forEach(sectionRoot => {
    if (!DATE_SYNC_SECTION_KEYS.has(sectionRoot.dataset.section)) return;
    sectionRoot.querySelectorAll('input[data-field="date"]').forEach(input => {
      input.value = generalDate;
    });
  });
}

const addRowBeforeDateSyncV12 = addRow;
addRow = function addRowWithGeneralDateV12(sectionRoot) {
  addRowBeforeDateSyncV12(sectionRoot);
  if (!sectionRoot || !DATE_SYNC_SECTION_KEYS.has(sectionRoot.dataset.section)) return;

  const generalDate = $('#mainDate')?.value || '';
  const lastRow = sectionRoot.querySelector('tbody tr:last-child');
  const dateInput = lastRow?.querySelector('input[data-field="date"]');
  if (dateInput) dateInput.value = generalDate;
};

const fillFormBeforeDateSyncV12 = fillForm;
fillForm = function fillFormWithGeneralDateV12(report) {
  fillFormBeforeDateSyncV12(report);
  syncGeneralDateToRows($('#mainDate')?.value || report?.mainDate || '');
};

function installGeneralDateSyncV12() {
  const mainDate = $('#mainDate');
  if (!mainDate) return;

  const apply = () => syncGeneralDateToRows(mainDate.value);
  mainDate.addEventListener('input', apply);
  mainDate.addEventListener('change', apply);

  // Applique aussi la date déjà présente après le premier rendu du formulaire.
  syncGeneralDateToRows(mainDate.value);
}

document.addEventListener('DOMContentLoaded', installGeneralDateSyncV12);
