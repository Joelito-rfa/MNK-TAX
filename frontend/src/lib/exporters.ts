import { downloadCsv } from './csv'

/** Formats proposés par le générateur de rapports. */
export type ReportFormat = 'CSV' | 'Excel' | 'PDF'

export type ExportCell = string | number | null | undefined

function escapeHtml(v: ExportCell): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tableHtml(headers: string[], rows: ExportCell[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * Fichier Excel (.xls) généré côté client : tableau HTML avec le MIME d'Excel,
 * ouvert nativement par Microsoft Excel et LibreOffice Calc.
 */
function downloadExcel(baseName: string, title: string, headers: string[], rows: ExportCell[][]) {
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    '<head><meta charset="utf-8">' +
    '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
    `<x:Name>${escapeHtml(title)}</x:Name>` +
    '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
    '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
    '</head><body>' +
    `<h3>${escapeHtml(title)}</h3>` +
    tableHtml(headers, rows) +
    '</body></html>'
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * PDF : ouvre une vue imprimable mise en page et déclenche le dialogue
 * d'impression (« Enregistrer en PDF »). Aucune dépendance externe nécessaire.
 */
function printPdf(title: string, headers: string[], rows: ExportCell[][]) {
  const win = window.open('', '_blank')
  if (!win) {
    throw new Error('Fenêtre d\'impression bloquée — autorisez les pop-ups pour exporter en PDF')
  }
  const html =
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    `<title>${escapeHtml(title)}</title>` +
    '<style>' +
    'body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#0f172a}' +
    'h1{font-size:16px;margin:0 0 4px}' +
    '.meta{font-size:11px;color:#64748b;margin:0 0 14px}' +
    'table{border-collapse:collapse;width:100%;font-size:11px}' +
    'th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}' +
    'th{background:#f1f5f9}' +
    'tr{page-break-inside:avoid}' +
    'button{margin-bottom:14px;padding:6px 14px;border:0;border-radius:6px;background:#4f46e5;color:#fff;font-size:12px;cursor:pointer}' +
    '@media print{button{display:none}}' +
    '</style></head><body>' +
    `<h1>${escapeHtml(title)}</h1>` +
    `<p class="meta">Généré le ${new Date().toLocaleString('fr-FR')} · ${rows.length} ligne(s)</p>` +
    '<button onclick="window.print()">Imprimer / Enregistrer en PDF</button>' +
    tableHtml(headers, rows) +
    '</body></html>'
  win.document.open()
  win.document.write(html)
  win.document.close()
  window.setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch { /* le bouton reste disponible dans la fenêtre */ }
  }, 300)
}

/** Déclenche l'export du tableau dans le format choisi par l'utilisateur. */
export function exportTable(
  format: ReportFormat,
  filenameBase: string,
  title: string,
  headers: string[],
  rows: ExportCell[][],
): void {
  if (format === 'Excel') {
    downloadExcel(filenameBase, title, headers, rows)
    return
  }
  if (format === 'PDF') {
    printPdf(title, headers, rows)
    return
  }
  downloadCsv(`${filenameBase}.csv`, headers, rows)
}
