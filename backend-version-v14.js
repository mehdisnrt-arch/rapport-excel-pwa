'use strict';

const REQUIRED_BACKEND_VERSION_V15 = 'v15-hide-empty-photo-columns';

function backendIsCurrentV15(setup) {
  return setup && setup.ok === true && setup.version === REQUIRED_BACKEND_VERSION_V15;
}

function saveLocalOnlyV15(status, message) {
  const report = collectReportFromForm();
  if (!report.reportNo) report.reportNo = makeReportNo();
  upsertLocal(report);
  previewReport(report);
  setActiveTab('reportTab');
  toast(status, message, 'err');
}

const onSubmitBeforeBackendV15 = onSubmit;
onSubmit = async function onSubmitWithBackendVersionV15(event) {
  event.preventDefault();
  const status = $('#formStatus');

  if (!settings.apiUrl) {
    saveLocalOnlyV15(status, 'Sauvegardé localement. Apps Script URL manquant.');
    return;
  }

  try {
    const setup = await jsonp('setup');
    if (!backendIsCurrentV15(setup)) {
      saveLocalOnlyV15(
        status,
        'Sauvegardé localement seulement. Google Apps Script est ancien: remplace son code par Code-v15.gs puis déploie une nouvelle version.'
      );
      return;
    }
  } catch (error) {
    saveLocalOnlyV15(status, 'Sauvegardé localement seulement. Vérification Google Sheets impossible: ' + error.message);
    return;
  }

  return onSubmitBeforeBackendV15(event);
};

syncReports = async function syncReportsWithBackendVersionV15() {
  const status = $('#settingsStatus');
  settings.apiUrl = $('#apiUrl').value.trim();
  saveJson(LS_SETTINGS, settings);

  if (!settings.apiUrl) return toast(status, 'Ajoute Apps Script URL.', 'err');
  toast(status, 'Vérification Google Apps Script...', 'warn');

  try {
    const setup = await jsonp('setup');
    if (!backendIsCurrentV15(setup)) {
      return toast(
        status,
        'Google Apps Script ancien. Remplace son code par Code-v15.gs et déploie une nouvelle version avant Sync.',
        'err'
      );
    }

    const response = await jsonp('listReports', { limit: 500 });
    if (!response.ok) throw new Error(response.error || 'Lecture refusée');
    if (response.version !== REQUIRED_BACKEND_VERSION_V15) {
      throw new Error('Version Google Apps Script incorrecte.');
    }

    mergeReports(response.reports || []);
    renderHistory();
    updateStats();
    toast(status, `Sync OK: ${(response.reports || []).length} rapports cloud.`, 'ok');
  } catch (error) {
    toast(status, 'Erreur sync: ' + error.message, 'err');
  }
};