import xlsx from 'xlsx';

/**
 * Creates an Excel worksheet with auto-adjusted column widths
 * so headers and data cells are nicely padded and never clipped.
 */
export function createExportWorksheet(exportData) {
  const ws = xlsx.utils.json_to_sheet(exportData);
  if (exportData && exportData.length > 0) {
    const keys = Object.keys(exportData[0]);
    ws['!cols'] = keys.map((key) => {
      let maxLen = key.length;
      exportData.forEach((row) => {
        const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      // wch specifies character width. Add padding of +4 and minimum 12
      return { wch: Math.max(maxLen + 4, 12) };
    });
  }
  return ws;
}
