'use strict';

/* Récupère sans suppression les rapports stockés par d'anciennes versions
   dans localStorage. Les données existantes restent prioritaires. */
(function localReportRecoveryV20() {
  const CANONICAL_KEY = 'rapport.excel.reports.v4.final.centres';

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function looksLikeReport(value) {
    if (!isObject(value)) return false;
    if (isObject(value.sections)) return true;
    const fields = ['uid', 'reportNo', 'mainDate', 'site', 'planning', 'operators', 'period', 'createdAt', 'updatedAt'];
    return fields.filter(field => value[field] !== undefined && value[field] !== null && value[field] !== '').length >= 2;
  }

  function arraysFromValue(value) {
    const arrays = [];
    if (Array.isArray(value)) arrays.push(value);
    if (isObject(value)) {
      ['reports', 'rapports', 'items', 'data'].forEach(key => {
        if (Array.isArray(value[key])) arrays.push(value[key]);
      });
    }
    return arrays;
  }

  function reportKey(report) {
    if (report.uid) return `uid:${report.uid}`;
    if (report.reportNo) return `no:${report.reportNo}`;
    return `sig:${report.mainDate || ''}|${report.site || ''}|${report.planning || ''}|${report.createdAt || ''}`;
  }

  function reportTime(report) {
    const value = report.updatedAt || report.createdAt || '';
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function collectAllLocalReports() {
    const found = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      let parsed;
      try {
        parsed = JSON.parse(localStorage.getItem(key));
      } catch (_) {
        continue;
      }
      arraysFromValue(parsed).forEach(array => {
        array.forEach(item => {
          if (looksLikeReport(item)) found.push(item);
        });
      });
    }
    return found;
  }

  function ensureRecoveryUi() {
    if (document.querySelector('#recoverLocalBtn')) return;
    const historyCard = document.querySelector('#historyTab .card');
    if (!historyCard) return;

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.margin = '0 0 14px';

    const button = document.createElement('button');
    button.id = 'recoverLocalBtn';
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Récupérer anciens rapports';

    const status = document.createElement('p');
    status.id = 'recoveryStatus';
    status.className = 'status';
    status.style.margin = '0';

    row.append(button, status);
    historyCard.prepend(row);
  }

  function recoverLocalReports(showMessage = false) {
    let canonical = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(CANONICAL_KEY) || '[]');
      if (Array.isArray(parsed)) canonical = parsed.filter(looksLikeReport);
    } catch (_) {}

    const candidates = collectAllLocalReports();
    const map = new Map();
    [...canonical, ...candidates].forEach(report => {
      const key = reportKey(report);
      const previous = map.get(key);
      if (!previous || reportTime(report) >= reportTime(previous)) map.set(key, report);
    });

    const merged = Array.from(map.values()).sort((a, b) => reportTime(b) - reportTime(a));
    const beforeKeys = new Set(canonical.map(reportKey));
    const added = merged.filter(report => !beforeKeys.has(reportKey(report))).length;

    if (merged.length) {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(merged));
      try { reports = merged.map(item => typeof normalizeReport === 'function' ? normalizeReport(item) : item); } catch (_) {}
      try { renderHistory(); } catch (_) {}
      try { updateStats(); } catch (_) {}
    }

    if (showMessage) {
      ensureRecoveryUi();
      const status = document.querySelector('#recoveryStatus');
      if (status) {
        status.textContent = added > 0
          ? `Récupération terminée : ${added} ancien(s) rapport(s) retrouvé(s).`
          : merged.length > 0
            ? `Aucun rapport supplémentaire. ${merged.length} rapport(s) local(aux) sont déjà présents.`
            : 'Aucun rapport local trouvé dans ce navigateur. Il faut les récupérer depuis Google Sheets avec Sync.';
        status.className = `status ${merged.length ? 'ok' : 'warn'}`;
      }
    }

    return { total: merged.length, added };
  }

  window.recoverLocalReportsV20 = () => recoverLocalReports(true);

  document.addEventListener('DOMContentLoaded', () => {
    ensureRecoveryUi();
    recoverLocalReports(false);
    document.querySelector('#recoverLocalBtn')?.addEventListener('click', () => recoverLocalReports(true));
  });
})();
