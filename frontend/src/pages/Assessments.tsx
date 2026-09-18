import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, Eye, FileText, Receipt, Scale, Wallet } from 'lucide-react'
import { fmtDate, fmtMGA, fmtNumber } from '../lib/format'
import { useI18n } from '../lib/i18n'
import type { Assessment } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useAssessmentDetail, useAssessments, useTaxTypesRef } from '../features/assessment/api/queries'

export default function Assessments() {
  const { locale } = useI18n()
  const [params, setParams] = useSearchParams()
  const taxpayerId = params.get('taxpayerId') ?? ''
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (q) p.set('q', q)
    if (taxTypeCode) p.set('taxTypeCode', taxTypeCode)
    if (period) p.set('period', period)
    if (taxpayerId) p.set('taxpayerId', taxpayerId)
    return p.toString()
  }, [page, size, q, taxTypeCode, period, taxpayerId])

  const { data, isLoading } = useAssessments(query)
  const { data: taxTypes } = useTaxTypesRef()

  const totals = useMemo(() => {
    const rows = data?.content ?? []
    return {
      base: rows.reduce((s, a) => s + (a.taxBase ?? 0), 0),
      net: rows.reduce((s, a) => s + (a.netTax ?? 0), 0),
    }
  }, [data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impositions"
        subtitle="Impositions calculées automatiquement après validation des déclarations"
        actions={
          taxpayerId ? (
            <Button variant="secondary" onClick={() => setParams({})}>
              Retirer le filtre contribuable
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Impositions (page)" value={fmtNumber(data?.totalElements ?? 0, locale)} icon={<Scale className="h-5 w-5" />} tone="violet" />
        <StatCard label="Base imposable (page)" value={fmtMGA(totals.base, locale)} icon={<Calculator className="h-5 w-5" />} tone="brand" />
        <StatCard label="Impôt net (page)" value={fmtMGA(totals.net, locale)} icon={<Wallet className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Règle appliquée" value={data?.content[0]?.ruleCode ?? '—'} sub={data?.content[0] ? `v${data.content[0].ruleVersion}` : undefined} icon={<FileText className="h-5 w-5" />} tone="sky" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v)
              setPage(0)
            }}
            placeholder="Rechercher par référence, NIF ou nom…"
            className="min-w-56 flex-1"
          />
          <div className="w-52">
            <Select
              value={taxTypeCode}
              onChange={(e) => {
                setTaxTypeCode(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Tous les impôts</option>
              {taxTypes?.map((tt) => (
                <option key={tt.id} value={tt.code}>
                  {tt.code} — {tt.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Toutes les périodes</option>
              <option value="M">Mensuelle</option>
              <option value="T">Trimestrielle</option>
              <option value="A">Annuelle</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title="Aucune imposition"
            subtitle="Les impositions sont générées automatiquement lors de la validation d'une déclaration."
          />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Impôt</Th>
                  <Th>Période</Th>
                  <Th>Base imposable</Th>
                  <Th>Impôt net</Th>
                  <Th>Calculé le</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((a) => (
                  <tr key={a.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                    <Td className="font-mono font-medium text-brand-700 dark:text-brand-300">{a.reference}</Td>
                    <Td>
                      <Link to={`/taxpayers/${a.taxpayerId}`} className="hover:underline">
                        <span className="block max-w-44 truncate font-medium text-slate-800 dark:text-slate-200">{a.taxpayerName}</span>
                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500">{a.nif}</span>
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone="violet">{a.taxTypeCode}</Badge>
                    </Td>
                    <Td className="text-slate-600 dark:text-slate-400">{a.period}</Td>
                    <Td className="tabular-nums">{fmtMGA(a.taxBase, locale)}</Td>
                    <Td className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtMGA(a.netTax, locale)}</Td>
                    <Td>{fmtDate(a.calculationDate)}</Td>
                    <Td>
                      <button
                        onClick={() => setDetailId(a.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      >
                        <Eye className="h-4 w-4" /> Détail
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={data.number}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              pageSize={size}
              onPageSizeChange={(n) => {
                setSize(n)
                setPage(0)
              }}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      {detailId != null && <AssessmentDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

/* ──────────────────────── Détail + liens croisés ──────────────────────── */

export function AssessmentDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { locale } = useI18n()
  const { data, isLoading } = useAssessmentDetail(id)

  return (
    <Modal open onClose={onClose} title="Détail de l'imposition" wide>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <AssessmentDetailBody a={data} locale={locale} />
      )}
    </Modal>
  )
}

function AssessmentDetailBody({ a, locale }: { a: Assessment; locale: 'fr' | 'mg' | 'en' }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">{a.reference}</span>
          <Badge tone="violet">{a.taxTypeCode}</Badge>
          <Badge tone="slate">{a.period}</Badge>
          <Badge tone="indigo">
            {a.ruleCode} v{a.ruleVersion}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contribuable</p>
            <Link to={`/taxpayers/${a.taxpayerId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              {a.taxpayerName}
            </Link>
            <p className="font-mono text-xs text-slate-400">{a.nif}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Déclaration d'origine</p>
            <Link to={`/declarations/${a.declarationId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              {a.declarationReference}
            </Link>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Calcul</p>
            <p className="text-slate-700 dark:text-slate-300">{fmtDate(a.calculationDate)}</p>
            <p className="text-xs text-slate-400">par {a.computedBy}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/debts?q=${encodeURIComponent(a.reference)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
          >
            <Receipt className="h-3.5 w-3.5" /> Créance correspondante
          </Link>
          <Link
            to={`/payments?q=${encodeURIComponent(a.nif)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
          >
            <Wallet className="h-3.5 w-3.5" /> Paiements du contribuable
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Amount label="Base imposable" value={fmtMGA(a.taxBase, locale)} />
        <Amount label="Impôt brut" value={fmtMGA(a.grossTax, locale)} />
        <Amount label="Déduction" value={fmtMGA(a.deduction, locale)} />
        <Amount label="Crédit" value={fmtMGA(a.credit, locale)} />
        <Amount label="Ajustement" value={fmtMGA(a.adjustment, locale)} />
        <Amount label="Impôt net" value={fmtMGA(a.netTax, locale)} emphasized />
      </div>

      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Détail du calcul ({a.lines.length} lignes)
        </h4>
        {a.lines.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Aucune ligne de calcul enregistrée.</p>
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
              <tr>
                <Th>#</Th>
                <Th>Libellé</Th>
                <Th>Base</Th>
                <Th>Taux</Th>
                <Th>Montant</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {a.lines.map((l) => (
                <tr key={l.id}>
                  <Td className="text-slate-400">{l.lineNumber}</Td>
                  <Td className="text-slate-700 dark:text-slate-300">{l.label}</Td>
                  <Td className="tabular-nums">{fmtMGA(l.baseAmount, locale)}</Td>
                  <Td className="tabular-nums">{fmtNumber(l.rate, locale, 2)} %</Td>
                  <Td className="font-medium tabular-nums">{fmtMGA(l.calculatedAmount, locale)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

function Amount({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${emphasized ? 'border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10' : 'border-slate-100 dark:border-slate-700/50'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 tabular-nums ${emphasized ? 'text-base font-semibold text-brand-800 dark:text-brand-200' : 'text-sm text-slate-700 dark:text-slate-300'}`}>
        {value}
      </p>
    </div>
  )
}
