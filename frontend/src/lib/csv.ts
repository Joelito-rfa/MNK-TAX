/**
 * Génération CSV compatible Excel.
 *
 * - UTF-8 avec BOM : Excel reconnaît directement l'encodage.
 * - Séparateur « ; » par défaut : attendu par Excel en locale française.
 * - Échappement correct des guillemets, retours à la ligne et séparateurs.
 */
export type CsvDelimiter = ';' | ','

export interface CsvOptions {
  delimiter?: CsvDelimiter
  /** false pour un CSV sans BOM (usage interne). */
  bom?: boolean
}

function escape(value: string | number | boolean | Date | null | undefined, _delimiter: CsvDelimiter): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // On entoure systématiquement de guillemets toute valeur contenant un
  // séparateur ou une virgule : une donnée comme « NIF, nom » reste ainsi
  // dans une seule cellule et n'est jamais éclatée en plusieurs colonnes.
  return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(
  headers: string[],
  rows: (string | number | boolean | Date | null | undefined)[][],
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ';'
  const bom = options.bom === false ? '' : '\ufeff'
  const lines = [
    headers.map((h) => escape(h, delimiter)).join(delimiter),
    ...rows.map((row) => row.map((cell) => escape(cell, delimiter)).join(delimiter)),
  ]
  return bom + lines.join('\r\n')
}

/**
 * Détecte le séparateur le plus probable d'un contenu CSV en ignorant
 * les séparateurs présents à l'intérieur des cellules entre guillemets.
 */
function detectDelimiter(text: string): CsvDelimiter {
  const line = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  let semicolons = 0
  let commas = 0
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') i++
      else inQuotes = !inQuotes
    } else if (!inQuotes && ch === ';') semicolons++
    else if (!inQuotes && ch === ',') commas++
  }
  return semicolons >= commas ? ';' : ','
}

/**
 * Lit un contenu CSV (séparateur « ; » ou « , » détecté automatiquement).
 * Gère le BOM UTF-8, les fins de ligne CRLF/LF et les cellules entre
 * guillemets (y compris les guillemets échappés et les retours à la ligne).
 */
export function parseCsv(text: string, delimiter?: CsvDelimiter): string[][] {
  const raw = text.replace(/^\ufeff/, '')
  const delim = delimiter ?? detectDelimiter(raw)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else if (ch !== '\r') {
      cell += ch
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Génère un fichier CSV et déclenche son téléchargement. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | Date | null | undefined)[][],
  options: CsvOptions = {},
) {
  const csv = buildCsv(headers, rows, options)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
