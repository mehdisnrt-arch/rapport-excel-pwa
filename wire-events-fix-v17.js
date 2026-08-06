'use strict';

/* Corrige les identifiants des boutons actuels et évite qu'un élément absent
   bloque complètement l'initialisation de l'application. */
wireEvents = function wireEventsSafeV17() {
  $$('.tab').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

  $('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  $('#testConnectionBtn')?.addEventListener('click', syncReports);
  $('#syncBtn')?.addEventListener('click', syncReports);
  $('#reportForm')?.addEventListener('submit', onSubmit);
  $('#previewBtn')?.addEventListener('click', () => previewReport(collectReportFromForm()));
  $('#resetBtn')?.addEventListener('click', resetForm);
  $('#searchBox')?.addEventListener('input', renderHistory);
  $('#monthFilter')?.addEventListener('input', renderHistory);
  $('#printBtn')?.addEventListener('click', () => window.print());
  $('#exportXlsBtn')?.addEventListener('click', exportCurrentXls);

  const copyButton = $('#copyHtmlBtn') || $('#copyReportBtn');
  copyButton?.addEventListener('click', copyReportHtml);

  $('#exportJsonBtn')?.addEventListener('click', exportJson);
  const importInput = $('#importJsonInput') || $('#importJson');
  importInput?.addEventListener('change', importJson);

  $('#mainDate')?.addEventListener('change', () => {
    const d = $('#mainDate')?.value || '';
    const period = $('#period');
    if (period && (!period.value || period.value === monthLabel(todayIso()))) {
      period.value = monthLabel(d);
    }
    $$('.row-date').forEach(input => {
      if (!input.value) input.value = d;
    });
    refreshNextNo(false);
  });

  $('#sectionsContainer')?.addEventListener('click', sectionClickHandler);
  $('#sectionsContainer')?.addEventListener('change', sectionChangeHandler);
};
