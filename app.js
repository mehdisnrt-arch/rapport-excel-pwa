'use strict';

const LS_SETTINGS = 'rapport.excel.settings.v1';
const LS_REPORTS = 'rapport.excel.reports.v1';

const DEFAULTS = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxI66qHAU91KW4YP0KjQqkiMFX8WbzQ3cRqXmASemOpcSV2HVi6OeeZoKA4qJFKSyI0sg/exec',
  defaultOperator: 'EL MEHDI BENCHELH',
};

const SECTION_DEFS = [
  {
    key: 'tnt',
    title: '1/ Emetteurs TNT:',
    kind: 'tx',
    rows: [
      { service: 'Service1', fwdBefore: '50', refBefore: '1', tempBefore: '51', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '50', refAfter: '1', tempAfter: '51', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'Service2', fwdBefore: '50', refBefore: '1', tempBefore: '48', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '50', refAfter: '1', tempAfter: '48', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
    ],
    interventions: [
      'Soufflage et dépoussiérage de l’ensemble des parties internes de l’équipement',
      'Contrôle visuel/auditif',
      'Vérification de tous les modules,  Connecteurs et câbles',
      'Vérification de l’état des alimentations',
      'Dépoussiérage de la baie',
    ],
  },
  {
    key: 'fm',
    title: '2/ Emetteurs FM:',
    kind: 'tx',
    rows: [
      { service: 'SNRT-MED6', fwdBefore: '403', refBefore: '1', tempBefore: '47', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '403', refAfter: '1', tempAfter: '47', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Ojd', fwdBefore: '407', refBefore: '0', tempBefore: '42', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '407', refAfter: '0', tempAfter: '42', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Int', fwdBefore: '434', refBefore: '0', tempBefore: '51', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '434', refAfter: '0', tempAfter: '51', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Nat', fwdBefore: '407', refBefore: '1', tempBefore: '43', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '407', refAfter: '1', tempAfter: '43', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Amz', fwdBefore: '397', refBefore: '0', tempBefore: '46', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '397', refAfter: '0', tempAfter: '46', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
    ],
    interventions: [
      'Soufflage et dépoussiérage de l’ensemble des parties internes de l’équipement',
      'Contrôle visuel/auditif',
      'Vérification de tous les modules,  Connecteurs et câbles',
      'Vérification de l’état des alimentations',
      'Dépoussiérage de la baie',
    ],
  },
  {
    key: 'clim',
    title: '3/ Climatisation:',
    kind: 'clim',
    rows: [
      { service: 'Climatiseur', on: 'Non', tempCons: '18', tempSalle: '24', alarm: '-', type: '-', date: '', remarks: '-' },
    ],
    interventions: ['Contrôle visuel/auditif'],
  },
  {
    key: 'energie',
    title: '4/ Energie :',
    kind: 'energie',
    rows: [
      { service: 'GE 125KVA' },
    ],
    interventions: [
      'Contrôle visuel/auditif',
      'Démarrage d\'essai 5mn',
      'Dépoussiérage extérieur du GE',
      'Dépoussiérage des armoires électriques',
      'Vérification de tous les disjoncteurs,  Connecteurs et câbles',
    ],
  },
];

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

let settings = loadJson(LS_SETTINGS, DEFAULTS);
let reports = loadJson(LS_REPORTS, []);
let currentReport = null;
let photoBefore = null;
let photoAfter = null;
let deferredPrompt = null;

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch (_) {
    return structuredClone(fallback);
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function todayIso() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function formatDateFr(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return value;
}

function monthLabel(value) {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

function toast(node, msg, type = '') {
  node.textContent = msg;
  node.className = `status ${type}`.trim();
}

function setActiveTab(tabId) {
  $$('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  $$('.panel').forEach(panel => panel.classList.toggle('active', panel.id === tabId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function makeReportNo() {
  const date = ($('#mainDate')?.value || todayIso()).replaceAll('-', '');
  const todayReports = reports.filter(r => String(r.reportNo || '').includes(date)).length + 1;
  return `RPT-${date}-${String(todayReports).padStart(3, '0')}`;
}

function buildEmptyReport() {
  const date = todayIso();
  const sections = {};
  SECTION_DEFS.forEach(def => {
    sections[def.key] = {
      key: def.key,
      title: def.title,
      kind: def.kind,
      rows: clone(def.rows).map(row => ({ ...row, date: row.date ?? date })),
      interventions: clone(def.interventions),
    };
  });
  return {
    uid: crypto.randomUUID ? crypto.randomUUID() : `uid-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    reportNo: '',
    planning: '00161PLDEM2025',
    site: '',
    mainDate: date,
    period: monthLabel(date),
    operators: settings.defaultOperator || '',
    sections,
    photos: { before: null, after: null, beforeUrl: '', afterUrl: '' },
    createdAt: new Date().toISOString(),
    source: 'local',
  };
}

function init() {
  $('#apiUrl').value = settings.apiUrl || '';
  $('#defaultOperator').value = settings.defaultOperator || '';
  renderSections(buildEmptyReport());
  resetForm();
  renderHistory();
  updateStats();
  wireEvents();
  registerPwa();
  refreshNextNo();
}

function wireEvents() {
  $$('.tab').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
  $('#saveSettingsBtn').addEventListener('click', saveSettings);
  $('#testConnectionBtn').addEventListener('click', syncReports);
  $('#syncBtn').addEventListener('click', syncReports);
  $('#reportForm').addEventListener('submit', onSubmit);
  $('#previewBtn').addEventListener('click', () => previewReport(collectReportFromForm()));
  $('#resetBtn').addEventListener('click', resetForm);
  $('#searchBox').addEventListener('input', renderHistory);
  $('#monthFilter').addEventListener('input', renderHistory);
  $('#printBtn').addEventListener('click', () => window.print());
  $('#exportXlsBtn').addEventListener('click', exportCurrentXls);
  $('#copyReportBtn').addEventListener('click', copyReportHtml);
  $('#exportJsonBtn').addEventListener('click', exportJson);
  $('#importJson').addEventListener('change', importJson);
  $('#photoBefore').addEventListener('change', event => handlePhoto(event, 'before'));
  $('#photoAfter').addEventListener('change', event => handlePhoto(event, 'after'));
  $('#mainDate').addEventListener('change', () => {
    const d = $('#mainDate').value;
    if (!$('#period').value || $('#period').value === monthLabel(todayIso())) $('#period').value = monthLabel(d);
    $$('.row-date').forEach(input => { if (!input.value) input.value = d; });
    refreshNextNo(false);
  });
  $('#sectionsContainer').addEventListener('click', sectionClickHandler);
}

function saveSettings() {
  settings = {
    apiUrl: $('#apiUrl').value.trim(),
    defaultOperator: $('#defaultOperator').value.trim(),
  };
  saveJson(LS_SETTINGS, settings);
  toast($('#settingsStatus'), 'Réglages enregistrés.', 'ok');
  refreshNextNo();
}

function renderSections(report) {
  const container = $('#sectionsContainer');
  container.innerHTML = '';
  SECTION_DEFS.forEach(def => {
    const section = report.sections?.[def.key] || { ...def, rows: clone(def.rows), interventions: clone(def.interventions) };
    container.appendChild(renderSection(section));
  });
}

function renderSection(section) {
  const tpl = $('#sectionTemplate').content.cloneNode(true);
  const root = tpl.querySelector('.excel-section');
  root.dataset.section = section.key;
  root.dataset.kind = section.kind;
  tpl.querySelector('h3').textContent = section.title;
  const wrap = tpl.querySelector('.table-wrap');
  wrap.innerHTML = section.kind === 'tx' ? txTableHtml(section) : section.kind === 'clim' ? climTableHtml(section) : energyTableHtml(section);
  const ol = tpl.querySelector('ol');
  ol.innerHTML = section.interventions.map(text => `<li>${escapeHtml(text)}</li>`).join('');
  return tpl;
}

function inputCell(rowIndex, field, value, cls = '') {
  const type = field === 'date' ? 'date' : 'text';
  const extra = field === 'date' ? ' row-date' : '';
  return `<input class="${cls}${extra}" data-row="${rowIndex}" data-field="${field}" type="${type}" value="${escapeHtml(value)}" />`;
}

function txTableHtml(section) {
  const rows = section.rows.map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'service', row.service, 'service-input')}</td>
      <td>${inputCell(i, 'fwdBefore', row.fwdBefore)}</td>
      <td>${inputCell(i, 'refBefore', row.refBefore)}</td>
      <td>${inputCell(i, 'tempBefore', row.tempBefore)}</td>
      <td>${inputCell(i, 'alarmBefore', row.alarmBefore)}</td>
      <td>${inputCell(i, 'typeBefore', row.typeBefore)}</td>
      <td>${inputCell(i, 'fwdAfter', row.fwdAfter)}</td>
      <td>${inputCell(i, 'refAfter', row.refAfter)}</td>
      <td>${inputCell(i, 'tempAfter', row.tempAfter)}</td>
      <td>${inputCell(i, 'alarmAfter', row.alarmAfter)}</td>
      <td>${inputCell(i, 'typeAfter', row.typeAfter)}</td>
      <td>${inputCell(i, 'date', row.date)}</td>
      <td>${inputCell(i, 'remarks', row.remarks, 'remark-input')}</td>
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');
  return `
    <table class="excel-table">
      <thead>
        <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th><th rowspan="2"></th></tr>
        <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function climTableHtml(section) {
  const rows = section.rows.map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'service', row.service, 'service-input')}</td>
      <td>${inputCell(i, 'on', row.on)}</td>
      <td>${inputCell(i, 'tempCons', row.tempCons)}</td>
      <td>${inputCell(i, 'tempSalle', row.tempSalle)}</td>
      <td>${inputCell(i, 'alarm', row.alarm)}</td>
      <td>${inputCell(i, 'type', row.type)}</td>
      <td>${inputCell(i, 'date', row.date)}</td>
      <td>${inputCell(i, 'remarks', row.remarks, 'remark-input')}</td>
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');
  return `
    <table class="excel-table clim-table">
      <thead><tr><th>Service</th><th>ON</th><th>T. Cons.</th><th>T. Salle</th><th>Alarm</th><th>Type</th><th>Date</th><th>Remarques</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function energyTableHtml(section) {
  const rows = section.rows.map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'service', row.service, 'service-input')}</td>
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');
  return `
    <table class="excel-table energy-table" style="min-width:420px">
      <thead><tr><th>Service</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function sectionClickHandler(event) {
  const sectionRoot = event.target.closest('.excel-section');
  if (!sectionRoot) return;
  if (event.target.classList.contains('add-row-btn')) {
    addRow(sectionRoot);
  } else if (event.target.classList.contains('delete-row-btn')) {
    const tbody = sectionRoot.querySelector('tbody');
    if (tbody.rows.length <= 1) return;
    event.target.closest('tr').remove();
    reindexSection(sectionRoot);
  }
}

function addRow(sectionRoot) {
  const kind = sectionRoot.dataset.kind;
  const tbody = sectionRoot.querySelector('tbody');
  const idx = tbody.rows.length;
  const d = $('#mainDate').value || todayIso();
  let rowHtml;
  if (kind === 'tx') {
    const row = { service: '', fwdBefore: '', refBefore: '', tempBefore: '', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '', refAfter: '', tempAfter: '', alarmAfter: 'Non', typeAfter: '-', date: d, remarks: '-' };
    rowHtml = txTableHtml({ rows: [row] }).match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  } else if (kind === 'clim') {
    const row = { service: '', on: 'Non', tempCons: '', tempSalle: '', alarm: '-', type: '-', date: d, remarks: '-' };
    rowHtml = climTableHtml({ rows: [row] }).match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  } else {
    const row = { service: '' };
    rowHtml = energyTableHtml({ rows: [row] }).match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  }
  tbody.insertAdjacentHTML('beforeend', rowHtml);
}

function reindexSection(sectionRoot) {
  Array.from(sectionRoot.querySelectorAll('tbody tr')).forEach((tr, rowIndex) => {
    tr.querySelectorAll('input').forEach(input => input.dataset.row = rowIndex);
  });
}

function collectSection(sectionRoot) {
  const key = sectionRoot.dataset.section;
  const def = SECTION_DEFS.find(s => s.key === key);
  const rows = Array.from(sectionRoot.querySelectorAll('tbody tr')).map(tr => {
    const row = {};
    tr.querySelectorAll('input').forEach(input => row[input.dataset.field] = input.value.trim());
    return row;
  });
  return { key, title: def.title, kind: def.kind, rows, interventions: clone(def.interventions) };
}

function collectReportFromForm() {
  const report = {
    uid: currentReport?.uid || (crypto.randomUUID ? crypto.randomUUID() : `uid-${Date.now()}`),
    reportNo: $('#reportNo').value.trim() || makeReportNo(),
    planning: $('#planning').value.trim(),
    site: $('#site').value.trim(),
    mainDate: $('#mainDate').value,
    period: $('#period').value.trim(),
    operators: $('#operators').value.trim(),
    sections: {},
    photos: {
      before: photoBefore,
      after: photoAfter,
      beforeUrl: currentReport?.photos?.beforeUrl || '',
      afterUrl: currentReport?.photos?.afterUrl || '',
    },
    createdAt: currentReport?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'local',
  };
  $$('#sectionsContainer .excel-section').forEach(sectionRoot => {
    const section = collectSection(sectionRoot);
    report.sections[section.key] = section;
  });
  return report;
}

function fillForm(report) {
  currentReport = clone(report);
  $('#reportNo').value = report.reportNo || makeReportNo();
  $('#reportNoBadge').textContent = $('#reportNo').value;
  $('#planning').value = report.planning || '00161PLDEM2025';
  $('#site').value = report.site || '';
  $('#mainDate').value = report.mainDate || todayIso();
  $('#period').value = report.period || monthLabel($('#mainDate').value);
  $('#operators').value = report.operators || settings.defaultOperator || '';
  renderSections(report);
  photoBefore = report.photos?.before || null;
  photoAfter = report.photos?.after || null;
  setPhotoPreview('before', report.photos?.before?.dataUrl || report.photos?.beforeUrl || '');
  setPhotoPreview('after', report.photos?.after?.dataUrl || report.photos?.afterUrl || '');
}

function resetForm() {
  const r = buildEmptyReport();
  r.reportNo = makeReportNo();
  fillForm(r);
  toast($('#formStatus'), '', '');
  $('#photoBefore').value = '';
  $('#photoAfter').value = '';
  refreshNextNo();
}

async function refreshNextNo(showErrors = true) {
  const localNo = makeReportNo();
  $('#reportNo').value = $('#reportNo').value || localNo;
  $('#reportNoBadge').textContent = $('#reportNo').value;
  if (!settings.apiUrl) return;
  try {
    const res = await jsonp('nextNumber');
    if (res?.ok && res.nextNumber && (!currentReport || !reports.some(r => r.uid === currentReport.uid))) {
      $('#reportNo').value = res.nextNumber;
      $('#reportNoBadge').textContent = res.nextNumber;
    }
  } catch (err) {
    if (showErrors) console.warn(err);
  }
}

async function handlePhoto(event, which) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = $('#formStatus');
  toast(status, 'Compression photo...', 'warn');
  try {
    const compressed = await compressImage(file, 1280, 0.68);
    const data = { name: file.name, type: 'image/jpeg', dataUrl: compressed, size: Math.round((compressed.length * 3) / 4) };
    if (which === 'before') photoBefore = data;
    else photoAfter = data;
    setPhotoPreview(which, compressed);
    toast(status, 'Photo ajoutée.', 'ok');
  } catch (err) {
    toast(status, 'Erreur photo: ' + err.message, 'err');
  }
}

function setPhotoPreview(which, src) {
  const img = which === 'before' ? $('#previewBefore') : $('#previewAfter');
  if (src) img.src = src;
  else img.removeAttribute('src');
}

function compressImage(file, maxSize = 1280, quality = 0.68) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function onSubmit(event) {
  event.preventDefault();
  const status = $('#formStatus');
  const report = collectReportFromForm();
  if (!report.mainDate) return toast(status, 'Date générale obligatoire.', 'err');
  if (!report.reportNo) report.reportNo = makeReportNo();
  upsertLocal(report);
  previewReport(report);
  setActiveTab('reportTab');
  toast(status, 'Sauvegarde locale OK. Envoi vers Google Sheets...', 'warn');
  if (!settings.apiUrl) {
    return toast(status, 'Sauvegardé localement. Ajoute Apps Script URL pour synchroniser.', 'warn');
  }
  try {
    await postNoCors(settings.apiUrl, { action: 'saveReport', payload: JSON.stringify(report) });
    toast(status, 'Envoyé vers Google Sheets. Clique Sync pour vérifier.', 'ok');
    setTimeout(syncReports, 1800);
  } catch (err) {
    toast(status, 'Local OK, mais envoi impossible: ' + err.message, 'err');
  }
}

function upsertLocal(report) {
  const idx = reports.findIndex(r => r.uid === report.uid || r.reportNo === report.reportNo);
  if (idx >= 0) reports[idx] = report;
  else reports.unshift(report);
  saveJson(LS_REPORTS, reports);
  currentReport = clone(report);
  renderHistory();
  updateStats();
}

function postNoCors(url, data) {
  const body = new URLSearchParams(data);
  return fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
}

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!settings.apiUrl) return reject(new Error('Apps Script URL manquant'));
    const callback = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(settings.apiUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callback);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const script = document.createElement('script');
    const timer = setTimeout(() => cleanup(new Error('Timeout Apps Script')), 15000);
    function cleanup(err, value) {
      clearTimeout(timer);
      script.remove();
      delete window[callback];
      err ? reject(err) : resolve(value);
    }
    window[callback] = data => cleanup(null, data);
    script.onerror = () => cleanup(new Error('Connexion impossible'));
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function syncReports() {
  const status = $('#settingsStatus');
  toast(status, 'Synchronisation...', 'warn');
  saveSettings();
  try {
    const setup = await jsonp('setup');
    if (!setup?.ok) throw new Error(setup?.error || 'Setup impossible');
    const res = await jsonp('listReports', { limit: 500 });
    if (!res?.ok) throw new Error(res?.error || 'Lecture impossible');
    const cloud = Array.isArray(res.reports) ? res.reports : [];
    mergeReports(cloud);
    toast(status, `Sync OK: ${cloud.length} rapport(s).`, 'ok');
    renderHistory();
    updateStats();
    refreshNextNo(false);
  } catch (err) {
    toast(status, 'Erreur Sync: ' + err.message, 'err');
  }
}

function mergeReports(cloudReports) {
  const map = new Map();
  [...cloudReports, ...reports].forEach(r => {
    const key = r.uid || r.reportNo;
    if (!key) return;
    const existing = map.get(key);
    if (!existing || new Date(r.updatedAt || r.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
      map.set(key, r);
    }
  });
  reports = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  saveJson(LS_REPORTS, reports);
}

function renderHistory() {
  const list = $('#historyList');
  const q = ($('#searchBox')?.value || '').toLowerCase().trim();
  const m = $('#monthFilter')?.value || '';
  let filtered = reports.slice();
  if (q) {
    filtered = filtered.filter(r => [r.reportNo, r.site, r.planning, r.period, r.operators].join(' ').toLowerCase().includes(q));
  }
  if (m) filtered = filtered.filter(r => (r.mainDate || '').startsWith(m));
  if (!filtered.length) {
    list.innerHTML = '<p class="muted">Aucun rapport.</p>';
    return;
  }
  list.innerHTML = filtered.map((r, idx) => `
    <article class="history-item">
      <h3><span>${escapeHtml(r.reportNo || 'Sans N°')}</span></h3>
      <div class="history-meta">
        <span>${escapeHtml(formatDateFr(r.mainDate))}</span>
        <span>${escapeHtml(r.site || 'Site vide')}</span>
        <span>${escapeHtml(r.period || '')}</span>
        <span>${escapeHtml(r.operators || '')}</span>
      </div>
      <div class="actions small-actions">
        <button type="button" class="secondary" data-action="view" data-idx="${reports.indexOf(r)}">Voir rapport</button>
        <button type="button" class="ghost-dark" data-action="edit" data-idx="${reports.indexOf(r)}">Modifier</button>
        <button type="button" class="danger" data-action="delete" data-idx="${reports.indexOf(r)}">Supprimer local</button>
      </div>
    </article>`).join('');
  list.querySelectorAll('button[data-action]').forEach(btn => btn.addEventListener('click', historyAction));
}

function historyAction(event) {
  const btn = event.currentTarget;
  const idx = Number(btn.dataset.idx);
  const report = reports[idx];
  if (!report) return;
  if (btn.dataset.action === 'view') {
    previewReport(report);
    setActiveTab('reportTab');
  } else if (btn.dataset.action === 'edit') {
    fillForm(report);
    setActiveTab('formTab');
  } else if (btn.dataset.action === 'delete') {
    if (!confirm('Supprimer ce rapport seulement de ce téléphone ?')) return;
    reports.splice(idx, 1);
    saveJson(LS_REPORTS, reports);
    renderHistory();
    updateStats();
  }
}

function updateStats() {
  $('#statTotal').textContent = reports.length;
  const month = todayIso().slice(0, 7);
  $('#statMonth').textContent = reports.filter(r => (r.mainDate || '').startsWith(month)).length;
  $('#statLocal').textContent = reports.filter(r => r.source !== 'cloud').length;
  $('#statLast').textContent = reports[0]?.reportNo || '—';
}

function previewReport(report) {
  currentReport = clone(report);
  $('#reportOutput').innerHTML = reportHtml(report);
}

function reportHtml(report) {
  const sections = SECTION_DEFS.map(def => sectionReportHtml(report.sections?.[def.key] || def)).join('');
  const beforeSrc = report.photos?.beforeUrl || report.photos?.before?.dataUrl || '';
  const afterSrc = report.photos?.afterUrl || report.photos?.after?.dataUrl || '';
  return `<article class="report-sheet" id="printableReport">
    <h1 class="report-title">Rapport de Maintenance</h1>
    <table class="meta-table">
      <tr><td>N° Rapport</td><td>${escapeHtml(report.reportNo)}</td><td>Planning</td><td>${escapeHtml(report.planning)}</td></tr>
      <tr><td>Site</td><td>${escapeHtml(report.site)}</td><td>Date</td><td>${escapeHtml(formatDateFr(report.mainDate))}</td></tr>
      <tr><td>Période</td><td>${escapeHtml(report.period)}</td><td>Opérateurs</td><td>${escapeHtml(report.operators)}</td></tr>
    </table>
    ${sections}
    <div class="section-name">Photos avant / après</div>
    <div class="photos-report">
      <figure><figcaption>Photo avant</figcaption>${beforeSrc ? `<img src="${escapeHtml(beforeSrc)}" alt="Photo avant">` : '<p>Aucune photo avant</p>'}</figure>
      <figure><figcaption>Photo après</figcaption>${afterSrc ? `<img src="${escapeHtml(afterSrc)}" alt="Photo après">` : '<p>Aucune photo après</p>'}</figure>
    </div>
  </article>`;
}

function sectionReportHtml(section) {
  if (section.kind === 'tx') return txReportHtml(section);
  if (section.kind === 'clim') return climReportHtml(section);
  return energyReportHtml(section);
}

function txReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td>
    <td>${escapeHtml(row.fwdBefore)}</td><td>${escapeHtml(row.refBefore)}</td><td>${escapeHtml(row.tempBefore)}</td><td>${escapeHtml(row.alarmBefore)}</td><td>${escapeHtml(row.typeBefore)}</td>
    <td>${escapeHtml(row.fwdAfter)}</td><td>${escapeHtml(row.refAfter)}</td><td>${escapeHtml(row.tempAfter)}</td><td>${escapeHtml(row.alarmAfter)}</td><td>${escapeHtml(row.typeAfter)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>
  </tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div>
    <table class="excel-report-table">
      <thead>
        <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th></tr>
        <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
      </thead><tbody>${rows}</tbody>
    </table>${interventionsReportHtml(section.interventions)}`;
}

function climReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td><td>${escapeHtml(row.on)}</td><td>${escapeHtml(row.tempCons)}</td><td>${escapeHtml(row.tempSalle)}</td><td>${escapeHtml(row.alarm)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>
  </tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div>
    <table class="excel-report-table">
      <thead><tr><th>Service</th><th>ON</th><th>T. Cons.</th><th>T. Salle</th><th>Alarm</th><th>Type</th><th>Date</th><th>Remarques</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${interventionsReportHtml(section.interventions)}`;
}

function energyReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.service)}</td></tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div>
    <table class="excel-report-table"><thead><tr><th>Service</th></tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function interventionsReportHtml(items = []) {
  return `<div class="interventions-title">Interventions sur site:</div><ol class="interventions-list">${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`;
}

function exportCurrentXls() {
  const html = $('#reportOutput').innerHTML || reportHtml(collectReportFromForm());
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, `${currentReport?.reportNo || 'rapport-maintenance'}.xls`);
}

async function copyReportHtml() {
  const html = $('#reportOutput').innerHTML;
  if (!html) return alert('Aucun rapport à copier.');
  await navigator.clipboard.writeText(html);
  alert('Rapport HTML copié.');
}

function exportJson() {
  const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `backup-rapports-${todayIso()}.json`);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Format invalide');
      mergeReports(imported);
      renderHistory();
      updateStats();
      alert('Backup importé.');
    } catch (err) {
      alert('Import impossible: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function registerPwa() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    $('#installBtn').classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#installBtn').classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', init);
