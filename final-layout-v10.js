'use strict';

/* Mise en page finale, sans migration destructive :
   - uniquement des photos par ligne, plusieurs photos autorisées
   - anciennes photos avant/après conservées dans les données mais masquées
   - Climatisation sans ON / Alarm / Type à l'affichage
   - Energie sans Unité / Marque à l'affichage
   - Satellite avec C/N et photos */

function parsePhotoList(row = {}) {
  const values = [];
  const add = value => {
    if (typeof value === 'string' && value.trim() && !values.includes(value)) values.push(value);
  };

  if (Array.isArray(row.photoDataUrls)) row.photoDataUrls.forEach(add);
  else if (typeof row.photoDataUrls === 'string') {
    try {
      const parsed = JSON.parse(row.photoDataUrls);
      if (Array.isArray(parsed)) parsed.forEach(add);
    } catch (_) {
      add(row.photoDataUrls);
    }
  }

  if (Array.isArray(row.photos)) {
    row.photos.forEach(photo => add(typeof photo === 'string' ? photo : photo?.dataUrl || photo?.url || ''));
  }

  add(row.photoDataUrl);
  add(row.photo?.dataUrl);
  add(row.photoUrl);
  return values;
}

function hiddenCellValue(rowIndex, field, value) {
  return `<input data-row="${rowIndex}" data-field="${field}" type="hidden" value="${escapeHtml(value || '')}" />`;
}

function photoPreviewItems(photos) {
  return photos.map((src, index) => `
    <span class="row-photo-thumb-wrap">
      <img class="row-photo-preview" src="${escapeHtml(src)}" alt="Photo équipement ${index + 1}" />
      <button type="button" class="remove-row-photo-btn" data-photo-index="${index}" aria-label="Supprimer cette photo">×</button>
    </span>`).join('');
}

function rowPhotoCell(rowIndex, row = {}) {
  const photos = parsePhotoList(row);
  return `<td class="row-photo-cell">
    <label class="row-photo-button">+ Photos
      <input class="row-photo-input" data-row="${rowIndex}" type="file" accept="image/*" multiple />
    </label>
    <input class="row-photo-data" data-row="${rowIndex}" data-field="photoDataUrlsJson" type="hidden" value="${escapeHtml(JSON.stringify(photos))}" />
    <div class="row-photo-previews">${photoPreviewItems(photos)}</div>
  </td>`;
}

function updateRowPhotoCell(cell, photos) {
  const clean = Array.from(new Set((photos || []).filter(Boolean)));
  const hidden = cell.querySelector('.row-photo-data');
  if (hidden) hidden.value = JSON.stringify(clean);
  const box = cell.querySelector('.row-photo-previews');
  if (box) box.innerHTML = photoPreviewItems(clean);
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
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');

  return `<table class="excel-table tx-table">
    <thead>
      <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th><th rowspan="2">Photos</th><th rowspan="2"></th></tr>
      <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
    </thead><tbody>${rows}</tbody></table>`;
}

function climTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'service', row.service || 'Climatiseur', 'service-input')}
        ${hiddenCellValue(i, 'on', row.on || '')}
        ${hiddenCellValue(i, 'alarm', row.alarm || '')}
        ${hiddenCellValue(i, 'type', row.type || '')}
      </td>
      <td>${inputCell(i, 'tempCons', row.tempCons || '')}</td>
      <td>${inputCell(i, 'tempSalle', row.tempSalle || '')}</td>
      <td>${inputCell(i, 'date', row.date || '')}</td>
      <td>${inputCell(i, 'remarks', row.remarks || '', 'remark-input')}</td>
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');

  return `<table class="excel-table clim-table clim-table-simple">
    <thead><tr><th>Climatiseur</th><th>T. Cons.</th><th>T. Salle</th><th>Date</th><th>Remarques</th><th>Photos</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function energyTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
    <tr>
      <td>${inputCell(i, 'puissance', row.puissance || '')}
        ${hiddenCellValue(i, 'unite', row.unite || row.service || '')}
        ${hiddenCellValue(i, 'marque', row.marque || '')}
      </td>
      <td>${inputCell(i, 'uout', row.uout || '')}</td>
      <td>${inputCell(i, 'frequence', row.frequence || '')}</td>
      <td>${inputCell(i, 'ubatterie', row.ubatterie || '')}</td>
      <td>${inputCell(i, 'compteur', row.compteur || '')}</td>
      <td>${inputCell(i, 'tempHuile', row.tempHuile || '')}</td>
      <td>${inputCell(i, 'pressionHuile', row.pressionHuile || '')}</td>
      <td>${inputCell(i, 'date', row.date || '')}</td>
      <td>${inputCell(i, 'remarks', row.remarks || '', 'remark-input')}</td>
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');

  return `<table class="excel-table energy-table energy-table-simple">
    <thead><tr><th>Puissance</th><th>U. out</th><th>Fréquence (HZ)</th><th>U. Batterie</th><th>Compteur (h)</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th><th>Photos</th><th></th></tr></thead>
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
      </td>
      ${rowPhotoCell(i, row)}
    </tr>`).join('');

  return `<table class="excel-table satellite-table satellite-cn-only">
    <thead><tr><th>C/N (dB)</th><th>Photos</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function renderSection(section) {
  const def = SECTION_DEFS.find(item => item.key === section.key) || section;
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
  if (section.kind === 'satellite') onsiteBox.remove();
  else {
    const ol = tpl.querySelector('ol');
    ol.innerHTML = (section.interventions || def.interventions || []).map(text => `<li>${escapeHtml(text)}</li>`).join('');
  }

  // Suppression définitive de l'interface Photo avant / Photo après.
  tpl.querySelector('.section-photos')?.remove();
  return tpl;
}

async function handleRowPhoto(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const cell = event.target.closest('.row-photo-cell');
  const status = $('#formStatus');
  const hidden = cell?.querySelector('.row-photo-data');
  let photos = [];
  try { photos = JSON.parse(hidden?.value || '[]'); } catch (_) { photos = []; }
  if (!Array.isArray(photos)) photos = [];

  toast(status, `Compression de ${files.length} photo(s)...`, 'warn');
  try {
    for (const file of files) {
      const compressed = await compressImage(file, 760, 0.45);
      if (!photos.includes(compressed)) photos.push(compressed);
    }
    updateRowPhotoCell(cell, photos);
    event.target.value = '';
    toast(status, `${files.length} photo(s) ajoutée(s). Total: ${photos.length}.`, 'ok');
  } catch (err) {
    toast(status, 'Erreur photo: ' + err.message, 'err');
  }
}

function sectionChangeHandler(event) {
  if (event.target.classList.contains('row-photo-input')) handleRowPhoto(event);
}

function clearTableRow(row) {
  row.querySelectorAll('input:not([type="file"])').forEach(input => { input.value = ''; });
  row.querySelectorAll('.row-photo-previews').forEach(box => { box.innerHTML = ''; });
}

