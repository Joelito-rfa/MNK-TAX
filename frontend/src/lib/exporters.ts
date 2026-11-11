import { downloadCsv } from './csv'

/** Formats proposés par le générateur de rapports. */
export type ReportFormat = 'CSV' | 'Excel' | 'PDF'

export type ExportCell = string | number | boolean | null | undefined | Date

function escapeHtml(v: ExportCell): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function xmlEscape(v: string | number): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function textOf(value: ExportCell): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return String(value)
}

function isNumeric(value: ExportCell): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function tableHtml(headers: string[], rows: ExportCell[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * Vrai fichier Excel (SpreadsheetML 2003, extension .xls).
 * Colonnes alignées, largeurs automatiques, nombres au format français.
 * Aucune dépendance externe : Excel et LibreOffice ouvrent ce format nativement.
 */
export function downloadExcel(
  filenameBase: string,
  title: string,
  headers: string[],
  rows: ExportCell[][],
) {
  const safeName = (title || filenameBase || 'Export')
    .replace(/[\\[\]:*?/]/g, '-')
    .slice(0, 31) || 'Export'

  // Largeur de colonne : environ 7 points par caractère, bornée pour rester lisible.
  const widths = headers.map((header, index) => {
    let max = textOf(header).length
    for (const row of rows) {
      const len = textOf(row[index] ?? '').length
      if (len > max) max = len
    }
    return Math.max(50, Math.min(500, max * 7 + 5))
  })

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(textOf(h))}</Data></Cell>`)
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells: string[] = []
      for (let i = 0; i < headers.length; i++) {
        const value = row[i]
        if (isNumeric(value)) {
          const style = Number.isInteger(value) ? 'Int' : 'Decimal'
          cells.push(`<Cell ss:StyleID="${style}"><Data ss:Type="Number">${value}</Data></Cell>`)
        } else {
          cells.push(`<Cell><Data ss:Type="String">${xmlEscape(textOf(value))}</Data></Cell>`)
        }
      }
      return `<Row>${cells.join('')}</Row>`
    })
    .join('\r\n')

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\r\n' +
    '<?mso-application progid="Excel.Sheet"?>\r\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\r\n' +
    ' xmlns:o="urn:schemas-microsoft-com:office:office"\r\n' +
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"\r\n' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\r\n' +
    ' <Styles>\r\n' +
    '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/></Style>\r\n' +
    '  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9E1F2" ss:Pattern="Solid"/></Style>\r\n' +
    '  <Style ss:ID="Int"><NumberFormat ss:Format="#,##0"/></Style>\r\n' +
    '  <Style ss:ID="Decimal"><NumberFormat ss:Format="#,##0.00"/></Style>\r\n' +
    ' </Styles>\r\n' +
    ` <Worksheet ss:Name="${xmlEscape(safeName)}">\r\n` +
    '  <Table>\r\n' +
    widths.map((w) => `   <Column ss:Width="${w}"/>`).join('\r\n') +
    '\r\n   <Row>' + headerCells + '</Row>\r\n' +
    bodyRows +
    '\r\n  </Table>\r\n' +
    ' </Worksheet>\r\n' +
    '</Workbook>\r\n'

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.xls`
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
