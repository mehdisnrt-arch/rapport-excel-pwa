'use strict';

/* Archive Recovery v16
   Ajoute à listReports les JSON et anciennes feuilles qui ne sont pas encore
   indexés dans __RAPPORTS_DB. Ajouter ce fichier au projet Apps Script puis
   déployer une nouvelle version du Web App. */

function archiveV16Key_(report) {
  const no = String((report && report.reportNo) || '').trim();
  const uid = String((report && report.uid) || '').trim();
  return no ? 'no:' + no : uid ? 'uid:' + uid : '';
}

function archiveV16Date_(value) {
  const text = String(value || '').trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return text;
  m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  return m ? m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0') : text;
}

function archiveV16Put_(map, report) {
  if (!report || typeof report !== 'object') return;
  const key = archiveV16Key_(report);
  if (!key) return;
  const old = map[key];
  const oldDate = String((old && (old.updatedAt || old.createdAt)) || '');
  const newDate = String(report.updatedAt || report.createdAt || '');
  if (!old || newDate >= oldDate) map[key] = report;
}

function archiveV16SheetReport_(spreadsheet, sheet) {
  const meta = sheet.getRange(3, 1, 2, 4).getDisplayValues();
  return {
    uid: 'sheet-' + sheet.getSheetId(),
    reportNo: sheet.getName(),
    site: (meta[0] && meta[0][1]) || '',
    mainDate: archiveV16Date_((meta[0] && meta[0][3]) || ''),
    period: (meta[1] && meta[1][1]) || '',
    operators: (meta[1] && meta[1][3]) || '',
    planning: '',
    createdAt: '',
    updatedAt: '',
    sheetId: sheet.getSheetId(),
    sheetName: sheet.getName(),
    sheetUrl: spreadsheet.getUrl() + '#gid=' + sheet.getSheetId(),
    source: 'cloud-sheet-recovered',
    sections: {},
    photos: {}
  };
}

listReports_ = function(limit) {
  const spreadsheet = getSpreadsheet_();
  const dbSheet = ensureDbSheet_(spreadsheet);
  const max = Math.max(1, Math.min(Number(limit || 500), 500));
  const map = {};
  const knownSheetIds = {};
  const lastRow = dbSheet.getLastRow();

  if (lastRow >= 2) {
    const values = dbSheet.getRange(2, 1, lastRow - 1, DB_HEADERS.length).getValues();
    values.forEach(function(row) {
      const jsonFileId = String(row[10] || '');
      let report = null;
      if (jsonFileId) {
        try { report = JSON.parse(DriveApp.getFileById(jsonFileId).getBlob().getDataAsString('UTF-8')); } catch (_) {}
      }
      if (!report) {
        report = {
          uid: row[0] || '', reportNo: row[1] || '', site: row[2] || '', mainDate: row[3] || '',
          period: row[4] || '', operators: row[5] || '', createdAt: row[6] || '', updatedAt: row[7] || '',
          sections: {}, photos: {}
        };
      }
      report.source = 'cloud';
      report.sheetName = row[8] || report.sheetName || '';
      report.sheetId = row[9] || report.sheetId || '';
      report.jsonFileId = jsonFileId || report.jsonFileId || '';
      report.sheetUrl = row[11] || report.sheetUrl || '';
      if (report.sheetId) knownSheetIds[String(report.sheetId)] = true;
      archiveV16Put_(map, report);
    });
  }

  try {
    const files = ensureDataFolders_().json.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      try {
        const report = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
        report.source = 'cloud-json-recovered';
        report.jsonFileId = file.getId();
        const gid = String(report.sheetUrl || '').match(/[?#&]gid=(\d+)/);
        if (gid) {
          report.sheetId = Number(gid[1]);
          knownSheetIds[String(report.sheetId)] = true;
        }
        archiveV16Put_(map, report);
      } catch (_) {}
    }
  } catch (_) {}

  spreadsheet.getSheets().forEach(function(sheet) {
    if (sheet.getName() === DB_SHEET_NAME) return;
    const id = String(sheet.getSheetId());
    if (knownSheetIds[id]) return;
    try {
      const a1 = String(sheet.getRange(1, 1).getDisplayValue() || '').toLowerCase();
      const a3 = String(sheet.getRange(3, 1).getDisplayValue() || '').toLowerCase();
      if (a1.indexOf('rapport') === -1 && a3.indexOf('centre') === -1) return;
      archiveV16Put_(map, archiveV16SheetReport_(spreadsheet, sheet));
    } catch (_) {}
  });

  const reports = Object.keys(map).map(function(key) { return map[key]; });
  reports.sort(function(a, b) {
    return String(b.updatedAt || b.createdAt || b.mainDate || '').localeCompare(String(a.updatedAt || a.createdAt || a.mainDate || ''));
  });
  return { ok: true, version: 'v16-archive-recovery', reports: reports.slice(0, max) };
};

getOrCreateReportSheet_ = function(spreadsheet, report, existing) {
  if (existing && existing.sheetId) {
    const foundExisting = getSheetById_(spreadsheet, Number(existing.sheetId));
    if (foundExisting) return foundExisting;
  }
  if (report && report.sheetId) {
    const foundRecovered = getSheetById_(spreadsheet, Number(report.sheetId));
    if (foundRecovered) return foundRecovered;
  }
  if (existing && existing.sheetName) {
    const foundExistingName = spreadsheet.getSheetByName(String(existing.sheetName));
    if (foundExistingName) return foundExistingName;
  }
  if (report && report.sheetName) {
    const foundRecoveredName = spreadsheet.getSheetByName(String(report.sheetName));
    if (foundRecoveredName) return foundRecoveredName;
  }
  const base = sanitizeSheetName_((report.site || 'CENTRE') + ' ' + formatDateForName_(report.mainDate));
  return spreadsheet.insertSheet(uniqueSheetName_(spreadsheet, base));
};