function sectionClickHandler(event) {
  const removePhotoBtn = event.target.closest('.remove-row-photo-btn');
  if (removePhotoBtn) {
    const cell = removePhotoBtn.closest('.row-photo-cell');
    const hidden = cell?.querySelector('.row-photo-data');
    let photos = [];
    try { photos = JSON.parse(hidden?.value || '[]'); } catch (_) { photos = []; }
    photos.splice(Number(removePhotoBtn.dataset.photoIndex), 1);
    updateRowPhotoCell(cell, photos);
    return;
  }

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

function addRow(sectionRoot) {
  const kind = sectionRoot.dataset.kind;
  const tbody = sectionRoot.querySelector('tbody');
  const idx = tbody.rows.length;
  let rowHtml;

  if (kind === 'tx') {
    rowHtml = txTableHtml({ rows: [{ service: '', fwdBefore: '', refBefore: '', tempBefore: '', alarmBefore: '', typeBefore: '', fwdAfter: '', refAfter: '', tempAfter: '', alarmAfter: '', typeAfter: '', date: '', remarks: '', photoDataUrls: [] }] });
  } else if (kind === 'clim') {
    rowHtml = climTableHtml({ rows: [{ service: 'Climatiseur', on: '', tempCons: '', tempSalle: '', alarm: '', type: '', date: '', remarks: '', photoDataUrls: [] }] });
  } else if (kind === 'energie') {
    rowHtml = energyTableHtml({ rows: [{ unite: '', marque: '', puissance: '', uout: '', frequence: '', ubatterie: '', compteur: '', tempHuile: '', pressionHuile: '', date: '', remarks: '', photoDataUrls: [] }] });
  } else return;

  rowHtml = rowHtml.match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  tbody.insertAdjacentHTML('beforeend', rowHtml);
}

function collectSection(sectionRoot) {
  const key = sectionRoot.dataset.section;
  const def = SECTION_DEFS.find(section => section.key === key);
  const rows = Array.from(sectionRoot.querySelectorAll('tbody tr')).map(tr => {
    const row = {};
    tr.querySelectorAll('input[data-field]').forEach(input => {
      if (input.dataset.field === 'photoDataUrlsJson') {
        let photos = [];
        try { photos = JSON.parse(input.value || '[]'); } catch (_) { photos = []; }
        row.photoDataUrls = Array.isArray(photos) ? photos.filter(Boolean) : [];
        row.photoDataUrl = row.photoDataUrls[0] || '';
      } else {
        row[input.dataset.field] = input.value.trim();
      }
    });
    if (!Array.isArray(row.photoDataUrls)) {
      row.photoDataUrls = parsePhotoList(row);
      row.photoDataUrl = row.photoDataUrls[0] || row.photoDataUrl || '';
    }
    return row;
  });

  return { key, title: def.title, kind: def.kind, photoTitle: def.photoTitle, rows, interventions: clone(def.interventions) };
}

function normalizeReport(report) {
  const normalized = clone(report || {});
  normalized.photos = normalizePhotos(normalized.photos);
  if (!normalized.sections) normalized.sections = buildEmptyReport().sections;

  SECTION_DEFS.forEach(def => {
    if (!normalized.sections[def.key]) {
      normalized.sections[def.key] = { key: def.key, title: def.title, kind: def.kind, photoTitle: def.photoTitle, rows: clone(def.rows), interventions: clone(def.interventions) };
    }
    normalized.sections[def.key].rows = (normalized.sections[def.key].rows || []).map(row => {
      const photos = parsePhotoList(row);
      return { ...row, photoDataUrls: photos, photoDataUrl: photos[0] || '' };
    });
  });

  return normalized;
}

function fillForm(report) {
  const normalized = normalizeReport(report);
  currentReport = clone(normalized);
  sectionPhotos = clone(normalized.photos);
  $('#reportNo').value = normalized.reportNo || makeReportNo();
  $('#reportNoBadge').textContent = $('#reportNo').value;
  $('#planning').value = normalized.planning || '';
  setSelectValue($('#site'), normalized.site || '');
  $('#mainDate').value = normalized.mainDate || '';
  $('#period').value = normalized.period || '';
  $('#operators').value = normalized.operators || '';
  renderSections(normalized);
}

function rowHasUsefulData(kind, row) {
  if (!row) return false;
  const hasPhotos = parsePhotoList(row).length > 0;
  if (kind === 'satellite') return hasText(row.cn) || hasPhotos;

  const ignored = new Set(['date', 'photoDataUrl', 'photoDataUrls', 'photoDataUrlsJson', 'photoUrl', 'photo']);
  if (kind === 'tx') ignored.add('service');
  if (kind === 'clim') ['service', 'on', 'alarm', 'type'].forEach(key => ignored.add(key));
  if (kind === 'energie') ['unite', 'service', 'marque'].forEach(key => ignored.add(key));

  const hasValues = Object.entries(row).some(([key, value]) => !ignored.has(key) && hasText(value));
  return hasValues || hasPhotos;
}

function visibleRows(section) {
  return (section?.rows || []).filter(row => rowHasUsefulData(section?.kind || '', row));
}

function sectionHasData(section) {
  return visibleRows(section).length > 0;
}

function rowsContainPhotos(rows = []) {
  return rows.some(row => parsePhotoList(row).length > 0);
}

function rowReportPhoto(row) {
  const photos = parsePhotoList(row);
  if (!photos.length) return '';
  return `<div class="report-row-photo-gallery">${photos.map((src, index) => `<img class="report-row-photo" src="${escapeHtml(src)}" alt="Photo équipement ${index + 1}">`).join('')}</div>`;
}

function txReportHtml(section) {
  const showPhotos = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td>
    <td>${escapeHtml(row.fwdBefore)}</td><td>${escapeHtml(row.refBefore)}</td><td>${escapeHtml(row.tempBefore)}</td><td>${escapeHtml(row.alarmBefore)}</td><td>${escapeHtml(row.typeBefore)}</td>
    <td>${escapeHtml(row.fwdAfter)}</td><td>${escapeHtml(row.refAfter)}</td><td>${escapeHtml(row.tempAfter)}</td><td>${escapeHtml(row.alarmAfter)}</td><td>${escapeHtml(row.typeAfter)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>${showPhotos ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');

  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead>
    <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th>${showPhotos ? '<th rowspan="2">Photos</th>' : ''}</tr>
    <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
    </thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function climReportHtml(section) {
  const showPhotos = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td>
    <td>${escapeHtml(row.tempCons)}</td><td>${escapeHtml(row.tempSalle)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>
    ${showPhotos ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');

  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead><tr>
    <th>Climatiseur</th><th>T. Cons.</th><th>T. Salle</th><th>Date</th><th>Remarques</th>${showPhotos ? '<th>Photos</th>' : ''}
    </tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function energyReportHtml(section) {
  const showPhotos = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr>
    <td>${escapeHtml(row.puissance)}</td><td>${escapeHtml(row.uout)}</td><td>${escapeHtml(row.frequence)}</td><td>${escapeHtml(row.ubatterie)}</td>
    <td>${escapeHtml(row.compteur)}</td><td>${escapeHtml(row.tempHuile)}</td><td>${escapeHtml(row.pressionHuile)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td>${showPhotos ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');

  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table energy-report-table"><thead><tr>
    <th>Puissance</th><th>U. out</th><th>Fréquence</th><th>U. Batterie</th><th>Compteur</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th>${showPhotos ? '<th>Photos</th>' : ''}
    </tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function satelliteReportHtml(section) {
  const showPhotos = rowsContainPhotos(section.rows);
  const rows = (section.rows || []).map(row => `<tr><td>${escapeHtml(row.cn)}</td>${showPhotos ? `<td>${rowReportPhoto(row)}</td>` : ''}</tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table satellite-report-table"><thead><tr><th>C/N (dB)</th>${showPhotos ? '<th>Photos</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
}

function sectionReportHtml(section, _photos, def) {
  const normalizedSection = { ...section, kind: def.kind, title: section.title || def.title };
  const rows = visibleRows(normalizedSection);
  if (!rows.length) return '';
  const ready = { ...normalizedSection, rows };
  if (ready.kind === 'tx') return txReportHtml(ready);
  if (ready.kind === 'clim') return climReportHtml(ready);
  if (ready.kind === 'satellite') return satelliteReportHtml(ready);
  return energyReportHtml(ready);
}

function reportHtml(report) {
  const normalized = normalizeReport(report);
  const sections = SECTION_DEFS.map(def => sectionReportHtml(normalized.sections?.[def.key] || def, null, def)).join('');
  return `<article class="report-sheet" id="printableReport">
    <h1 class="report-title">Rapport de Maintenance</h1>
    <table class="meta-table">
      <tr><td>Centre</td><td>${escapeHtml(normalized.site)}</td><td>Date</td><td>${escapeHtml(formatDateFr(normalized.mainDate))}</td></tr>
      <tr><td>Période</td><td>${escapeHtml(normalized.period)}</td><td>Opérateurs</td><td>${escapeHtml(normalized.operators)}</td></tr>
    </table>
    ${sections || '<p class="muted empty-report">Aucune partie remplie.</p>'}
  </article>`;
}
