'use strict';

/* Permet de retirer manuellement la partie Energie pour un rapport, puis de
   la restaurer si nécessaire. Les anciennes valeurs restent conservées dans
   le rapport, mais la partie désactivée ne s'affiche pas à l'impression. */

let disabledSectionKeysV13 = new Set();
let disabledSectionSnapshotsV13 = {};

function disabledKeysFromReportV13(report = {}) {
  const keys = new Set(Array.isArray(report.disabledSections) ? report.disabledSections : []);
  Object.entries(report.sections || {}).forEach(([key, section]) => {
    if (section?.disabled === true) keys.add(key);
  });
  return keys;
}

function syncDisabledEnergyDateV13(value) {
  const snapshot = disabledSectionSnapshotsV13.energie;
  if (!snapshot?.rows) return;
  snapshot.rows.forEach(row => { row.date = value || ''; });
}

function addEnergyRestoreControlV13(container) {
  container.querySelector('.energy-restore-row-v13')?.remove();

  const row = document.createElement('div');
  row.className = 'energy-restore-row-v13';
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.alignItems = 'center';
  row.style.justifyContent = 'space-between';
  row.style.gap = '10px';
  row.style.padding = '12px';
  row.style.margin = '8px 0 14px';
  row.style.border = '1px dashed #94a3b8';
  row.style.borderRadius = '12px';

  const text = document.createElement('span');
  text.className = 'muted';
  text.textContent = 'Partie Energie supprimée pour ce rapport.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary mini';
  button.textContent = '+ Réactiver partie Energie';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const report = collectReportFromForm();
    disabledSectionKeysV13.delete('energie');
    report.disabledSections = Array.from(disabledSectionKeysV13);

    const snapshot = report.sections?.energie || disabledSectionSnapshotsV13.energie;
    if (snapshot) {
      report.sections.energie = clone(snapshot);
      report.sections.energie.disabled = false;
    }

    renderSections(report);
    if (typeof syncGeneralDateToRows === 'function') syncGeneralDateToRows($('#mainDate')?.value || '');
  });

  row.append(text, button);
  container.appendChild(row);
}

function decorateEnergySectionV13(container) {
  container.querySelector('.energy-restore-row-v13')?.remove();
  const section = container.querySelector('.excel-section[data-section="energie"]');

  if (disabledSectionKeysV13.has('energie')) {
    section?.remove();
    addEnergyRestoreControlV13(container);
    return;
  }

  if (!section || section.querySelector('.remove-energy-section-btn-v13')) return;
  const titleRow = section.querySelector('.section-title-row');
  if (!titleRow) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger mini remove-energy-section-btn-v13';
  button.textContent = 'Supprimer partie Energie';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    disabledSectionSnapshotsV13.energie = clone(collectSection(section));
    disabledSectionSnapshotsV13.energie.disabled = true;
    disabledSectionKeysV13.add('energie');
    section.remove();
    addEnergyRestoreControlV13(container);
  });

  titleRow.appendChild(button);
}

const renderSectionsBeforeEnergyV13 = renderSections;
renderSections = function renderSectionsWithEnergyToggleV13(report) {
  disabledSectionKeysV13 = disabledKeysFromReportV13(report);
  if (report?.sections?.energie) disabledSectionSnapshotsV13.energie = clone(report.sections.energie);

  renderSectionsBeforeEnergyV13(report);
  const container = $('#sectionsContainer');
  if (container) decorateEnergySectionV13(container);
};

const collectReportBeforeEnergyV13 = collectReportFromForm;
collectReportFromForm = function collectReportWithDisabledEnergyV13() {
  const report = collectReportBeforeEnergyV13();
  report.disabledSections = Array.from(disabledSectionKeysV13);

  if (disabledSectionKeysV13.has('energie')) {
    const snapshot = disabledSectionSnapshotsV13.energie || currentReport?.sections?.energie;
    if (snapshot) {
      report.sections.energie = clone(snapshot);
      report.sections.energie.disabled = true;
    }
  } else if (report.sections?.energie) {
    report.sections.energie.disabled = false;
  }

  return report;
};

const normalizeReportBeforeEnergyV13 = normalizeReport;
normalizeReport = function normalizeReportWithDisabledEnergyV13(report) {
  const normalized = normalizeReportBeforeEnergyV13(report);
  const disabled = disabledKeysFromReportV13(normalized);
  normalized.disabledSections = Array.from(disabled);
  if (normalized.sections?.energie) normalized.sections.energie.disabled = disabled.has('energie');
  return normalized;
};

const sectionReportHtmlBeforeEnergyV13 = sectionReportHtml;
sectionReportHtml = function sectionReportHtmlWithDisabledEnergyV13(section, photos, def) {
  if (section?.disabled === true) return '';
  return sectionReportHtmlBeforeEnergyV13(section, photos, def);
};

document.addEventListener('DOMContentLoaded', () => {
  const mainDate = $('#mainDate');
  const sync = () => syncDisabledEnergyDateV13(mainDate?.value || '');
  mainDate?.addEventListener('input', sync);
  mainDate?.addEventListener('change', sync);
});
