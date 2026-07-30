'use strict';

/* Ajustements sans migration ni changement des clés LocalStorage.
   Les anciennes valeurs N° rapport, planning et champs Satellite restent
   conservées dans les données, même si elles ne sont plus affichées. */

const satelliteDef = SECTION_DEFS.find(section => section.key === 'satellite');
if (satelliteDef) {
  satelliteDef.rows = [{ service: 'Réception satellite', cn: '', niveau: '', qualite: '', date: '', remarks: '', photoDataUrl: '' }];
  satelliteDef.interventions = [];
}

function hiddenCellValue(rowIndex, field, value) {
  return `<input data-row="${rowIndex}" data-field="${field}" type="hidden" value="${escapeHtml(value || '')}" />`;
}

function energyTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'unite', row.unite || row.service || '', 'service-input')}</td>
      <td>${inputCell(i, 'marque', row.marque || '')}</td>
      <td>${inputCell(i, 'puissance', row.puissance || '')}</td>
      <td>${inputCell(i, 'uout', row.uout || '')}</td>
      <td>${inputCell(i, 'frequence', row.frequence || '')}</td>
      <td>${inputCell(i, 'ubatterie', row.ubatterie || '')}</td>
      <td>${inputCell(i, 'compteur', row.compteur || '')}</td>
      <td>${inputCell(i, 'tempHuile', row.tempHuile || '')}</td>
      <td>${inputCell(i, 'pressionHuile', row.pressionHuile || '')}</td>
      <td>${inputCell(i, 'date', row.date || '')}</td>
      <td>${inputCell(i, 'remarks', row.remarks || '', 'remark-input')}</td>
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn" aria-label="Supprimer la ligne">×</button></td>
    </tr>`).join('');
  return `<table class="excel-table energy-table">
    <thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence (HZ)</th><th>U. Batterie</th><th>Compteur (h)</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th><th>Photo</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function satelliteTableHtml(section) {
  const sourceRows = section.rows?.length ? section.rows : [{}];
  const rows = sourceRows.map((row, i) => `
    <tr>
      <td class="satellite-cn-cell">${inputCell(i, 'cn', row.cn || '')}
        ${hiddenCellValue(i, 'service', row.service || 'Réception satellite')}
        ${hiddenCellValue(i, 'niveau', row.niveau || '')}
        ${hiddenCellValue(i, 'qualite', row.qualite || '')}
        ${hiddenCellValue(i, 'date', row.date || '')}
        ${hiddenCellValue(i, 'remarks', row.remarks || '')}
        ${hiddenCellValue(i, 'photoDataUrl', row.photoDataUrl || row.photo?.dataUrl || row.photoUrl || '')}
      </td>
    </tr>`).join('');
  return `<table class="excel-table satellite-table satellite-cn-only">
    <thead><tr><th>C/N (dB)</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function renderSection(section, photos) {
  const def = SECTION_DEFS.find(item => item.key === section.key) || section;
  const sectionPhoto = normalizePhotos(photos)[section.key] || { beforeUrl: '', afterUrl: '' };
  const tpl = $('#sectionTemplate').content.cloneNode(true);
  const root = tpl.querySelector('.excel-section');
  root.dataset.section = section.key;
  root.dataset.kind = section.kind;
  tpl.querySelector('h3').textContent = section.title;

  const addBtn = tpl.querySelector('.add-row-btn');
  addBtn.style.display = section.kind === 'satellite' ? 'none' : '';

  const wrap = tpl.querySelector('.table-wrap');
  if (section.kind === 'tx') wrap.innerHTML = txTableHtml(section);
  else if (section.kind === 'clim') wrap.innerHTML = climTableHtml(section);
  else if (section.kind === 'satellite') wrap.innerHTML = satelliteTableHtml(section);
  else wrap.innerHTML = energyTableHtml(section);

  const onsiteBox = tpl.querySelector('.onsite-box');
  const ol = tpl.querySelector('ol');
  if (section.kind === 'satellite') {
    onsiteBox.remove();
  } else {
    ol.innerHTML = (section.interventions || def.interventions || []).map(text => `<li>${escapeHtml(text)}</li>`).join('');
  }

  const photosBox = tpl.querySelector('.section-photos');
  if (section.kind === 'satellite') {
    photosBox.remove();
  } else {
    photosBox.dataset.photoSection = section.key;
    photosBox.querySelector('h4').textContent = def.photoTitle || `Photos ${section.title}`;
    photosBox.querySelectorAll('.photo-input').forEach(input => input.dataset.photoSection = section.key);
    const before = sectionPhoto.before?.dataUrl || sectionPhoto.beforeUrl || '';
    const after = sectionPhoto.after?.dataUrl || sectionPhoto.afterUrl || '';
    if (before) photosBox.querySelector('.preview-before').src = before;
    if (after) photosBox.querySelector('.preview-after').src = after;
  }
  return tpl;
}

function addRow(sectionRoot) {
  const kind = sectionRoot.dataset.kind;
  const tbody = sectionRoot.querySelector('tbody');
  const idx = tbody.rows.length;
  let rowHtml;
  if (kind === 'tx') {
    rowHtml = txTableHtml({ rows: [{ service: '', fwdBefore: '', refBefore: '', tempBefore: '', alarmBefore: '', typeBefore: '', fwdAfter: '', refAfter: '', tempAfter: '', alarmAfter: '', typeAfter: '', date: '', remarks: '', photoDataUrl: '' }] });
  } else if (kind === 'clim') {
    rowHtml = climTableHtml({ rows: [{ service: '', on: '', tempCons: '', tempSalle: '', alarm: '', type: '', date: '', remarks: '', photoDataUrl: '' }] });
  } else if (kind === 'energie') {
    rowHtml = energyTableHtml({ rows: [{ unite: '', marque: '', puissance: '', uout: '', frequence: '', ubatterie: '', compteur: '', tempHuile: '', pressionHuile: '', date: '', remarks: '', photoDataUrl: '' }] });
  } else {
    return;
  }
  rowHtml = rowHtml.match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  tbody.insertAdjacentHTML('beforeend', rowHtml);
}

function clearTableRow(row) {
  row.querySelectorAll('input').forEach(input => {
    input.value = '';
  });
  row.querySelectorAll('img').forEach(img => img.removeAttribute('src'));
}

function sectionClickHandler(event) {
  const sectionRoot = event.target.closest('.excel-section');
  if (!sectionRoot) return;
  if (event.target.classList.contains('add-row-btn')) {
    addRow(sectionRoot);
    return;
  }
  if (!event.target.classList.contains('delete-row-btn')) return;
  const tbody = sectionRoot.querySelector('tbody');
  const row = event.target.closest('tr');
  if (!tbody || !row) return;
  if (tbody.rows.length > 1) row.remove();
  else clearTableRow(row);
  reindexSection(sectionRoot);
}

function rowHasUsefulData(kind, row) {
  if (!row) return false;
  if (kind === 'satellite') return hasText(row.cn);
  const ignored = kind === 'energie' ? [] : ['service'];
  return Object.entries(row).some(([key, value]) => !ignored.includes(key) && hasText(value));
}

function rowPhotoSource(row) {
  return row?.photoDataUrl || row?.photo?.dataUrl || row?.photoUrl || '';
}

function rowsContainPhotos(rows = []) {
  return rows.some(row => Boolean(rowPhotoSource(row)));
}

function txReportHtml(section) {
  const showPhoto = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td>
    <td>${escapeHtml(row.fwdBefore)}</td><td>${escapeHtml(row.refBefore)}</td><td>${escapeHtml(row.tempBefore)}</td><td>${escapeHtml(row.alarmBefore)}</td><td>${escapeHtml(row.typeBefore)}</td>
    <td>${escapeHtml(row.fwdAfter)}</td><td>${escapeHtml(row.refAfter)}</td><td>${escapeHtml(row.tempAfter)}</td><td>${escapeHtml(row.alarmAfter)}</td><td>${escapeHtml(row.typeAfter)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>${showPhoto ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead>
    <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th>${showPhoto ? '<th rowspan="2">Photo</th>' : ''}</tr>
    <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
    </thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function climReportHtml(section) {
  const showPhoto = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.service)}</td><td>${escapeHtml(row.on)}</td><td>${escapeHtml(row.tempCons)}</td><td>${escapeHtml(row.tempSalle)}</td><td>${escapeHtml(row.alarm)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>${showPhoto ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead><tr><th>Climatiseur</th><th>ON</th><th>T. Cons.</th><th>T. Salle</th><th>Alarm</th><th>Type</th><th>Date</th><th>Remarques</th>${showPhoto ? '<th>Photo</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function energyReportHtml(section) {
  const showPhoto = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.unite || row.service)}</td><td>${escapeHtml(row.marque)}</td><td>${escapeHtml(row.puissance)}</td><td>${escapeHtml(row.uout)}</td><td>${escapeHtml(row.frequence)}</td><td>${escapeHtml(row.ubatterie)}</td><td>${escapeHtml(row.compteur)}</td><td>${escapeHtml(row.tempHuile)}</td><td>${escapeHtml(row.pressionHuile)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>${showPhoto ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table energy-report-table"><thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence</th><th>U. Batterie</th><th>Compteur</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th>${showPhoto ? '<th>Photo</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function satelliteReportHtml(section) {
  const rows = (section.rows || []).filter(row => hasText(row.cn)).map(row => `<tr><td>${escapeHtml(row.cn)}</td></tr>`).join('');
  if (!rows) return '';
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table satellite-report-table"><thead><tr><th>C/N (dB)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function reportHtml(report) {
  const sections = SECTION_DEFS.map(def => sectionReportHtml(report.sections?.[def.key] || def, report.photos?.[def.key], def)).join('');
  return `<article class="report-sheet" id="printableReport">
    <h1 class="report-title">Rapport de Maintenance</h1>
    <table class="meta-table">
      <tr><td>Centre</td><td>${escapeHtml(report.site)}</td><td>Date</td><td>${escapeHtml(formatDateFr(report.mainDate))}</td></tr>
      <tr><td>Période</td><td>${escapeHtml(report.period)}</td><td>Opérateurs</td><td>${escapeHtml(report.operators)}</td></tr>
    </table>
    ${sections || '<p class="muted empty-report">Aucune partie remplie.</p>'}
  </article>`;
}

function ensureDirectSheetButton() {
  let button = document.querySelector('#directSheetBtn');
  if (button) return button;
  const actions = document.querySelector('.report-actions-card .actions');
  if (!actions) return null;
  button = document.createElement('button');
  button.id = 'directSheetBtn';
  button.type = 'button';
  button.className = 'secondary hidden';
  button.addEventListener('click', () => {
    if (button.dataset.url) window.open(button.dataset.url, '_blank', 'noopener');
  });
  actions.prepend(button);
  return button;
}

function updateDirectSheetButton(report) {
  const button = ensureDirectSheetButton();
  if (!button) return;
  const url = report?.sheetUrl || '';
  if (!url) {
    button.dataset.url = '';
    button.classList.add('hidden');
    return;
  }
  button.dataset.url = url;
  button.textContent = `Google Sheet — ${report.site || 'Centre'}`;
  button.classList.remove('hidden');
}

function previewReport(report) {
  const normalized = normalizeReport(report);
  currentReport = clone(normalized);
  $('#reportOutput').innerHTML = reportHtml(normalized);
  updateDirectSheetButton(normalized);
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findCloudReportWithSheet(report) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await waitMs(attempt === 0 ? 1800 : 2200);
    await syncReports();
    const cloud = reports.find(item => item.uid === report.uid || item.reportNo === report.reportNo);
    if (cloud?.sheetUrl) return cloud;
  }
  return reports.find(item => item.uid === report.uid || item.reportNo === report.reportNo) || null;
}

async function onSubmit(event) {
  event.preventDefault();
  const status = $('#formStatus');
  const report = collectReportFromForm();
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
    toast(status, 'Envoyé vers Google Sheets. Recherche du lien du centre...', 'ok');
    const cloudReport = await findCloudReportWithSheet(report);
    if (cloudReport) {
      currentReport = clone(cloudReport);
      updateDirectSheetButton(cloudReport);
    }
    if (cloudReport?.sheetUrl) toast(status, `Google Sheet ${cloudReport.site || 'Centre'} prêt.`, 'ok');
    else toast(status, 'Rapport envoyé. Fais Sync si le lien Google Sheet ne paraît pas encore.', 'warn');
  } catch (err) {
    toast(status, 'Local OK, mais envoi impossible: ' + err.message, 'err');
  }
}

function hideInternalReportFields() {
  $('#reportNo')?.closest('label')?.classList.add('hidden');
  $('#planning')?.closest('label')?.classList.add('hidden');
  $('#reportNoBadge')?.classList.add('hidden');
  ensureDirectSheetButton();
}

document.addEventListener('DOMContentLoaded', hideInternalReportFields);
