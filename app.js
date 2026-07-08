'use strict';

const LS_SETTINGS = 'rapport.excel.settings.v2.section.photos';
const LS_REPORTS = 'rapport.excel.reports.v2.section.photos';

const DEFAULTS = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxI66qHAU91KW4YP0KjQqkiMFX8WbzQ3cRqXmASemOpcSV2HVi6OeeZoKA4qJFKSyI0sg/exec',
  defaultOperator: 'EL MEHDI BENCHELH'
};

const SECTION_PHOTO_KEYS = ['tnt', 'fm', 'clim', 'energie'];

const SECTION_DEFS = [
  {
    key: 'tnt',
    title: '1/ Emetteurs TNT:',
    kind: 'tx',
    photoTitle: 'Photos TNT',
    rows: [
      { service: 'Service1', fwdBefore: '50', refBefore: '1', tempBefore: '51', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '50', refAfter: '1', tempAfter: '51', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'Service2', fwdBefore: '50', refBefore: '1', tempBefore: '48', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '50', refAfter: '1', tempAfter: '48', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' }
    ],
    interventions: [
      'Soufflage et dépoussiérage de l’ensemble des parties internes de l’équipement',
      'Contrôle visuel/auditif',
      'Vérification de tous les modules,  Connecteurs et câbles',
      'Vérification de l’état des alimentations',
      'Dépoussiérage de la baie'
    ]
  },
  {
    key: 'fm',
    title: '2/ Emetteurs FM:',
    kind: 'tx',
    photoTitle: 'Photos FM',
    rows: [
      { service: 'SNRT-MED6', fwdBefore: '403', refBefore: '1', tempBefore: '47', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '403', refAfter: '1', tempAfter: '47', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Ojd', fwdBefore: '407', refBefore: '0', tempBefore: '42', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '407', refAfter: '0', tempAfter: '42', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Int', fwdBefore: '434', refBefore: '0', tempBefore: '51', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '434', refAfter: '0', tempAfter: '51', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Nat', fwdBefore: '407', refBefore: '1', tempBefore: '43', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '407', refAfter: '1', tempAfter: '43', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' },
      { service: 'SNRT-Amz', fwdBefore: '397', refBefore: '0', tempBefore: '46', alarmBefore: 'Non', typeBefore: '-', fwdAfter: '397', refAfter: '0', tempAfter: '46', alarmAfter: 'Non', typeAfter: '-', date: '', remarks: '-' }
    ],
    interventions: [
      'Soufflage et dépoussiérage de l’ensemble des parties internes de l’équipement',
      'Contrôle visuel/auditif',
      'Vérification de tous les modules,  Connecteurs et câbles',
      'Vérification de l’état des alimentations',
      'Dépoussiérage de la baie'
    ]
  },
  {
    key: 'clim',
    title: '3/ Climatisation:',
    kind: 'clim',
    photoTitle: 'Photos Climatisation',
    rows: [
      { service: 'Climatiseur', on: 'Non', tempCons: '18', tempSalle: '24', alarm: '-', type: '-', date: '', remarks: '-' }
    ],
    interventions: ['Contrôle visuel/auditif']
  },
  {
    key: 'energie',
    title: '4/ Energie :',
    kind: 'energie',
    photoTitle: 'Photos Energie',
    rows: [
      { unite: 'GE 125KVA', marque: 'Jlm', puissance: '125KVA', uout: '', frequence: '', ubatterie: '', compteur: '', tempHuile: '', pressionHuile: '', date: '', remarks: '-' }
    ],
    interventions: [
      'Contrôle visuel/auditif',
      'Démarrage d\'essai 5mn',
      'Dépoussiérage extérieur du GE',
      'Dépoussiérage des armoires électriques',
      'Vérification de tous les disjoncteurs,  Connecteurs et câbles'
    ]
  }
];

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

let settings = loadJson(LS_SETTINGS, DEFAULTS);
let reports = loadJson(LS_REPORTS, []);
let currentReport = null;
let sectionPhotos = emptyPhotos();
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

function emptyPhotos() {
  const out = {};
  SECTION_PHOTO_KEYS.forEach(key => {
    out[key] = { before: null, after: null, beforeUrl: '', afterUrl: '' };
  });
  return out;
}

function normalizePhotos(photos) {
  const out = emptyPhotos();
  SECTION_PHOTO_KEYS.forEach(key => {
    const p = photos && photos[key] ? photos[key] : {};
    out[key] = {
      before: p.before || null,
      after: p.after || null,
      beforeUrl: p.beforeUrl || '',
      afterUrl: p.afterUrl || ''
    };
  });

  // Compatibilité avec ancienne version: photos.before / photos.after à la fin.
  if (photos && (photos.before || photos.after || photos.beforeUrl || photos.afterUrl)) {
    out.energie.before = out.energie.before || photos.before || null;
    out.energie.after = out.energie.after || photos.after || null;
    out.energie.beforeUrl = out.energie.beforeUrl || photos.beforeUrl || '';
    out.energie.afterUrl = out.energie.afterUrl || photos.afterUrl || '';
  }
  return out;
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
      photoTitle: def.photoTitle,
      rows: clone(def.rows).map(row => ({ ...row, date: row.date ?? date })),
      interventions: clone(def.interventions)
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
    photos: emptyPhotos(),
    createdAt: new Date().toISOString(),
    source: 'local'
  };
}

