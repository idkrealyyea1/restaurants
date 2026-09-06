'use strict';

/**
 * Minimal CSV serialization — RFC 4180-ish, UTF-8, BOM for Excel.
 * No dependencies; fine for lightweight Gaza-first reports.
 */

function escapeCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csv(rows, { bom = true } = {}) {
  const lines = rows.map((row) => row.map(escapeCell).join(','));
  const body = lines.join('\r\n');
  return (bom ? '\uFEFF' : '') + body;
}

/** Build a CSV response with download headers. */
function sendCsv(res, filename, rows) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.set('Cache-Control', 'no-store');
  res.send(csv(rows));
}

module.exports = { csv, sendCsv };
