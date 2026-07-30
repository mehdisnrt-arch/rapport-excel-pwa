'use strict';

/* Correction de mise en page Google Sheets.
   Peut être collée à la fin de Code.gs ou ajoutée comme fichier zz_ReportStyleFix.gs.
   Le rapport reprend la structure de l'aperçu PWA et la colonne Photos n'existe
   que lorsqu'au moins une vraie photo est présente dans la partie. */

renderReportSheet_ = function(sheet, report) {
  removeAllImages_(sheet);
  try {
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();
  } catch (_) {}
  sheet.clear();
  sheet.clearFormats();
  sheet.setFrozenRows(0);
  sheet.setHiddenGridlines(true);

  const maxColumns = 14;
  ensureSheetSize_(sheet, 200, maxColumns);

  sheet.getRange(1, 1, 1, maxColumns).merge();
  sheet.getRange(1, 1)
    .setValue('RAPPORT DE MAINTENANCE')
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#ffffff')
    .setFontColor('#111827');
  sheet.setRowHeight(1, 34);

  const meta = [
    ['Centre', report.site || '', 'Date', formatDateFr_(report.mainDate)],
    ['Période', report.period || '', 'Opérateurs', report.operators || '']
  ];
  const metaRange = sheet.getRange(3, 1, 2, 4);
  metaRange.setValues(meta)
    .setBorder(true, true, true, true, true, true)
    .setVerticalAlignment('middle');
  sheet.getRange(3, 1, 2, 1).setFontWeight('bold').setBackground('#f3f4f6');
  sheet.getRange(3, 3, 2, 1).setFontWeight('bold').setBackground('#f3f4f6');
  sheet.getRange(3, 2, 2, 1).setBackground('#ffffff');
  sheet.getRange(3, 4, 2, 1).setBackground('#ffffff');

  let row = 7;
  let usedMaxColumns = 4;
  const order = ['tnt', 'fm', 'clim', 'energie', 'satellite'];
  order.forEach(function(key) {
    const section = report.sections[key];
    const visible = visibleRows_(key, section);
    if (!section || section.disabled === true || !visible.length) return;
    const showPhotos = visible.some(function(item) { return photoList_(item).length > 0; });
    const schema = sectionSchema_(key, showPhotos);
    usedMaxColumns = Math.max(usedMaxColumns, schema.columnCount);
    row = renderSection_(sheet, row, key, section, visible);
    row += 2;
  });

  if (row === 7) {
    sheet.getRange(7, 1, 1, 6).merge();
    sheet.getRange(7, 1)
      .setValue('Aucune partie remplie.')
      .setFontStyle('italic')
      .setFontColor('#64748b');
  }

  sheet.autoResizeColumns(1, usedMaxColumns);
  sheet.setColumnWidth(1, Math.max(sheet.getColumnWidth(1), 120));
  for (let col = 2; col <= usedMaxColumns; col += 1) {
    sheet.setColumnWidth(col, Math.min(Math.max(sheet.getColumnWidth(col), 68), 125));
  }
};