function init() {
  $('#apiUrl').value = settings.apiUrl || '';
  $('#defaultOperator').value = settings.defaultOperator || '';
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
  $('#mainDate').addEventListener('change', () => {
    const d = $('#mainDate').value;
    if (!$('#period').value || $('#period').value === monthLabel(todayIso())) $('#period').value = monthLabel(d);
    $$('.row-date').forEach(input => { if (!input.value) input.value = d; });
    refreshNextNo(false);
  });
  $('#sectionsContainer').addEventListener('click', sectionClickHandler);
  $('#sectionsContainer').addEventListener('change', sectionChangeHandler);
}

function saveSettings() {
  settings = {
    apiUrl: $('#apiUrl').value.trim(),
    defaultOperator: $('#defaultOperator').value.trim()
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
    container.appendChild(renderSection(section, report.photos));
  });
}

function renderSection(section, photos) {
  const def = SECTION_DEFS.find(s => s.key === section.key) || section;
  const sectionPhoto = normalizePhotos(photos)[section.key] || { beforeUrl: '', afterUrl: '' };
  const tpl = $('#sectionTemplate').content.cloneNode(true);
  const root = tpl.querySelector('.excel-section');
  root.dataset.section = section.key;
  root.dataset.kind = section.kind;
  tpl.querySelector('h3').textContent = section.title;
  const addBtn = tpl.querySelector('.add-row-btn');
  addBtn.style.display = section.kind === 'energie' ? 'none' : '';
  const wrap = tpl.querySelector('.table-wrap');
  wrap.innerHTML = section.kind === 'tx' ? txTableHtml(section) : section.kind === 'clim' ? climTableHtml(section) : energyTableHtml(section);
  const ol = tpl.querySelector('ol');
  ol.innerHTML = (section.interventions || def.interventions || []).map(text => `<li>${escapeHtml(text)}</li>`).join('');
  const photosBox = tpl.querySelector('.section-photos');
  photosBox.dataset.photoSection = section.key;
  photosBox.querySelector('h4').textContent = def.photoTitle || `Photos ${section.title}`;
  photosBox.querySelectorAll('.photo-input').forEach(input => input.dataset.photoSection = section.key);
  const before = sectionPhoto.before?.dataUrl || sectionPhoto.beforeUrl || '';
  const after = sectionPhoto.after?.dataUrl || sectionPhoto.afterUrl || '';
  if (before) photosBox.querySelector('.preview-before').src = before;
  if (after) photosBox.querySelector('.preview-after').src = after;
  return tpl;
}

function inputCell(rowIndex, field, value, cls = '') {
  const type = field === 'date' ? 'date' : 'text';
  const extra = field === 'date' ? ' row-date' : '';
  return `<input class="${cls}${extra}" data-row="${rowIndex}" data-field="${field}" type="${type}" value="${escapeHtml(value)}" />`;
}

function txTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
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
    <table class="excel-table tx-table">
      <thead>
        <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th><th rowspan="2"></th></tr>
        <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function climTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
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
  const rows = (section.rows || []).map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'unite', row.unite || row.service || 'GE 125KVA', 'service-input')}</td>
      <td>${inputCell(i, 'marque', row.marque || 'Jlm')}</td>
      <td>${inputCell(i, 'puissance', row.puissance || '125KVA')}</td>
      <td>${inputCell(i, 'uout', row.uout || '')}</td>
      <td>${inputCell(i, 'frequence', row.frequence || '')}</td>
      <td>${inputCell(i, 'ubatterie', row.ubatterie || '')}</td>
      <td>${inputCell(i, 'compteur', row.compteur || '')}</td>
      <td>${inputCell(i, 'tempHuile', row.tempHuile || '')}</td>
      <td>${inputCell(i, 'pressionHuile', row.pressionHuile || '')}</td>
      <td>${inputCell(i, 'date', row.date || '')}</td>
      <td>${inputCell(i, 'remarks', row.remarks || '-', 'remark-input')}</td>
    </tr>`).join('');
  return `
    <table class="excel-table energy-table">
      <thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence (HZ)</th><th>U. Batterie</th><th>Compteur (h)</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th></tr></thead>
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

function sectionChangeHandler(event) {
  if (!event.target.classList.contains('photo-input')) return;
  const sectionKey = event.target.dataset.photoSection;
  const which = event.target.dataset.photoKind;
  handleSectionPhoto(event, sectionKey, which);
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
    return;
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
  return { key, title: def.title, kind: def.kind, photoTitle: def.photoTitle, rows, interventions: clone(def.interventions) };
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
    photos: clone(sectionPhotos),
    createdAt: currentReport?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'local'
  };
  $$('#sectionsContainer .excel-section').forEach(sectionRoot => {
    const section = collectSection(sectionRoot);
    report.sections[section.key] = section;
  });
  return report;
}

function fillForm(report) {
  const normalized = clone(report);
  normalized.photos = normalizePhotos(normalized.photos);
  currentReport = normalized;
  sectionPhotos = clone(normalized.photos);
  $('#reportNo').value = normalized.reportNo || makeReportNo();
  $('#reportNoBadge').textContent = $('#reportNo').value;
  $('#planning').value = normalized.planning || '00161PLDEM2025';
  $('#site').value = normalized.site || '';
  $('#mainDate').value = normalized.mainDate || todayIso();
  $('#period').value = normalized.period || monthLabel($('#mainDate').value);
  $('#operators').value = normalized.operators || settings.defaultOperator || '';
  renderSections(normalized);
}

