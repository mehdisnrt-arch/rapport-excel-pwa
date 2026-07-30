'use strict';

/* Correction stricte : la partie Energie ne doit jamais apparaître lorsque
   seule la date est renseignée. Les champs masqués Unité/Marque ne comptent
   pas non plus. Une mesure, une remarque ou une photo réelle est nécessaire. */

const rowHasUsefulDataBeforeEnergyV11 = rowHasUsefulData;

function energyRowHasRealData(row = {}) {
  const realFields = [
    'puissance',
    'uout',
    'frequence',
    'ubatterie',
    'compteur',
    'tempHuile',
    'pressionHuile',
    'remarks'
  ];

  const hasMeasurement = realFields.some(field => hasText(row[field]));
  const hasPhotos = typeof parsePhotoList === 'function' && parsePhotoList(row).length > 0;
  return hasMeasurement || hasPhotos;
}

rowHasUsefulData = function rowHasUsefulDataV11(kind, row) {
  if (kind === 'energie') return energyRowHasRealData(row);
  return rowHasUsefulDataBeforeEnergyV11(kind, row);
};

visibleRows = function visibleRowsV11(section) {
  const kind = section?.kind || '';
  return (section?.rows || []).filter(row => rowHasUsefulData(kind, row));
};

sectionHasData = function sectionHasDataV11(section) {
  return visibleRows(section).length > 0;
};
