'use strict';

const APP_VERSION = 'v14-google-sheet-layout';
const DB_SHEET_NAME = '__RAPPORTS_DB';
const ROOT_FOLDER_NAME = 'Rapport Excel PWA Data';
const JSON_FOLDER_NAME = 'JSON';
const PHOTOS_FOLDER_NAME = 'Photos';

const DB_HEADERS = [
  'UID',
  'REPORT_NO',
  'CENTRE',
  'MAIN_DATE',
  'PERIOD',
  'OPERATORS',
  'CREATED_AT',
  'UPDATED_AT',
  'SHEET_NAME',
  'SHEET_ID',
  'JSON_FILE_ID',
  'SHEET_URL'
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'ping');

  try {
    let result;
    if (action === 'setup') result = setup_();
    else if (action === 'listReports') result = listReports_(Number(params.limit || 500));
    else if (action === 'nextNumber') result = nextNumber_();
    else if (action === 'ping') result = { ok: true, version: APP_VERSION };
    else result = { ok: false, error: 'Action GET inconnue: ' + action, version: APP_VERSION };
    return output_(result, params.callback);
  } catch (error) {
    return output_({ ok: false, error: errorMessage_(error), version: APP_VERSION }, params.callback);
  }
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || '');

  try {
    let result;
    if (action === 'saveReport') {
      const report = parsePayload_(params.payload);
      result = saveReport_(report);
    } else if (action === 'deleteReport') {
      result = deleteReport_(parsePayload_(params.payload));
    } else if (action === 'setup') {
      result = setup_();
    } else {
      result = { ok: false, error: 'Action POST inconnue: ' + action, version: APP_VERSION };
    }
    return output_(result);
  } catch (error) {
    return output_({ ok: false, error: errorMessage_(error), version: APP_VERSION });
  }
}

