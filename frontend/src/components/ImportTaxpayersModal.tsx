import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, FileUp, Upload, XCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Modal, Textarea } from './ui'
import { useToast } from './Toast'
import { useI18n } from '../lib/i18n'
import { parseCsv } from '../lib/csv'
import { apiErrorMessage, apiPatch, apiPost } from '../lib/api'
import type { TaxCenter, TaxRegime, TaxpayerDetail } from '../types'

interface ImportTaxpayersModalProps {
  onClose: () => void
  taxCenters: TaxCenter[]
  taxRegimes: TaxRegime[]
}

interface ImportRow {
  line: number
  name: string
  type: 'PERSON' | 'COMPANY'
  phone: string
  email: string
  status: string
  taxCenterLabel: string
  taxRegimeLabel: string
  taxCenterId?: number
  taxRegimeId?: number
  errors: string[]
}

interface ImportResult {
  created: number
  failures: { line: number; message: string }[]
}

const HEADER_ALIASES: Record<string, string> = {
  nif: 'nif',
  nom: 'name',
  name: 'name',
  'raison sociale': 'name',
  anarana: 'name',
  type: 'type',
  karazana: 'type',
  contact: 'phone',
  telephone: 'phone',
  phone: 'phone',
  fifandraisana: 'phone',
  email: 'email',
  'e-mail': 'email',
  statut: 'status',
  status: 'status',
  sata: 'status',
  'centre fiscal': 'taxCenter',
  'tax center': 'taxCenter',
  taxcenter: 'taxCenter',
  'foibe hetra': 'taxCenter',
  regime: 'taxRegime',
  taxregime: 'taxRegime',
  fitondrana: 'taxRegime',
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeType(value: string): 'PERSON' | 'COMPANY' {
  const v = normalize(value)
  if (['person', 'individual', 'particulier', 'personne physique', 'olona', 'olom-pirenena'].includes(v)) {
    return 'PERSON'
  }
  return 'COMPANY'
}

function normalizeStatus(value: string): string | null {
  const v = normalize(value)
  if (!v) return 'ACTIVE'
  if (['active', 'actif', 'actif/active', 'velona'].includes(v)) return 'ACTIVE'
  if (['inactive', 'inactif', 'tsy velona'].includes(v)) return 'INACTIVE'
  if (['suspended', 'suspendu', 'suspendue', 'naato'].includes(v)) return 'SUSPENDED'
  if (['closed', 'ferme', 'fermee', 'mihidy'].includes(v)) return 'CLOSED'
  return null
}

/** Associe une valeur (code ou nom) à un centre fiscal / régime. */
function resolveRef<T extends { id: number; code: string; name: string }>(value: string, refs: T[]): T | undefined {
  const v = normalize(value)
  if (!v) return undefined
  return refs.find((r) => normalize(r.code) === v || normalize(r.name) === v)
}

function buildRows(
  text: string,
  taxCenters: TaxCenter[],
  taxRegimes: TaxRegime[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): ImportRow[] {
  const table = parseCsv(text)
  if (table.length === 0) return []

  // Détection d'une ligne d'en-tête.
  const first = table[0].map((c) => HEADER_ALIASES[normalize(c)] ?? '')
  const hasHeader = first.some(Boolean)
  const columns = hasHeader
    ? first
    : ['nif', 'name', 'type', 'phone', 'email', 'status', 'taxCenter', 'taxRegime']

  const indexOf = (key: string) => columns.indexOf(key)
  const dataRows = hasHeader ? table.slice(1) : table

  return dataRows.map((cells, i) => {
    const get = (key: string) => {
      const idx = indexOf(key)
      return idx >= 0 ? (cells[idx] ?? '').trim() : ''
    }

    const errors: string[] = []
    const name = get('name')
    if (!name) errors.push(t('tp.import.noName'))

    const statusValue = get('status')
    const status = normalizeStatus(statusValue)
    if (statusValue && !status) errors.push(t('tp.import.unknownStatus', { value: statusValue }))

    const centerValue = get('taxCenter')
    const center = resolveRef(centerValue, taxCenters)
    if (centerValue && !center) errors.push(t('tp.import.unknownCenter', { value: centerValue }))

    const regimeValue = get('taxRegime')
    const regime = resolveRef(regimeValue, taxRegimes)
    if (regimeValue && !regime) errors.push(t('tp.import.unknownRegime', { value: regimeValue }))

    return {
      line: (hasHeader ? i + 2 : i + 1),
      name,
      type: normalizeType(get('type')),
      phone: get('phone'),
      email: get('email'),
      status: status ?? 'ACTIVE',
      taxCenterLabel: center?.code ?? '',
      taxRegimeLabel: regime?.code ?? '',
      taxCenterId: center?.id,
      taxRegimeId: regime?.id,
      errors,
    }
  })
}

export default function ImportTaxpayersModal({ onClose, taxCenters, taxRegimes }: ImportTaxpayersModalProps) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  const rows = useMemo(() => buildRows(text, taxCenters, taxRegimes, t), [text, taxCenters, taxRegimes, t])
  const validRows = rows.filter((r) => r.errors.length === 0)

  async function onFileChange(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setResult(null)
    try {
      setText(await file.text())
    } catch {
      toast.error(t('tp.import.invalid'))
    }
  }

  async function runImport() {
    if (running || validRows.length === 0) return
    setRunning(true)
    const failures: ImportResult['failures'] = []
    let created = 0

    for (const row of rows) {
      if (row.errors.length > 0) {
        failures.push({ line: row.line, message: row.errors.join(' · ') })
        continue
      }
      try {
        const body: Record<string, unknown> = { type: row.type, name: row.name }
        if (row.phone) body.phone = row.phone
        if (row.email) body.email = row.email
        if (row.taxCenterId !== undefined) body.taxCenterId = row.taxCenterId
        if (row.taxRegimeId !== undefined) body.taxRegimeId = row.taxRegimeId
        const saved = await apiPost<TaxpayerDetail>('/taxpayers', body)
        if (row.status !== 'ACTIVE') {
          await apiPatch(`/taxpayers/${saved.id}/status?status=${row.status}`, {})
        }
        created++
      } catch (error) {
        failures.push({ line: row.line, message: apiErrorMessage(error) })
      }
    }

    setRunning(false)
    setResult({ created, failures })
    if (created > 0) {
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      queryClient.invalidateQueries({ queryKey: ['taxpayer-stats'] })
      toast.success(t('tp.import.result', { created }))
    } else {
      toast.error(t('tp.import.done'))
    }
  }

  return (
    <Modal open onClose={onClose} title={t('tp.import.title')} size="wide">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('tp.import.subtitle')}</p>

        <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" /> {t('tp.import.choose')}
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fileName || t('tp.import.paste')}
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setFileName('')
              setResult(null)
            }}
            placeholder={t('tp.import.placeholder')}
            rows={5}
            className="mt-3 font-mono text-xs"
          />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{t('tp.import.hint')}</p>
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('tp.import.preview', { count: rows.length })}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {validRows.length}/{rows.length}
              </span>
            </div>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t('tp.import.col.name')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.type')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.phone')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.email')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.status')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.taxCenter')}</th>
                    <th className="px-3 py-2">{t('tp.import.col.taxRegime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row) => (
                    <tr
                      key={row.line}
                      className={
                        row.errors.length > 0
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                          : 'text-slate-600 dark:text-slate-300'
                      }
                    >
                      <td className="px-3 py-1.5">{row.line}</td>
                      <td className="px-3 py-1.5">{row.name || '—'}</td>
                      <td className="px-3 py-1.5">{row.type === 'COMPANY' ? t('tp.company') : t('tp.individual')}</td>
                      <td className="px-3 py-1.5">{row.phone || '—'}</td>
                      <td className="px-3 py-1.5">{row.email || '—'}</td>
                      <td className="px-3 py-1.5">{row.status}</td>
                      <td className="px-3 py-1.5">{row.taxCenterLabel || '—'}</td>
                      <td className="px-3 py-1.5">{row.taxRegimeLabel || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.some((r) => r.errors.length > 0) && (
              <ul className="space-y-0.5 text-xs text-rose-600 dark:text-rose-400">
                {rows
                  .filter((r) => r.errors.length > 0)
                  .slice(0, 8)
                  .map((r) => (
                    <li key={r.line}>
                      {t('tp.import.row', { line: r.line })} — {r.errors.join(' · ')}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {t('tp.import.result', { created: result.created })}
            </div>
            {result.failures.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-rose-600 dark:text-rose-400">
                  <XCircle className="h-4 w-4" /> {t('tp.import.failed', { count: result.failures.length })}
                </div>
                <ul className="max-h-40 space-y-0.5 overflow-auto text-xs text-slate-600 dark:text-slate-300">
                  {result.failures.map((f, i) => (
                    <li key={`${f.line}-${i}`}>
                      {t('tp.import.row', { line: f.line })} — {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {result ? t('tp.import.close') : t('tp.import.cancel')}
          </Button>
          <Button
            type="button"
            onClick={runImport}
            disabled={running || validRows.length === 0}
            loading={running}
          >
            <Upload className="h-4 w-4" />
            {running ? t('tp.import.running') : t('tp.import.submit', { count: validRows.length })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
