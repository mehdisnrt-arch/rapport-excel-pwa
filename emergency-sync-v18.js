'use strict';

/* Correctif de secours chargé directement depuis index.html.
   Il ne dépend pas des anciens fichiers en cache, sécurise l'initialisation
   et affiche la vraie cause lorsqu'Apps Script ne répond pas au Sync. */
(function emergencySyncV18() {
  const VERSION = 'v18-direct-sync-diagnostics';
  const SETTINGS_KEY = 'rapport.excel.settings.v4.final.centres';

  function setStatusV18(message, type = '') {
    const node = document.querySelector('#settingsStatus');
    if (!node) return;
    node.textContent = message;
    node.className = `status ${type}`.trim();
  }

  function normalizedApiUrlV18(raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('Apps Script URL manquant.');
    let url;
    try {
      url = new URL(value);
    } catch (_) {
      throw new Error('Apps Script URL invalide.');
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\//i.test(url.href)) {
      throw new Error('Utilise le lien Apps Script Web app qui se termine par /exec.');
    }
    if (!/\/exec\/?$/i.test(url.pathname)) {
      throw new Error('Le lien Apps Script doit se terminer par /exec, pas /dev.');
    }
    return url.href;
  }

  function jsonpRequestV18(apiUrl, action, params = {}, timeoutMs = 22000) {
    return new Promise((resolve, reject) => {
      const callback = `rapportSyncV18_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const url = new URL(apiUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('callback', callback);
      url.searchParams.set('_v', VERSION);
      url.searchParams.set('_t', String(Date.now()));
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

      const script = document.createElement('script');
      let finished = false;
      const timer = setTimeout(() => finish(new Error(`Timeout ${action}: Apps Script n'a pas renvoyé de réponse JSONP.`)), timeoutMs);

      function finish(error, data) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        script.remove();
        error ? reject(error) : resolve(data);
      }

      window[callback] = data => finish(null, data);
      script.onerror = () => finish(new Error(`Connexion impossible pendant ${action}.`));
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  async function fetchRequestV18(apiUrl, action, params = {}) {
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('_v', VERSION);
    url.searchParams.set('_t', String(Date.now()));
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      credentials: 'omit'
    });
    const text = await response.text();
    if (/<!doctype html|<html/i.test(text)) {
      throw new Error('Apps Script renvoie une page Google au lieu de JSON. Le déploiement n’est probablement pas accessible à tout le monde.');
    }
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error('Réponse Apps Script non valide: ' + text.slice(0, 100));
    }
  }

  async function requestV18(apiUrl, action, params = {}) {
    try {
      return await jsonpRequestV18(apiUrl, action, params);
    } catch (jsonpError) {
      try {
        return await fetchRequestV18(apiUrl, action, params);
      } catch (fetchError) {
        throw new Error(`${jsonpError.message} ${fetchError.message}`.trim());
      }
    }
  }

  function friendlyErrorV18(error) {
    const message = String(error?.message || error || 'Erreur inconnue');
    if (/page Google|accessible à tout le monde|Timeout|Connexion impossible/i.test(message)) {
      return 'Échec Sync: le Web app Apps Script n’est pas public ou la version /exec n’est pas déployée. Dans Apps Script: Deploy → Manage deployments → Edit → New version; Execute as Me; Who has access Anyone.';
    }
    return 'Échec Sync: ' + message;
  }

  async function robustSyncV18() {
    const button = document.querySelector('#testConnectionBtn');
    const input = document.querySelector('#apiUrl');
    const originalText = button?.textContent || 'Tester / Sync';

    try {
      const apiUrl = normalizedApiUrlV18(input?.value);
      if (typeof settings === 'object' && settings) settings.apiUrl = apiUrl;
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        saved.apiUrl = apiUrl;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
      } catch (_) {}

      if (button) {
        button.disabled = true;
        button.textContent = 'Connexion...';
      }
      setStatusV18('1/3 Test du déploiement Apps Script...', 'warn');

      const ping = await requestV18(apiUrl, 'ping');
      if (!ping || typeof ping !== 'object') throw new Error('Réponse ping vide.');

      setStatusV18(`2/3 Apps Script répond${ping.version ? ` (${ping.version})` : ''}. Préparation Google Sheets...`, 'warn');
      const setup = await requestV18(apiUrl, 'setup');
      if (!setup?.ok) throw new Error(setup?.error || 'Setup refusé par Apps Script.');

      setStatusV18('3/3 Lecture des rapports...', 'warn');
      const response = await requestV18(apiUrl, 'listReports', { limit: 500 });
      if (!response?.ok) throw new Error(response?.error || 'Lecture refusée par Apps Script.');

      if (typeof mergeReports === 'function') mergeReports(response.reports || []);
      if (typeof renderHistory === 'function') renderHistory();
      if (typeof updateStats === 'function') updateStats();
      setStatusV18(`Sync OK (${VERSION}): ${(response.reports || []).length} rapports cloud.`, 'ok');
    } catch (error) {
      console.error('Sync v18:', error);
      setStatusV18(friendlyErrorV18(error), 'err');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  window.robustSyncV18 = robustSyncV18;
  try { syncReports = robustSyncV18; } catch (_) {}

  /* Remplace la fonction de câblage avant init(), afin qu'aucun bouton absent
     ne puisse bloquer le démarrage complet de l'application. */
  try {
    wireEvents = function wireEventsSafeV18() {
      document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
      document.querySelector('#saveSettingsBtn')?.addEventListener('click', saveSettings);
      document.querySelector('#testConnectionBtn')?.addEventListener('click', robustSyncV18);
      document.querySelector('#reportForm')?.addEventListener('submit', onSubmit);
      document.querySelector('#previewBtn')?.addEventListener('click', () => previewReport(collectReportFromForm()));
      document.querySelector('#resetBtn')?.addEventListener('click', resetForm);
      document.querySelector('#searchBox')?.addEventListener('input', renderHistory);
      document.querySelector('#monthFilter')?.addEventListener('input', renderHistory);
      document.querySelector('#printBtn')?.addEventListener('click', () => window.print());
      document.querySelector('#exportXlsBtn')?.addEventListener('click', exportCurrentXls);
      (document.querySelector('#copyHtmlBtn') || document.querySelector('#copyReportBtn'))?.addEventListener('click', copyReportHtml);
      document.querySelector('#exportJsonBtn')?.addEventListener('click', exportJson);
      (document.querySelector('#importJsonInput') || document.querySelector('#importJson'))?.addEventListener('change', importJson);
      document.querySelector('#mainDate')?.addEventListener('change', () => {
        const date = document.querySelector('#mainDate')?.value || '';
        const period = document.querySelector('#period');
        if (period && (!period.value || period.value === monthLabel(todayIso()))) period.value = monthLabel(date);
        document.querySelectorAll('.row-date').forEach(item => { if (!item.value) item.value = date; });
        refreshNextNo(false);
      });
      document.querySelector('#sectionsContainer')?.addEventListener('click', sectionClickHandler);
      document.querySelector('#sectionsContainer')?.addEventListener('change', sectionChangeHandler);
    };
  } catch (_) {}

  document.addEventListener('DOMContentLoaded', () => {
    const current = document.querySelector('#testConnectionBtn');
    if (!current) return;
    const replacement = current.cloneNode(true);
    current.replaceWith(replacement);
    replacement.addEventListener('click', robustSyncV18);
    replacement.title = VERSION;
  });
})();
