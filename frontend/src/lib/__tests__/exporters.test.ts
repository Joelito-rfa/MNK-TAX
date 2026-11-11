import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { buildCsv } from '../csv'
import { exportTable } from '../exporters'

/* ── CSV ── */

describe('buildCsv', () => {
  const headers = ['Référence', 'Nom', 'Montant']
  const rows: (string | number | null | undefined)[][] = [
    ['D-1', 'Rakoto', 1500],
    ['D-2', 'Rivo; "fils"', null],
    ['D-3', 'Multi\nligne', undefined],
  ]

  it('préfixe le BOM UTF-8 pour Excel', () => {
    expect(buildCsv(headers, rows).startsWith('\ufeff')).toBe(true)
    expect(buildCsv(headers, rows, { bom: false }).startsWith('\ufeff')).toBe(false)
  })

  it('sépare les colonnes par « ; » et les lignes par CRLF', () => {
    const csv = buildCsv(headers, rows, { bom: false })
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('Référence;Nom;Montant')
  })

  it('échappe les séparateurs, guillemets et retours à la ligne', () => {
    const csv = buildCsv(headers, rows, { bom: false })
    expect(csv).toContain('"Rivo; ""fils"""')
    expect(csv).toContain('"Multi\nligne"')
  })

  it('remplace null/undefined par une cellule vide', () => {
    const csv = buildCsv(['A', 'B'], [[null, undefined]], { bom: false })
    expect(csv.split('\r\n')[1]).toBe(';')
  })

  it('accepte un séparateur virgule (CSV standard)', () => {
    const csv = buildCsv(['A', 'B'], [['x', 'y,z']], { bom: false, delimiter: ',' })
    expect(csv.split('\r\n')[1]).toBe('x,"y,z"')
  })
})

/* ── Export Excel (SpreadsheetML) ── */

describe('exportTable', () => {
  let created: { blob: Blob; filename: string } | null = null
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    created = null
    // jsdom ne sait pas créer d'objets URL : on capture le Blob produit.
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created = { blob, filename: '' }
      return 'blob:mock'
    }) as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (created) created.filename = this.download
    })
  })

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('génère un vrai classeur Excel (.xls) avec en-têtes en gras', async () => {
    exportTable('Excel', 'creances_2026-01-01', 'Créances', ['Référence', 'Solde'], [['D-1', 25000]])

    expect(created).not.toBeNull()
    expect(created!.filename).toBe('creances_2026-01-01.xls')

    const xml = await created!.blob.text()
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>')
    expect(xml).toContain('<Style ss:ID="Header"><Font ss:Bold="1"/>')
    expect(xml).toContain('<Data ss:Type="String">Référence</Data>')
    // Les nombres restent des nombres (tri/agrégation Excel).
    expect(xml).toContain('<Data ss:Type="Number">25000</Data>')
    expect(xml).toContain('ss:Name="Créances"')
  })

  it('échappe les caractères XML dangereux dans les cellules', async () => {
    exportTable('Excel', 'x', 'T', ['A'], [['<tag> & "quote"']])

    const xml = await created!.blob.text()
    expect(xml).toContain('&lt;tag&gt; &amp; &quot;quote&quot;')
    expect(xml).not.toContain('<tag>')
  })

  it('exporte en CSV avec BOM et séparateur « ; »', async () => {
    exportTable('CSV', 'quittances_2026-01-01', 'Quittances', ['N°', 'Montant'], [['Q-1', 1200]])

    expect(created!.filename).toBe('quittances_2026-01-01.csv')
    // Blob.text() retire le BOM : on vérifie les premiers octets (EF BB BF).
    const bytes = new Uint8Array(await created!.blob.arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
    const csv = await created!.blob.text()
    expect(csv).toContain('N°;Montant')
    expect(csv).toContain('Q-1;1200')
  })
})