function resetForm() {
  const r = buildEmptyReport();
  r.reportNo = makeReportNo();
  fillForm(r);
  toast($('#formStatus'), '', '');
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

async function handleSectionPhoto(event, sectionKey, which) {
  const file = event.target.files?.[0];
  if (!file || !SECTION_PHOTO_KEYS.includes(sectionKey)) return;
  const status = $('#formStatus');
  toast(status, 'Compression photo...', 'warn');
  try {
    const compressed = await compressImage(file, 1000, 0.55);
    const data = { name: file.name, type: 'image/jpeg', dataUrl: compressed, size: Math.round((compressed.length * 3) / 4) };
    if (!sectionPhotos[sectionKey]) sectionPhotos[sectionKey] = { before: null, after: null, beforeUrl: '', afterUrl: '' };
    sectionPhotos[sectionKey][which] = data;
    setSectionPhotoPreview(sectionKey, which, compressed);
    toast(status, 'Photo ajoutée.', 'ok');
  } catch (err) {
    toast(status, 'Erreur photo: ' + err.message, 'err');
  }
}

function setSectionPhotoPreview(sectionKey, which, src) {
  const box = document.querySelector(`.section-photos[data-photo-section="${sectionKey}"]`);
  if (!box) return;
  const img = box.querySelector(which === 'before' ? '.preview-before' : '.preview-after');
  if (src) img.src = src;
  else img.removeAttribute('src');
}

function compressImage(file, maxSize = 1000, quality = 0.55) {
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
  const normalized = clone(report);
  normalized.photos = normalizePhotos(normalized.photos);
  const idx = reports.findIndex(r => r.uid === normalized.uid || r.reportNo === normalized.reportNo);
  if (idx >= 0) reports[idx] = normalized;
  else reports.unshift(normalized);
  saveJson(LS_REPORTS, reports);
  currentReport = clone(normalized);
  sectionPhotos = clone(normalized.photos);
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
    const callback = `cb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const url = new URL(settings.apiUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callback);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const script = document.createElement('script');
    const timer = setTimeout(() => cleanup(new Error('Timeout Apps Script')), 18000);
    window[callback] = data => cleanup(null, data);
    function cleanup(err, data) {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      err ? reject(err) : resolve(data);
    }
    script.onerror = () => cleanup(new Error('Connexion impossible'));
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function syncReports() {
  const status = $('#settingsStatus');
  settings.apiUrl = $('#apiUrl').value.trim();
  saveJson(LS_SETTINGS, settings);
  if (!settings.apiUrl) return toast(status, 'Ajoute Apps Script URL.', 'err');
  toast(status, 'Synchronisation...', 'warn');
  try {
    const setup = await jsonp('setup');
    if (!setup.ok) throw new Error(setup.error || 'Setup refusé');
    const res = await jsonp('listReports', { limit: 500 });
    if (!res.ok) throw new Error(res.error || 'Lecture refusée');
    mergeReports(res.reports || []);
    renderHistory();
    updateStats();
    toast(status, `Sync OK: ${(res.reports || []).length} rapports cloud.`, 'ok');
  } catch (err) {
    toast(status, 'Erreur sync: ' + err.message, 'err');
  }
}

function mergeReports(cloudReports) {
  const map = new Map();
  reports.forEach(r => map.set(r.uid || r.reportNo, normalizeReport(r)));
  cloudReports.forEach(r => {
    const normalized = normalizeReport(r);
    map.set(normalized.uid || normalized.reportNo, normalized);
  });
  reports = Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  saveJson(LS_REPORTS, reports);
}

function normalizeReport(report) {
  const r = clone(report);
  r.photos = normalizePhotos(r.photos);
  if (!r.sections) r.sections = buildEmptyReport().sections;
  // compatibilité énergie ancienne version
  if (r.sections.energie && r.sections.energie.rows) {
    r.sections.energie.rows = r.sections.energie.rows.map(row => ({
      unite: row.unite || row.service || 'GE 125KVA',
      marque: row.marque || 'Jlm',
      puissance: row.puissance || '125KVA',
      uout: row.uout || '',
      frequence: row.frequence || '',
      ubatterie: row.ubatterie || '',
      compteur: row.compteur || '',
      tempHuile: row.tempHuile || '',
      pressionHuile: row.pressionHuile || '',
      date: row.date || r.mainDate || '',
      remarks: row.remarks || '-'
    }));
  }
  return r;
}

function renderHistory() {
  const q = ($('#searchBox')?.value || '').toLowerCase().trim();
  const m = $('#monthFilter')?.value || '';
  const list = $('#historyList');
  if (!list) return;
  const filtered = reports.filter(r => {
    const hay = `${r.reportNo} ${r.site} ${r.operators} ${r.period}`.toLowerCase();
    const okQ = !q || hay.includes(q);
    const okM = !m || String(r.mainDate || '').startsWith(m);
    return okQ && okM;
  });
  if (!filtered.length) {
    list.innerHTML = '<p class="muted">Aucun rapport.</p>';
    return;
  }
  list.innerHTML = filtered.map((r, idx) => `
    <article class="history-item">
      <h3><span>${escapeHtml(r.reportNo || 'Rapport')}</span>${r.sheetUrl ? `<a href="${escapeHtml(r.sheetUrl)}" target="_blank" rel="noopener">Ouvrir Google Sheet</a>` : ''}</h3>
      <div class="history-meta"><span>${escapeHtml(formatDateFr(r.mainDate))}</span><span>${escapeHtml(r.site || 'Site vide')}</span><span>${escapeHtml(r.period || '')}</span><span>${escapeHtml(r.source || 'local')}</span></div>
      <div class="actions small-actions">
        <button type="button" class="secondary" onclick="openHistoryReport(${idx})">Voir</button>
        <button type="button" class="ghost-dark" onclick="editHistoryReport(${idx})">Modifier</button>
        <button type="button" class="danger" onclick="deleteHistoryReport(${idx})">Supprimer local</button>
      </div>
    </article>`).join('');
  window.__filteredReports = filtered;
}

window.openHistoryReport = function(index) {
  const report = window.__filteredReports[index];
  if (!report) return;
  previewReport(report);
  setActiveTab('reportTab');
};

window.editHistoryReport = function(index) {
  const report = window.__filteredReports[index];
  if (!report) return;
  fillForm(report);
  setActiveTab('formTab');
};

window.deleteHistoryReport = function(index) {
  const report = window.__filteredReports[index];
  if (!report) return;
  if (!confirm('Supprimer ce rapport localement ?')) return;
  reports = reports.filter(r => (r.uid || r.reportNo) !== (report.uid || report.reportNo));
  saveJson(LS_REPORTS, reports);
  renderHistory();
  updateStats();
};

function updateStats() {
  const nowMonth = todayIso().slice(0, 7);
  $('#statTotal').textContent = reports.length;
  $('#statMonth').textContent = reports.filter(r => String(r.mainDate || '').startsWith(nowMonth)).length;
  $('#statLocal').textContent = reports.filter(r => r.source !== 'cloud').length;
  $('#statLast').textContent = reports[0]?.reportNo || '—';
}

function previewReport(report) {
  const normalized = normalizeReport(report);
  currentReport = clone(normalized);
  $('#reportOutput').innerHTML = reportHtml(normalized);
}

function reportHtml(report) {
  const sections = SECTION_DEFS.map(def => sectionReportHtml(report.sections?.[def.key] || def, report.photos?.[def.key], def)).join('');
  return `<article class="report-sheet" id="printableReport">
    <h1 class="report-title">Rapport de Maintenance</h1>
    <table class="meta-table">
      <tr><td>N° Rapport</td><td>${escapeHtml(report.reportNo)}</td><td>Planning</td><td>${escapeHtml(report.planning)}</td></tr>
      <tr><td>Site</td><td>${escapeHtml(report.site)}</td><td>Date</td><td>${escapeHtml(formatDateFr(report.mainDate))}</td></tr>
      <tr><td>Période</td><td>${escapeHtml(report.period)}</td><td>Opérateurs</td><td>${escapeHtml(report.operators)}</td></tr>
    </table>
    ${sections}
  </article>`;
}

function sectionReportHtml(section, photos, def) {
  const body = section.kind === 'tx' ? txReportHtml(section) : section.kind === 'clim' ? climReportHtml(section) : energyReportHtml(section);
  return body + sectionPhotosReportHtml(photos, def.photoTitle || section.photoTitle || section.title);
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
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.unite || row.service)}</td><td>${escapeHtml(row.marque)}</td><td>${escapeHtml(row.puissance)}</td><td>${escapeHtml(row.uout)}</td><td>${escapeHtml(row.frequence)}</td><td>${escapeHtml(row.ubatterie)}</td><td>${escapeHtml(row.compteur)}</td><td>${escapeHtml(row.tempHuile)}</td><td>${escapeHtml(row.pressionHuile)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>
  </tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div>
    <table class="excel-report-table energy-report-table"><thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence (HZ)</th><th>U. Batterie</th><th>Compteur (h)</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th></tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function interventionsReportHtml(items = []) {
  return `<div class="interventions-title">Interventions sur site:</div><ol class="interventions-list">${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`;
}

function sectionPhotosReportHtml(photos, title) {
  const p = photos || {};
  const beforeSrc = p.beforeUrl || p.before?.dataUrl || '';
  const afterSrc = p.afterUrl || p.after?.dataUrl || '';
  return `<div class="photos-subtitle">${escapeHtml(title || 'Photos')}</div>
    <div class="photos-report section-photos-report">
      <figure><figcaption>Photo avant</figcaption>${beforeSrc ? `<img src="${escapeHtml(beforeSrc)}" alt="Photo avant">` : '<p>Aucune photo avant</p>'}</figure>
      <figure><figcaption>Photo après</figcaption>${afterSrc ? `<img src="${escapeHtml(afterSrc)}" alt="Photo après">` : '<p>Aucune photo après</p>'}</figure>
    </div>`;
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
