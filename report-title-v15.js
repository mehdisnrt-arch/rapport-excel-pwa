'use strict';

const reportHtmlBeforeTitleV15 = reportHtml;
reportHtml = function reportHtmlWithMissionTitleV15(report) {
  return reportHtmlBeforeTitleV15(report)
    .replace(/Rapport de Maintenance/gi, 'RAPPORT DE MISSION');
};