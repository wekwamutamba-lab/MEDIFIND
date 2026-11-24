// Saves a report as CSV, Excel (.xlsx) or PDF in the browser.
//
// A report is a title plus one or more sections. Each section is a table:
//   { title?, columns: [{ label, value: (row) => string|number, money?, width? }], rows: [...] }
// CSV puts the sections one after another, Excel puts each on its own sheet,
// PDF puts them one under another. The Excel and PDF libraries are only
// downloaded the first time someone exports, so they do not slow down the app.

const today = () => new Date().toISOString().slice(0, 10);

const cellValue = (col, row) => {
  const v = col.value(row);
  return v === undefined || v === null ? '' : v;
};

const shown = (col, v) => (col.money && typeof v === 'number' ? v.toFixed(2) : String(v));

function save(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(report) {
  const esc = (s) => {
    const t = String(s);
    // a leading = + - @ would make spreadsheet programs run it as a formula
    const safe = /^[=+\-@]/.test(t) && !/^-?\d/.test(t) ? `'${t}` : t;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [];
  report.sections.forEach((s, i) => {
    if (i > 0) lines.push('');
    if (s.title && report.sections.length > 1) lines.push(esc(s.title));
    lines.push(s.columns.map((c) => esc(c.label)).join(','));
    for (const row of s.rows) lines.push(s.columns.map((c) => esc(shown(c, cellValue(c, row)))).join(','));
  });
  // the BOM makes Excel read letters such as é correctly
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

async function toXlsx(report, fileName) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const sheets = report.sections.map((s, i) => ({
    sheet: (s.title || report.title || `Sheet ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31),
    stickyRowsCount: 1,
    columns: s.columns.map((c) => ({ width: c.width || Math.max(12, c.label.length + 2) })),
    data: [
      s.columns.map((c) => ({ value: c.label, fontWeight: 'bold' })),
      ...s.rows.map((row) =>
        s.columns.map((c) => {
          const v = cellValue(c, row);
          if (v === '') return null;
          if (typeof v === 'number') return { value: v, type: Number, format: c.money ? '#,##0.00' : undefined };
          return { value: String(v), type: String };
        })
      ),
    ],
  }));
  await writeXlsxFile(sheets).toFile(fileName);
}

async function toPdf(report) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const wide = Math.max(...report.sections.map((s) => s.columns.length)) > 6;
  const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const left = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(report.title, left, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text([report.subtitle, `Exported ${today()}`].filter(Boolean).join('   |   '), left, 66);

  let y = 84;
  for (const s of report.sections) {
    if (s.title && report.sections.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(s.title, left, y + 12);
      y += 20;
    }
    autoTable(doc, {
      startY: y,
      margin: { left, right: left },
      head: [s.columns.map((c) => c.label)],
      body: s.rows.map((row) => s.columns.map((c) => shown(c, cellValue(c, row)))),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, textColor: 20 },
      headStyles: { fillColor: [15, 61, 46], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 245] },
      columnStyles: Object.fromEntries(s.columns.map((c, i) => [i, c.money ? { halign: 'right' } : {}])),
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`MediFind  |  Page ${i} of ${pages}`, left, doc.internal.pageSize.getHeight() - 20);
  }
  return doc.output('blob');
}

export const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV (.csv)' },
  { key: 'xlsx', label: 'Excel (.xlsx)' },
  { key: 'pdf', label: 'PDF (.pdf)' },
];

// report: { title, subtitle?, fileBase, sections: [...] }
export async function exportReport(report, format) {
  const fileName = `${report.fileBase}-${today()}.${format}`;
  if (format === 'csv') return save(toCsv(report), fileName);
  if (format === 'xlsx') return toXlsx(report, fileName);
  if (format === 'pdf') return save(await toPdf(report), fileName);
  throw new Error(`Unknown export format: ${format}`);
}

// Fetches every page of a list endpoint (the server sends at most 100 rows at a time)
export async function fetchAllPages(getPage, params = {}) {
  const limit = 100;
  const rows = [];
  for (let page = 1; page <= 200; page++) {
    const res = await getPage({ ...params, page, limit });
    const batch = res?.data ?? [];
    rows.push(...batch);
    if (batch.length < limit || rows.length >= (res?.total ?? 0)) break;
  }
  return rows;
}
