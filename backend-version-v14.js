'use strict';

/* Ne bloque plus l'application selon le numéro de version du backend.
   Les déploiements v14 et v15 restent compatibles, et tout backend qui répond
   correctement à setup peut enregistrer et synchroniser les rapports. */

const SUPPORTED_BACKEND_VERSIONS = new Set([
  'v14-google-sheet-layout',
  'v15-hide-empty-photo-columns'
]);

function backendIsUsable(setup) {
  return Boolean(setup && setup.ok === true);
}

function saveLocalOnlyBackendCompat(status, message) {
  const report = collectReportFromForm();
  if (!report.reportNo) report.reportNo = makeReportNo();
  upsertLocal(report);
  previewReport(report);
  setActiveTab('reportTab');
  toast(status, message, 'err');
}

const onSubmitBeforeBackendCompat = onSubmit;
onSubmit = async function onSubmitWithBackendCompat(event) {
  event.preventDefault();
  const status = $('#formStatus');

  if (!settings.apiUrl) {
    saveLocalOnlyBackendCompat(status, 'Sauvegardé localement. Apps Script URL manquant.');
    return;
  }

  try {
    const setup = await jsonp('setup');
    if (!backendIsUsable(setup)) {
      saveLocalOnlyBackendCompat(
        status,
        'Sauvegardé localement seulement. Google Apps Script ne répond pas correctement.'
      );
      return;
    }

    if (setup.version && !SUPPORTED_BACKEND_VERSIONS.has(setup.version)) {
      console.warn('Version Apps Script non reconnue:', setup.version);
    }
  } catch (error) {
    saveLocalOnlyBackendCompat(
      status,
      'Sauvegardé localement seulement. Vérification Google Sheets impossible: ' + error.message
    );
    return;
  }

  return onSubmitBeforeBackendCompat(event);
};

syncReports = async function syncReportsWithBackendCompat() {
  const status = $('#settingsStatus');
  settings.apiUrl = $('#apiUrl').value.trim();
  saveJson(LS_SETTINGS, settings);

  if (!settings.apiUrl) return toast(status, 'Ajoute Apps Script URL.', 'err');
  toast(status, 'Synchronisation...', 'warn');

  try {
    const setup = await jsonp('setup');
    if (!backendIsUsable(setup)) {
      throw new Error(setup?.error || 'Google Apps Script ne répond pas correctement.');
    }

    const response = await jsonp('listReports', { limit: 500 });
    if (!response.ok) throw new Error(response.error || 'Lecture refusée');

    mergeReports(response.reports || []);
    renderHistory();
    updateStats();
    toast(status, `Sync OK: ${(response.reports || []).length} rapports cloud.`, 'ok');
  } catch (error) {
    toast(status, 'Erreur sync: ' + error.message, 'err');
  }
};