renderSection_ = function(sheet, startRow, key, section, rows) {
  const showPhotos = rows.some(function(row) { return photoList_(row).length > 0; });
  const schema = sectionSchema_(key, showPhotos);
  const columnCount = schema.columnCount;

  sheet.getRange(startRow, 1, 1, columnCount).merge();
  sheet.getRange(startRow, 1)
    .setValue(section.title || defaultSectionTitle_(key))
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('left')
    .setBackground('#ffffff')
    .setFontColor('#111827');
  sheet.setRowHeight(startRow, 25);

  let dataStart;
  if (key === 'tnt' || key === 'fm') {
    const topHeaderRow = startRow + 1;
    const subHeaderRow = startRow + 2;
    const headerRange = sheet.getRange(topHeaderRow, 1, 2, columnCount);
    headerRange
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true)
      .setBackground('#f3f4f6')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange(topHeaderRow, 1, 2, 1).merge().setValue('Service');
    sheet.getRange(topHeaderRow, 2, 1, 5).merge().setValue('Avant Intervention');
    sheet.getRange(topHeaderRow, 7, 1, 5).merge().setValue('Après Intervention');
    sheet.getRange(topHeaderRow, 12, 2, 1).merge().setValue('Date');
    sheet.getRange(topHeaderRow, 13, 2, 1).merge().setValue('Remarques');
    if (showPhotos) sheet.getRange(topHeaderRow, 14, 2, 1).merge().setValue('Photos');
    sheet.getRange(subHeaderRow, 2, 1, 10).setValues([[
      'FWD', 'REF', 'T°', 'Alarm', 'Type',
      'FWD', 'REF', 'T°', 'Alarm', 'Type'
    ]]);
    sheet.setRowHeights(topHeaderRow, 2, 25);
    dataStart = subHeaderRow + 1;
  } else {
    const headerRow = startRow + 1;
    sheet.getRange(headerRow, 1, 1, columnCount)
      .setValues([schema.headers])
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true)
      .setBackground('#f3f4f6')
      .setBorder(true, true, true, true, true, true);
    sheet.setRowHeight(headerRow, 28);
    dataStart = headerRow + 1;
  }

  const values = rows.map(function(row) { return schema.values(row); });
  if (values.length) {
    const dataRange = sheet.getRange(dataStart, 1, values.length, columnCount);
    dataRange
      .setValues(values)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center')
      .setWrap(true)
      .setBorder(true, true, true, true, true, true);

    sheet.getRange(dataStart, 1, values.length, 1)
      .setFontWeight('bold')
      .setHorizontalAlignment('left');

    if (showPhotos && schema.photoColumn) {
      rows.forEach(function(row, index) {
        insertPhotos_(sheet, dataStart + index, schema.photoColumn, photoList_(row));
      });
    }
  }

  let nextRow = dataStart + values.length;
  const interventions = Array.isArray(section.interventions) ? section.interventions.filter(Boolean) : [];
  if (interventions.length && key !== 'satellite') {
    sheet.getRange(nextRow, 1, 1, columnCount).merge();
    sheet.getRange(nextRow, 1)
      .setValue('Interventions sur site:')
      .setFontWeight('bold')
      .setBackground('#ffffff');
    nextRow += 1;

    interventions.forEach(function(item, index) {
      sheet.getRange(nextRow + index, 1, 1, columnCount).merge();
      sheet.getRange(nextRow + index, 1)
        .setValue((index + 1) + '. ' + item)
        .setWrap(true)
        .setHorizontalAlignment('left');
    });
    nextRow += interventions.length;
  }

  return nextRow;
};

sectionSchema_ = function(key, showPhotos) {
  if (key === 'tnt' || key === 'fm') {
    return {
      columnCount: showPhotos ? 14 : 13,
      photoColumn: showPhotos ? 14 : 0,
      values: function(row) {
        const values = [
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
          row.remarks || ''
        ];
        if (showPhotos) values.push('');
        return values;
      }
    };
  }

  if (key === 'clim') {
    const headers = ['Climatiseur', 'T. Cons.', 'T. Salle', 'Date', 'Remarques'];
    if (showPhotos) headers.push('Photos');
    return {
      headers: headers,
      columnCount: headers.length,
      photoColumn: showPhotos ? headers.length : 0,
      values: function(row) {
        const values = [
          row.service || 'Climatiseur',
          row.tempCons || '',
          row.tempSalle || '',
          formatDateFr_(row.date),
          row.remarks || ''
        ];
        if (showPhotos) values.push('');
        return values;
      }
    };
  }

  if (key === 'energie') {
    const headers = [
      'Puissance',
      'U. out',
      'Fréquence (HZ)',
      'U. Batterie',
      'Compteur (h)',
      'Temp. Huile',
      'Pression Huile',
      'Date',
      'Remarques'
    ];
    if (showPhotos) headers.push('Photos');
    return {
      headers: headers,
      columnCount: headers.length,
      photoColumn: showPhotos ? headers.length : 0,
      values: function(row) {
        const values = [
          row.puissance || '',
          row.uout || '',
          row.frequence || '',
          row.ubatterie || '',
          row.compteur || '',
          row.tempHuile || '',
          row.pressionHuile || '',
          formatDateFr_(row.date),
          row.remarks || ''
        ];
        if (showPhotos) values.push('');
        return values;
      }
    };
  }

  const headers = ['C/N (dB)'];
  if (showPhotos) headers.push('Photos');
  return {
    headers: headers,
    columnCount: headers.length,
    photoColumn: showPhotos ? headers.length : 0,
    values: function(row) {
      const values = [row.cn || ''];
      if (showPhotos) values.push('');
      return values;
    }
  };
};

insertPhotos_ = function(sheet, row, column, sources) {
  if (!column) return;
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
    } catch (_) {}
  });
};
