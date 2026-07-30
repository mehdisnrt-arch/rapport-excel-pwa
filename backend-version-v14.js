'use strict';

const REQUIRED_BACKEND_VERSION_V14 = 'v14-google-sheet-layout';

function backendIsCurrentV14(setup) {
  return setup && setup.ok === true && setup.version === REQUIRED_BACKEND_VERSION_V14;
}

function saveLocalOnlyV14(status, message) {
  const report = collectReportFromForm();
  if (!report.reportNo) report.reportNo = makeReportNo();
  upsertLocal(report);
  previewReport(report);
  setActiveTab('reportTab');
  toast(status, message, 'err');
}

const onSubmitBeforeBackendV14 = onSubmit;
onSubmit = async function onSubmitWithBackendVersionV14(event) {
  event.preventDefault();
  const status = $('#formStatus');

  if (!settings.apiUrl) {
    saveLocalOnlyV14(status, 'Sauvegardé localement. Apps Script URL manquant.');
    return;
  }

  try {
    const setup = await jsonp('setup');
    if (!backendIsCurrentV14(setup)) {
      saveLocalOnlyV14(
        status,
        'Sauvegardé localement seulement. Google Apps Script est ancien: remplace le code par apps-script/Code.gs puis déploie une nouvelle version.'
      );
      return;
    }
  } catch (error) {
    saveLocalOnlyV14(status, 'Sauvegardé localement seulement. Vérification Google Sheets impossible: ' + error.message);
    return;
  }

  return onSubmitBeforeBackendV14(event);
};

syncReports = async function syncReportsWithBackendVersionV14() {
  const status = $('#settingsStatus');
  settings.apiUrl = $('#apiUrl').value.trim();
  saveJson(LS_SETTINGS, settings);

  if (!settings.apiUrl) return toast(status, 'Ajoute Apps Script URL.', 'err');
  toast(status, 'Vérification Google Apps Script...', 'warn');

  try {
    const setup = await jsonp('setup');
    if (!backendIsCurrentV14(setup)) {
      return toast(
        status,
        'Google Apps Script ancien. Remplace son code par apps-script/Code.gs et déploie une nouvelle version avant Sync.',
        'err'
      );
    }

    const response = await jsonp('listReports', { limit: 500 });
    if (!response.ok) throw new Error(response.error || 'Lecture refusée');
    if (response.version !== REQUIRED_BACKEND_VERSION_V14) {
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
