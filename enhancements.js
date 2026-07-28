'use strict';

/* Extension compatible avec les anciens rapports :
   - une photo dans chaque ligne TNT/FM/Clim/Energie
   - une nouvelle section Satellite avec mesure C/N
   Les clés LocalStorage existantes ne sont jamais modifiées. */

SECTION_DEFS.push({
  key: 'satellite',
  title: '5/ Satellite :',
  kind: 'satellite',
  photoTitle: 'Photos Satellite',
  rows: [
    { service: 'Réception satellite', cn: '', niveau: '', qualite: '', date: '', remarks: '', photoDataUrl: '' }
  ],
  interventions: [
    'Contrôle visuel de la parabole, du LNB et des câbles',
    'Vérification du niveau et de la qualité du signal',
    'Mesure du rapport C/N'
  ]
});

function rowPhotoCell(rowIndex, row = {}) {
  const src = row.photoDataUrl || row.photo?.dataUrl || row.photoUrl || '';
  return `<td class="row-photo-cell">
    <label class="row-photo-button">Photo
      <input class="row-photo-input" data-row="${rowIndex}" type="file" accept="image/*" capture="environment" />
    </label>
    <input class="row-photo-data" data-row="${rowIndex}" data-field="photoDataUrl" type="hidden" value="${escapeHtml(src)}" />
    <img class="row-photo-preview" ${src ? `src="${escapeHtml(src)}"` : ''} alt="Photo équipement" />
  </td>`;
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
      <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th><th rowspan="2">Photo</th><th rowspan="2"></th></tr>
      <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
    </thead><tbody>${rows}</tbody></table>`;
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
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');
  return `<table class="excel-table clim-table">
    <thead><tr><th>Climatiseur</th><th>ON</th><th>T. Cons.</th><th>T. Salle</th><th>Alarm</th><th>Type</th><th>Date</th><th>Remarques</th><th>Photo</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
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
    </tr>`).join('');
  return `<table class="excel-table energy-table">
    <thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence (HZ)</th><th>U. Batterie</th><th>Compteur (h)</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th><th>Photo</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function satelliteTableHtml(section) {
  const rows = (section.rows || []).map((row, i) => `
    <tr>
      <td class="service-col">${inputCell(i, 'service', row.service || '', 'service-input')}</td>
      <td>${inputCell(i, 'cn', row.cn || '')}</td>
      <td>${inputCell(i, 'niveau', row.niveau || '')}</td>
      <td>${inputCell(i, 'qualite', row.qualite || '')}</td>
      <td>${inputCell(i, 'date', row.date || '')}</td>
      <td>${inputCell(i, 'remarks', row.remarks || '', 'remark-input')}</td>
      ${rowPhotoCell(i, row)}
      <td class="delete-col"><button type="button" class="danger mini delete-row-btn">×</button></td>
    </tr>`).join('');
  return `<table class="excel-table satellite-table">
    <thead><tr><th>Satellite / Service</th><th>C/N (dB)</th><th>Niveau</th><th>Qualité</th><th>Date</th><th>Remarques</th><th>Photo</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
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
  if (section.kind === 'tx') wrap.innerHTML = txTableHtml(section);
  else if (section.kind === 'clim') wrap.innerHTML = climTableHtml(section);
  else if (section.kind === 'satellite') wrap.innerHTML = satelliteTableHtml(section);
  else wrap.innerHTML = energyTableHtml(section);
  const ol = tpl.querySelector('ol');
  ol.innerHTML = (section.interventions || def.interventions || []).map(text => `<li>${escapeHtml(text)}</li>`).join('');
  const photosBox = tpl.querySelector('.section-photos');
  if (section.key === 'satellite') {
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

function sectionChangeHandler(event) {
  if (event.target.classList.contains('row-photo-input')) {
    handleRowPhoto(event);
    return;
  }
  if (!event.target.classList.contains('photo-input')) return;
  const sectionKey = event.target.dataset.photoSection;
  const which = event.target.dataset.photoKind;
  handleSectionPhoto(event, sectionKey, which);
}

async function handleRowPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = $('#formStatus');
  const cell = event.target.closest('.row-photo-cell');
  toast(status, 'Compression photo équipement...', 'warn');
  try {
    const compressed = await compressImage(file, 900, 0.5);
    cell.querySelector('.row-photo-data').value = compressed;
    const img = cell.querySelector('.row-photo-preview');
    img.src = compressed;
    toast(status, 'Photo de la ligne ajoutée.', 'ok');
  } catch (err) {
    toast(status, 'Erreur photo: ' + err.message, 'err');
  }
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
  } else if (kind === 'satellite') {
    rowHtml = satelliteTableHtml({ rows: [{ service: '', cn: '', niveau: '', qualite: '', date: '', remarks: '', photoDataUrl: '' }] });
  } else return;
  rowHtml = rowHtml.match(/<tbody>([\s\S]*)<\/tbody>/)[1].replaceAll('data-row="0"', `data-row="${idx}"`);
  tbody.insertAdjacentHTML('beforeend', rowHtml);
}

function normalizeReport(report) {
  const r = clone(report);
  r.photos = normalizePhotos(r.photos);
  if (!r.sections) r.sections = buildEmptyReport().sections;
  SECTION_DEFS.forEach(def => {
    if (!r.sections[def.key]) {
      r.sections[def.key] = { key: def.key, title: def.title, kind: def.kind, photoTitle: def.photoTitle, rows: clone(def.rows), interventions: clone(def.interventions) };
    }
    r.sections[def.key].rows = (r.sections[def.key].rows || []).map(row => ({ ...row, photoDataUrl: row.photoDataUrl || row.photo?.dataUrl || row.photoUrl || '' }));
  });
  if (r.sections.energie?.rows) {
    r.sections.energie.rows = r.sections.energie.rows.map(row => ({
      unite: row.unite || row.service || '', marque: row.marque || '', puissance: row.puissance || '',
      uout: row.uout || '', frequence: row.frequence || '', ubatterie: row.ubatterie || '', compteur: row.compteur || '',
      tempHuile: row.tempHuile || '', pressionHuile: row.pressionHuile || '', date: row.date || '', remarks: row.remarks || '',
      photoDataUrl: row.photoDataUrl || row.photo?.dataUrl || row.photoUrl || ''
    }));
  }
  return r;
}

function rowReportPhoto(row) {
  const src = row.photoDataUrl || row.photo?.dataUrl || row.photoUrl || '';
  return src ? `<img class="report-row-photo" src="${escapeHtml(src)}" alt="Photo équipement">` : '';
}

function txReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr>
    <td class="service-cell">${escapeHtml(row.service)}</td>
    <td>${escapeHtml(row.fwdBefore)}</td><td>${escapeHtml(row.refBefore)}</td><td>${escapeHtml(row.tempBefore)}</td><td>${escapeHtml(row.alarmBefore)}</td><td>${escapeHtml(row.typeBefore)}</td>
    <td>${escapeHtml(row.fwdAfter)}</td><td>${escapeHtml(row.refAfter)}</td><td>${escapeHtml(row.tempAfter)}</td><td>${escapeHtml(row.alarmAfter)}</td><td>${escapeHtml(row.typeAfter)}</td>
    <td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td><td>${rowReportPhoto(row)}</td></tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead>
    <tr><th rowspan="2">Service</th><th colspan="5">Avant Intervention</th><th colspan="5">Après Intervention</th><th rowspan="2">Date</th><th rowspan="2">Remarques</th><th rowspan="2">Photo</th></tr>
    <tr><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th><th>FWD</th><th>REF</th><th>T°</th><th>Alarm</th><th>Type</th></tr>
    </thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function climReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.service)}</td><td>${escapeHtml(row.on)}</td><td>${escapeHtml(row.tempCons)}</td><td>${escapeHtml(row.tempSalle)}</td><td>${escapeHtml(row.alarm)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td><td>${rowReportPhoto(row)}</td></tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead><tr><th>Climatiseur</th><th>ON</th><th>T. Cons.</th><th>T. Salle</th><th>Alarm</th><th>Type</th><th>Date</th><th>Remarques</th><th>Photo</th></tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function energyReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.unite || row.service)}</td><td>${escapeHtml(row.marque)}</td><td>${escapeHtml(row.puissance)}</td><td>${escapeHtml(row.uout)}</td><td>${escapeHtml(row.frequence)}</td><td>${escapeHtml(row.ubatterie)}</td><td>${escapeHtml(row.compteur)}</td><td>${escapeHtml(row.tempHuile)}</td><td>${escapeHtml(row.pressionHuile)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td><td>${rowReportPhoto(row)}</td></tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table energy-report-table"><thead><tr><th>Unité</th><th>Marque</th><th>Puissance</th><th>U. out</th><th>Fréquence</th><th>U. Batterie</th><th>Compteur</th><th>Temp. Huile</th><th>Pression Huile</th><th>Date</th><th>Remarques</th><th>Photo</th></tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function satelliteReportHtml(section) {
  const rows = (section.rows || []).map(row => `<tr><td class="service-cell">${escapeHtml(row.service)}</td><td>${escapeHtml(row.cn)}</td><td>${escapeHtml(row.niveau)}</td><td>${escapeHtml(row.qualite)}</td><td>${escapeHtml(formatDateFr(row.date))}</td><td>${escapeHtml(row.remarks)}</td><td>${rowReportPhoto(row)}</td></tr>`).join('');
  return `<div class="section-name">${escapeHtml(section.title)}</div><table class="excel-report-table"><thead><tr><th>Satellite / Service</th><th>C/N (dB)</th><th>Niveau</th><th>Qualité</th><th>Date</th><th>Remarques</th><th>Photo</th></tr></thead><tbody>${rows}</tbody></table>${interventionsReportHtml(section.interventions)}`;
}

function sectionReportHtml(section, photos, def) {
  const normalizedSection = { ...section, kind: def.kind, title: section.title || def.title };
  if (!sectionHasData(normalizedSection, photos)) return '';
  const rows = visibleRows(normalizedSection);
  const sectionWithRows = { ...normalizedSection, rows };
  let body;
  if (!rows.length) body = `<div class="section-name">${escapeHtml(sectionWithRows.title)}</div>`;
  else if (sectionWithRows.kind === 'tx') body = txReportHtml(sectionWithRows);
  else if (sectionWithRows.kind === 'clim') body = climReportHtml(sectionWithRows);
  else if (sectionWithRows.kind === 'satellite') body = satelliteReportHtml(sectionWithRows);
  else body = energyReportHtml(sectionWithRows);
  return body + (photosHasData(photos) ? sectionPhotosReportHtml(photos, def.photoTitle || section.photoTitle || section.title) : '');
}