function output_(value, callback) {
  const json = JSON.stringify(value);
  const safeCallback = String(callback || '').match(/^[A-Za-z_$][0-9A-Za-z_$]*$/)
    ? String(callback)
    : '';

  return ContentService
    .createTextOutput(safeCallback ? safeCallback + '(' + json + ');' : json)
    .setMimeType(safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function parsePayload_(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  return JSON.parse(String(raw));
}

function errorMessage_(error) {
  return error && error.message ? error.message : String(error || 'Erreur inconnue');
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty('SPREADSHEET_ID');
  if (storedId) return SpreadsheetApp.openById(storedId);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Ce script doit être ouvert depuis Extensions > Apps Script du Google Sheet.");
  }

  props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return spreadsheet;
}

function setup_() {
  const spreadsheet = getSpreadsheet_();
  ensureDbSheet_(spreadsheet);
  ensureDataFolders_();
  return {
    ok: true,
    version: APP_VERSION,
    spreadsheetUrl: spreadsheet.getUrl(),
    message: 'Google Sheets prêt.'
  };
}

function ensureDbSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(DB_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(DB_SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, DB_HEADERS.length).getValues()[0];
  const mustResetHeaders = DB_HEADERS.some(function(header, index) {
    return String(currentHeaders[index] || '') !== header;
  });

  if (mustResetHeaders) {
    sheet.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
    sheet.getRange(1, 1, 1, DB_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  try {
    sheet.hideSheet();
  } catch (_) {
    // Ignore si Google refuse temporairement de masquer la seule feuille.
  }
  return sheet;
}

function ensureDataFolders_() {
  const root = getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  return {
    root: root,
    json: getOrCreateFolder_(root, JSON_FOLDER_NAME),
    photos: getOrCreateFolder_(root, PHOTOS_FOLDER_NAME)
  };
}

function getOrCreateFolder_(parent, name) {
  const iterator = parent.getFoldersByName(name);
  return iterator.hasNext() ? iterator.next() : parent.createFolder(name);
}

function saveReport_(incoming) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getSpreadsheet_();
    const dbSheet = ensureDbSheet_(spreadsheet);
    const report = normalizeReport_(incoming);
    const existing = findDbRecord_(dbSheet, report.uid, report.reportNo);
    const nowIso = new Date().toISOString();

    if (!report.uid) report.uid = Utilities.getUuid();
    if (!report.reportNo) report.reportNo = makeNextNumber_(dbSheet, spreadsheet);
    report.createdAt = report.createdAt || (existing && existing.createdAt) || nowIso;
    report.updatedAt = nowIso;
    report.source = 'cloud';

    materializeAllPhotos_(report);

    const reportSheet = getOrCreateReportSheet_(spreadsheet, report, existing);
    renderReportSheet_(reportSheet, report);

    report.sheetUrl = spreadsheet.getUrl() + '#gid=' + reportSheet.getSheetId();

    const jsonFile = saveReportJson_(report, existing && existing.jsonFileId);
    const dbValues = [
      report.uid,
      report.reportNo,
      report.site || '',
      report.mainDate || '',
      report.period || '',
      report.operators || '',
      report.createdAt || '',
      report.updatedAt || '',
      reportSheet.getName(),
      reportSheet.getSheetId(),
      jsonFile.getId(),
      report.sheetUrl
    ];

    if (existing) {
      dbSheet.getRange(existing.row, 1, 1, DB_HEADERS.length).setValues([dbValues]);
    } else {
      dbSheet.appendRow(dbValues);
    }

    SpreadsheetApp.flush();
    return {
      ok: true,
      version: APP_VERSION,
      uid: report.uid,
      reportNo: report.reportNo,
      site: report.site || '',
      sheetUrl: report.sheetUrl,
      report: report
    };
  } finally {
    lock.releaseLock();
  }
}

function listReports_(limit) {
  const spreadsheet = getSpreadsheet_();
  const dbSheet = ensureDbSheet_(spreadsheet);
  const lastRow = dbSheet.getLastRow();
  if (lastRow < 2) return { ok: true, version: APP_VERSION, reports: [] };

  const values = dbSheet.getRange(2, 1, lastRow - 1, DB_HEADERS.length).getValues();
  values.sort(function(a, b) {
    return String(b[7] || b[6] || '').localeCompare(String(a[7] || a[6] || ''));
  });

  const max = Math.max(1, Math.min(Number(limit || 500), 500));
  const reports = [];

  for (let i = 0; i < values.length && reports.length < max; i += 1) {
    const row = values[i];
    const jsonFileId = String(row[10] || '');
    let report = null;

    if (jsonFileId) {
      try {
        report = JSON.parse(DriveApp.getFileById(jsonFileId).getBlob().getDataAsString('UTF-8'));
      } catch (_) {
        report = null;
      }
    }

    if (!report) {
      report = {
        uid: row[0] || '',
        reportNo: row[1] || '',
        site: row[2] || '',
        mainDate: row[3] || '',
        period: row[4] || '',
        operators: row[5] || '',
        createdAt: row[6] || '',
        updatedAt: row[7] || '',
        sections: {},
        photos: {}
      };
    }

    report.source = 'cloud';
    report.sheetUrl = row[11] || report.sheetUrl || '';
    reports.push(report);
  }

  return { ok: true, version: APP_VERSION, reports: reports };
}

function nextNumber_() {
  const spreadsheet = getSpreadsheet_();
  const dbSheet = ensureDbSheet_(spreadsheet);
  return {
    ok: true,
    version: APP_VERSION,
    nextNumber: makeNextNumber_(dbSheet, spreadsheet)
  };
}

function makeNextNumber_(dbSheet, spreadsheet) {
  const timezone = spreadsheet.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Africa/Casablanca';
  const dateCode = Utilities.formatDate(new Date(), timezone, 'yyyyMMdd');
  const lastRow = dbSheet.getLastRow();
  let count = 0;

  if (lastRow >= 2) {
    const numbers = dbSheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
    numbers.forEach(function(row) {
      if (String(row[0] || '').indexOf(dateCode) !== -1) count += 1;
    });
  }

  return 'RPT-' + dateCode + '-' + String(count + 1).padStart(3, '0');
}

function deleteReport_(identity) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getSpreadsheet_();
    const dbSheet = ensureDbSheet_(spreadsheet);
    const record = findDbRecord_(dbSheet, identity.uid || '', identity.reportNo || '');
    if (!record) return { ok: true, version: APP_VERSION, deleted: false };

    if (record.sheetId) {
      const reportSheet = getSheetById_(spreadsheet, Number(record.sheetId));
      if (reportSheet && spreadsheet.getSheets().length > 1) spreadsheet.deleteSheet(reportSheet);
    }

    if (record.jsonFileId) {
      try {
        DriveApp.getFileById(record.jsonFileId).setTrashed(true);
      } catch (_) {}
    }

    trashReportPhotoFolder_(record.uid);
    dbSheet.deleteRow(record.row);
    return { ok: true, version: APP_VERSION, deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function findDbRecord_(dbSheet, uid, reportNo) {
  const lastRow = dbSheet.getLastRow();
  if (lastRow < 2) return null;

  const values = dbSheet.getRange(2, 1, lastRow - 1, DB_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    if ((uid && String(row[0]) === String(uid)) || (reportNo && String(row[1]) === String(reportNo))) {
      return {
        row: i + 2,
        uid: row[0] || '',
        reportNo: row[1] || '',
        site: row[2] || '',
        createdAt: row[6] || '',
        updatedAt: row[7] || '',
        sheetName: row[8] || '',
        sheetId: row[9] || '',
        jsonFileId: row[10] || '',
        sheetUrl: row[11] || ''
      };
    }
  }
  return null;
}

function saveReportJson_(report, existingFileId) {
  const folders = ensureDataFolders_();
  const content = JSON.stringify(report);

  if (existingFileId) {
    try {
      const existing = DriveApp.getFileById(existingFileId);
      existing.setContent(content);
      return existing;
    } catch (_) {}
  }

  return folders.json.createFile(report.uid + '.json', content, MimeType.PLAIN_TEXT);
}

function getOrCreateReportSheet_(spreadsheet, report, existing) {
  if (existing && existing.sheetId) {
    const foundById = getSheetById_(spreadsheet, Number(existing.sheetId));
    if (foundById) return foundById;
  }

  if (existing && existing.sheetName) {
    const foundByName = spreadsheet.getSheetByName(String(existing.sheetName));
    if (foundByName) return foundByName;
  }

  const base = sanitizeSheetName_((report.site || 'CENTRE') + ' ' + formatDateForName_(report.mainDate));
  const name = uniqueSheetName_(spreadsheet, base);
  return spreadsheet.insertSheet(name);
}

function getSheetById_(spreadsheet, sheetId) {
  const sheets = spreadsheet.getSheets();
  for (let i = 0; i < sheets.length; i += 1) {
    if (sheets[i].getSheetId() === sheetId) return sheets[i];
  }
  return null;
}

function sanitizeSheetName_(name) {
  const clean = String(name || 'Rapport')
    .replace(/[\\\/\?\*\[\]\:]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return clean || 'Rapport';
}

function uniqueSheetName_(spreadsheet, base) {
  let name = base;
  let index = 2;
  while (spreadsheet.getSheetByName(name)) {
    const suffix = ' (' + index + ')';
    name = base.slice(0, 90 - suffix.length) + suffix;
    index += 1;
  }
  return name;
}

function formatDateForName_(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : text;
}

function normalizeReport_(incoming) {
  const report = incoming && typeof incoming === 'object' ? JSON.parse(JSON.stringify(incoming)) : {};
  report.sections = report.sections || {};
  report.photos = report.photos || {};
  report.disabledSections = Array.isArray(report.disabledSections) ? report.disabledSections : [];

  ['tnt', 'fm', 'clim', 'energie', 'satellite'].forEach(function(key) {
    const section = report.sections[key] || {};
    section.key = key;
    section.kind = section.kind || (key === 'tnt' || key === 'fm' ? 'tx' : key);
    section.title = section.title || defaultSectionTitle_(key);
    section.rows = Array.isArray(section.rows) ? section.rows : [];
    section.interventions = Array.isArray(section.interventions) ? section.interventions : [];
    section.disabled = section.disabled === true || report.disabledSections.indexOf(key) !== -1;
    report.sections[key] = section;
  });

  return report;
}

function defaultSectionTitle_(key) {
  const titles = {
    tnt: '1/ Emetteurs TNT:',
    fm: '2/ Emetteurs FM:',
    clim: '3/ Climatisation:',
    energie: '4/ Energie :',
    satellite: '5/ Satellite :'
  };
  return titles[key] || key;
}

function materializeAllPhotos_(report) {
  const folders = ensureDataFolders_();
  const reportFolder = getOrCreateFolder_(folders.photos, report.uid);

  Object.keys(report.sections || {}).forEach(function(sectionKey) {
    const section = report.sections[sectionKey];
    (section.rows || []).forEach(function(row, rowIndex) {
      const sources = photoList_(row);
      const urls = sources.map(function(source, photoIndex) {
        return materializePhotoSource_(
          source,
          reportFolder,
          sectionKey + '-' + (rowIndex + 1) + '-' + (photoIndex + 1)
        );
      }).filter(Boolean);

      row.photoDataUrls = uniqueStrings_(urls);
      row.photoDataUrl = row.photoDataUrls[0] || '';
      row.photoUrl = row.photoDataUrl;
      delete row.photoDataUrlsJson;
      delete row.photos;
      delete row.photo;
    });
  });

  // Anciennes photos avant/après: conservées comme URL mais plus affichées.
  Object.keys(report.photos || {}).forEach(function(sectionKey) {
    const group = report.photos[sectionKey] || {};
    ['before', 'after'].forEach(function(kind) {
      const objectValue = group[kind];
      const direct = group[kind + 'Url'] || (objectValue && (objectValue.dataUrl || objectValue.url)) || '';
      if (!direct) return;
      const url = materializePhotoSource_(direct, reportFolder, 'legacy-' + sectionKey + '-' + kind);
      group[kind + 'Url'] = url;
      group[kind] = url ? { url: url, dataUrl: '' } : null;
    });
  });
}

function photoList_(row) {
  const values = [];
  const add = function(value) {
    if (typeof value === 'string' && value.trim() && values.indexOf(value.trim()) === -1) {
      values.push(value.trim());
    }
  };

  if (Array.isArray(row.photoDataUrls)) row.photoDataUrls.forEach(add);
  else if (typeof row.photoDataUrls === 'string') {
    try {
      const parsed = JSON.parse(row.photoDataUrls);
      if (Array.isArray(parsed)) parsed.forEach(add);
      else add(row.photoDataUrls);
    } catch (_) {
      add(row.photoDataUrls);
    }
  }

  if (typeof row.photoDataUrlsJson === 'string') {
    try {
      const parsedJson = JSON.parse(row.photoDataUrlsJson);
      if (Array.isArray(parsedJson)) parsedJson.forEach(add);
    } catch (_) {}
  }

  if (Array.isArray(row.photos)) {
    row.photos.forEach(function(photo) {
      add(typeof photo === 'string' ? photo : (photo && (photo.dataUrl || photo.url)) || '');
    });
  }

  add(row.photoDataUrl);
  add(row.photoUrl);
  add(row.photo && (row.photo.dataUrl || row.photo.url));
  return values;
}

function materializePhotoSource_(source, folder, baseName) {
  const text = String(source || '');
  if (!text) return '';
  if (!/^data:image\//i.test(text)) return text;

  const match = text.match(/^data:(image\/[A-Za-z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return '';

  const mimeType = match[1];
  const extension = mimeType.indexOf('png') !== -1 ? '.png' : mimeType.indexOf('webp') !== -1 ? '.webp' : '.jpg';
  const bytes = Utilities.base64Decode(match[2]);
  const blob = Utilities.newBlob(bytes, mimeType, baseName + '-' + new Date().getTime() + extension);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}

  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function uniqueStrings_(values) {
  const output = [];
  (values || []).forEach(function(value) {
    if (value && output.indexOf(value) === -1) output.push(value);
  });
  return output;
}

function trashReportPhotoFolder_(uid) {
  if (!uid) return;
  const folders = ensureDataFolders_();
  const iterator = folders.photos.getFoldersByName(String(uid));
  while (iterator.hasNext()) {
    try {
      iterator.next().setTrashed(true);
    } catch (_) {}
  }
}

function renderReportSheet_(sheet, report) {
  removeAllImages_(sheet);
  sheet.clear();
  sheet.clearFormats();
  sheet.setFrozenRows(0);
  sheet.setHiddenGridlines(true);

  const maxColumns = 14;
  ensureSheetSize_(sheet, 200, maxColumns);

  sheet.getRange(1, 1, 1, maxColumns).merge();
  sheet.getRange(1, 1)
    .setValue('Rapport de Maintenance')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#0f172a')
    .setFontColor('#ffffff');
  sheet.setRowHeight(1, 38);

  const meta = [
    ['Centre', report.site || '', 'Date', formatDateFr_(report.mainDate)],
    ['Période', report.period || '', 'Opérateurs', report.operators || '']
  ];
  sheet.getRange(3, 1, 2, 4).setValues(meta);
  sheet.getRange(3, 1, 2, 4).setBorder(true, true, true, true, true, true);
  sheet.getRange(3, 1, 2, 1).setFontWeight('bold').setBackground('#e2e8f0');
  sheet.getRange(3, 3, 2, 1).setFontWeight('bold').setBackground('#e2e8f0');
  sheet.getRange(3, 2, 2, 1).setBackground('#ffffff');
  sheet.getRange(3, 4, 2, 1).setBackground('#ffffff');

  let row = 6;
  const order = ['tnt', 'fm', 'clim', 'energie', 'satellite'];
  order.forEach(function(key) {
    const section = report.sections[key];
    const visible = visibleRows_(key, section);
    if (!section || section.disabled === true || !visible.length) return;
    row = renderSection_(sheet, row, key, section, visible);
    row += 2;
  });

  if (row === 6) {
    sheet.getRange(6, 1, 1, 6).merge();
    sheet.getRange(6, 1)
      .setValue('Aucune partie remplie.')
      .setFontStyle('italic')
      .setFontColor('#64748b');
  }

  sheet.autoResizeColumns(1, Math.min(maxColumns, 13));
  sheet.setColumnWidth(1, Math.max(sheet.getColumnWidth(1), 120));
  for (let col = 2; col <= 13; col += 1) {
    sheet.setColumnWidth(col, Math.min(Math.max(sheet.getColumnWidth(col), 75), 130));
  }
  sheet.setColumnWidth(14, 190);
}

function ensureSheetSize_(sheet, rows, columns) {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < columns) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
}

function removeAllImages_(sheet) {
  try {
    sheet.getImages().forEach(function(image) {
      try { image.remove(); } catch (_) {}
    });
  } catch (_) {}
}

function renderSection_(sheet, startRow, key, section, rows) {
  const schema = sectionSchema_(key);
  const columnCount = schema.headers.length;

  sheet.getRange(startRow, 1, 1, columnCount).merge();
  sheet.getRange(startRow, 1)
    .setValue(section.title || defaultSectionTitle_(key))
    .setFontWeight('bold')
    .setFontSize(12)
    .setBackground('#1d4ed8')
    .setFontColor('#ffffff');

  const headerRow = startRow + 1;
  sheet.getRange(headerRow, 1, 1, columnCount)
    .setValues([schema.headers])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBackground('#dbeafe')
    .setBorder(true, true, true, true, true, true);

  const values = rows.map(function(row) {
    return schema.values(row);
  });

  const dataStart = headerRow + 1;
  if (values.length) {
    sheet.getRange(dataStart, 1, values.length, columnCount)
      .setValues(values)
      .setVerticalAlignment('middle')
      .setWrap(true)
      .setBorder(true, true, true, true, true, true);

    rows.forEach(function(row, index) {
      insertPhotos_(sheet, dataStart + index, schema.photoColumn, photoList_(row));
    });
  }

  let nextRow = dataStart + values.length;
  const interventions = Array.isArray(section.interventions) ? section.interventions.filter(Boolean) : [];
  if (interventions.length && key !== 'satellite') {
    sheet.getRange(nextRow, 1, 1, columnCount).merge();
    sheet.getRange(nextRow, 1)
      .setValue('Interventions sur site:')
      .setFontWeight('bold')
      .setBackground('#f1f5f9');
    nextRow += 1;

    interventions.forEach(function(item, index) {
      sheet.getRange(nextRow + index, 1, 1, columnCount).merge();
      sheet.getRange(nextRow + index, 1).setValue((index + 1) + '. ' + item).setWrap(true);
    });
    nextRow += interventions.length;
  }

  return nextRow;
}

function sectionSchema_(key) {
  if (key === 'tnt' || key === 'fm') {
    return {
      headers: [
        'Service',
        'FWD Avant',
        'REF Avant',
        'T° Avant',
        'Alarm Avant',
        'Type Avant',
        'FWD Après',
        'REF Après',
        'T° Après',
        'Alarm Après',
        'Type Après',
        'Date',
        'Remarques',
        'Photos'
      ],
      photoColumn: 14,
      values: function(row) {
        return [
          row.service || '',
          row.fwdBefore || '',
          row.refBefore || '',
          row.tempBefore || '',
          row.alarmBefore || '',
          row.typeBefore || '',
          row.fwdAfter || '',
          row.refAfter || '',
          row.tempAfter || '',
          row.alarmAfter || '',
          row.typeAfter || '',
          formatDateFr_(row.date),
          row.remarks || '',
          photoList_(row).join('\n')
        ];
      }
    };
  }

  if (key === 'clim') {
    return {
      headers: ['Climatiseur', 'T. Cons.', 'T. Salle', 'Date', 'Remarques', 'Photos'],
      photoColumn: 6,
      values: function(row) {
        return [
          row.service || 'Climatiseur',
          row.tempCons || '',
          row.tempSalle || '',
          formatDateFr_(row.date),
          row.remarks || '',
          photoList_(row).join('\n')
        ];
      }
    };
  }

  if (key === 'energie') {
    return {
      headers: [
        'Puissance',
        'U. out',
        'Fréquence (HZ)',
        'U. Batterie',
        'Compteur (h)',
        'Temp. Huile',
        'Pression Huile',
        'Date',
        'Remarques',
        'Photos'
      ],
      photoColumn: 10,
      values: function(row) {
        return [
          row.puissance || '',
          row.uout || '',
          row.frequence || '',
          row.ubatterie || '',
          row.compteur || '',
          row.tempHuile || '',
          row.pressionHuile || '',
          formatDateFr_(row.date),
          row.remarks || '',
          photoList_(row).join('\n')
        ];
      }
    };
  }

  return {
    headers: ['C/N (dB)', 'Photos'],
    photoColumn: 2,
    values: function(row) {
      return [row.cn || '', photoList_(row).join('\n')];
    }
  };
}

function visibleRows_(key, section) {
  if (!section || section.disabled === true) return [];
  const rows = Array.isArray(section.rows) ? section.rows : [];

  return rows.filter(function(row) {
    const hasPhotos = photoList_(row).length > 0;

    if (key === 'tnt' || key === 'fm') {
      return hasPhotos || [
        'fwdBefore', 'refBefore', 'tempBefore', 'alarmBefore', 'typeBefore',
        'fwdAfter', 'refAfter', 'tempAfter', 'alarmAfter', 'typeAfter', 'remarks'
      ].some(function(field) { return hasText_(row[field]); });
    }

    if (key === 'clim') {
      return hasPhotos || ['tempCons', 'tempSalle', 'remarks'].some(function(field) {
        return hasText_(row[field]);
      });
    }

    if (key === 'energie') {
      return hasPhotos || [
        'puissance', 'uout', 'frequence', 'ubatterie', 'compteur',
        'tempHuile', 'pressionHuile', 'remarks'
      ].some(function(field) { return hasText_(row[field]); });
    }

    return hasPhotos || hasText_(row.cn);
  });
}

function hasText_(value) {
  return String(value == null ? '' : value).trim() !== '';
}

function formatDateFr_(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : text;
}

function insertPhotos_(sheet, row, column, sources) {
  const urls = uniqueStrings_(sources || []);
  if (!urls.length) return;

  const perLine = 3;
  const thumbWidth = 54;
  const thumbHeight = 54;
  const lines = Math.ceil(Math.min(urls.length, 9) / perLine);
  sheet.setRowHeight(row, Math.max(68, lines * 58 + 8));
  sheet.setColumnWidth(column, 190);

  urls.slice(0, 9).forEach(function(url, index) {
    try {
      const blob = imageBlobFromUrl_(url);
      if (!blob) return;
      const xOffset = 4 + (index % perLine) * 59;
      const yOffset = 4 + Math.floor(index / perLine) * 58;
      const image = sheet.insertImage(blob, column, row, xOffset, yOffset);
      image.setWidth(thumbWidth);
      image.setHeight(thumbHeight);
    } catch (_) {
      // Le lien reste écrit dans la cellule si l'aperçu ne peut pas être inséré.
    }
  });
}

function imageBlobFromUrl_(url) {
  const fileId = driveFileIdFromUrl_(url);
  if (fileId) {
    try {
      return DriveApp.getFileById(fileId).getBlob();
    } catch (_) {}
  }

  if (/^https?:\/\//i.test(String(url || ''))) {
    try {
      return UrlFetchApp.fetch(String(url), { muteHttpExceptions: true }).getBlob();
    } catch (_) {}
  }
  return null;
}

function driveFileIdFromUrl_(url) {
  const text = String(url || '');
  let match = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  match = text.match(/\/d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : '';
}
