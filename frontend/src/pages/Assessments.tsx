import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, Download, Eye, FileText, Receipt, Scale, Wallet } from 'lucide-react'
import { fmtDate, fmtMGA, fmtNumber } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { apiGetBlob } from '../lib/api'
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
import {
  useAdjustAssessment,
  useAssessmentDetail,
  useAssessmentHistory,
  useAssessmentStats,
  useAssessments,
  useCancelAssessment,
  useCreateOffice,
  useNotifyAssessment,
  useSimulate,
  useTaxTypesRef,
} from '../features/assessment/api/queries'

const ORIGINS = ['', 'DECLARATIVE', 'RECTIFICATIVE', 'REDRESSEMENT', 'OFFICE']
const STATUSES = ['', 'EMISED', 'NOTIFIEE', 'ANNULEE']

export default function Assessments() {
  const { locale } = useI18n()
  const [params, setParams] = useSearchParams()
  const taxpayerId = params.get('taxpayerId') ?? ''
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState('')
  const [origin, setOrigin] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [showSimulate, setShowSimulate] = useState(false)
  const [showOffice, setShowOffice] = useState(false)

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (q) p.set('q', q)
    if (taxTypeCode) p.set('taxTypeCode', taxTypeCode)
    if (period) p.set('period', period)
    if (status) p.set('status', status)
    if (origin) p.set('origin', origin)
    if (taxpayerId) p.set('taxpayerId', taxpayerId)
    return p.toString()
  }, [page, size, q, taxTypeCode, period, status, origin, taxpayerId])

  const { data, isLoading } = useAssessments(query)
  const { data: taxTypes } = useTaxTypesRef()
  const { data: stats } = useAssessmentStats()

  const exportCsv = () => {
    const rows = data?.content ?? []
    const header = 'reference;contribuable;nif;impot;periode;origine;statut;base;net;regle\n'
    const body = rows
      .map((a) =>
        [a.reference, `"${a.taxpayerName}"`, a.nif, a.taxTypeCode, a.period, a.origin, a.status, a.taxBase ?? 0, a.netTax ?? 0, `${a.ruleCode} v${a.ruleVersion}`].join(';'),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'impositions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fx-page space-y-6">
      <PageHeader
        title="Impositions"
        subtitle="Cycle de vie complet : déclarative, rectificative (delta), redressement, office"
        actions={
          <div className="flex flex-wrap gap-2">
            {taxpayerId && (
              <Button variant="secondary" onClick={() => setParams({})}>
                Retirer le filtre contribuable
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowSimulate(true)}>
              <Calculator className="h-4 w-4" /> Simuler
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => setShowOffice(true)}>Taxation d'office</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Impositions (total)" value={fmtNumber(stats?.total ?? data?.totalElements ?? 0, locale)} icon={<Scale className="h-5 w-5" />} tone="violet" />
        <StatCard label="Base imposable (total)" value={fmtMGA(stats?.baseTotal ?? 0, locale)} icon={<Calculator className="h-5 w-5" />} tone="brand" />
        <StatCard label="Impôt net (total)" value={fmtMGA(stats?.netTotal ?? 0, locale)} icon={<Wallet className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Origines"
          value={(stats?.byOrigin ?? []).map((o) => `${o.origin}:${o.count}`).join(' · ') || '—'}
          sub={(stats?.byStatus ?? []).map((s) => `${s.status}:${s.count}`).join(' · ')}
          icon={<FileText className="h-5 w-5" />}
          tone="sky"
        />
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
            <input
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                setPage(0)
              }}
              placeholder="Période (2026-01…)"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === '' ? 'Tous statuts' : s}</option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(0) }}>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>{o === '' ? 'Toutes origines' : o}</option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title="Aucune imposition"
            subtitle="Les impositions sont générées lors de la validation, par taxation d'office ou par redressement."
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
                  <Th>Origine</Th>
                  <Th>Statut</Th>
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
                    <Td><Badge tone={a.origin === 'DECLARATIVE' ? 'slate' : a.origin === 'RECTIFICATIVE' ? 'blue' : a.origin === 'REDRESSEMENT' ? 'amber' : 'indigo'}>{a.origin}</Badge></Td>
                    <Td><Badge tone={a.status === 'ANNULEE' ? 'rose' : a.status === 'NOTIFIEE' ? 'green' : 'slate'}>{a.status}</Badge></Td>
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
      {showSimulate && <SimulateModal onClose={() => setShowSimulate(false)} />}
      {showOffice && <OfficeModal onClose={() => setShowOffice(false)} />}
    </div>
  )
}

/* ──────────────────────── Détail + liens croisés ──────────────────────── */

export function AssessmentDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { locale } = useI18n()
  const qc = useQueryClient()
  const { data, isLoading } = useAssessmentDetail(id)
  const { data: history } = useAssessmentHistory(id)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [credit, setCredit] = useState('')
  const [adjustment, setAdjustment] = useState('')
  const [reason, setReason] = useState('')
  const adjustMut = useAdjustAssessment(id)
  const notifyMut = useNotifyAssessment(id)
  const cancelMut = useCancelAssessment(id)

  const downloadAvis = async (ref: string) => {
    const blob = await apiGetBlob(`/assessments/${id}/avis.pdf`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `avis-${ref}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ['assessments'] })

  return (
    <Modal open onClose={onClose} title="Détail de l'imposition" wide>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <AssessmentDetailBody a={data} locale={locale} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadAvis(data.reference)}>
              <Receipt className="h-4 w-4" /> Avis PDF
            </Button>
            <Link
              to={`/debts?taxpayerId=${data.taxpayerId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
            >
              <Receipt className="h-3.5 w-3.5" /> Créances du contribuable
            </Link>
            <Link
              to={`/payments?q=${encodeURIComponent(data.nif)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
            >
              <Wallet className="h-3.5 w-3.5" /> Paiements du contribuable
            </Link>
            {data.status !== 'ANNULEE' && (
              <>
                <Button variant="secondary" onClick={() => notifyMut.mutate(undefined, { onSuccess: refresh })}>
                  Notifier
                </Button>
                <Button variant="secondary" onClick={() => setAdjustOpen((v) => !v)}>
                  Ajuster
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const r = window.prompt('Motif d’annulation ?') ?? ''
                    cancelMut.mutate({ reason: r }, { onSuccess: refresh })
                  }}
                >
                  Annuler
                </Button>
              </>
            )}
          </div>
          {adjustOpen && (
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700/50">
              <label className="text-xs">Crédit
                <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="0" className="ml-2 w-32 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs">Ajustement
                <input value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" className="ml-2 w-32 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs">Observations
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif…" className="ml-2 w-48 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <Button
                onClick={() =>
                  adjustMut.mutate(
                    { credit: credit === '' ? null : Number(credit), adjustment: adjustment === '' ? null : Number(adjustment), observations: reason || null } as unknown as Record<string, unknown>,
                    { onSuccess: () => { setAdjustOpen(false); refresh() } },
                  )
                }
              >
                Appliquer
              </Button>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Historique ({history?.length ?? 0})
            </h4>
            <div className="space-y-1.5">
              {(history ?? []).map((h) => (
                <div key={h.id} className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-slate-400">{fmtDate(h.createdAt)}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{h.action}</span>
                  <span>{h.commentaire}</span>
                  <span className="text-slate-400">par {h.username}</span>
                </div>
              ))}
              {(history ?? []).length === 0 && <p className="text-xs text-slate-400">Aucun événement tracé.</p>}
            </div>
          </div>
        </div>
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
          <Badge tone="blue">{a.origin}</Badge>
          <Badge tone={a.status === 'ANNULEE' ? 'rose' : 'green'}>{a.status}</Badge>
        </div>
        {a.parentReference && (
          <p className="mt-2 text-xs text-slate-500">Imposition d'origine : <span className="font-mono">{a.parentReference}</span> (annule-et-remplace / redressement rattaché)</p>
        )}
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
            {a.declarationId ? (
              <Link to={`/declarations/${a.declarationId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                {a.declarationReference}
              </Link>
            ) : (
              <p className="text-slate-500">Sans déclaration (office / redressement)</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Calcul</p>
            <p className="text-slate-700 dark:text-slate-300">{fmtDate(a.calculationDate)}</p>
            <p className="text-xs text-slate-400">par {a.computedBy}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Amount label="Base imposable" value={fmtMGA(a.taxBase, locale)} />
        <Amount label="Impôt brut" value={fmtMGA(a.grossTax, locale)} />
        <Amount label="Exonération" value={fmtMGA(a.exemption, locale)} />
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
                  <Td className="tabular-nums">{l.rate == null ? '—' : `${fmtNumber(l.rate, locale, 2)} %`}</Td>
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

function SimulateModal({ onClose }: { onClose: () => void }) {
  const [taxpayerId, setTaxpayerId] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [taxBase, setTaxBase] = useState('')
  const mut = useSimulate()
  return (
    <Modal open onClose={onClose} title="Simuler un calcul">
      <div className="grid grid-cols-2 gap-2">
        <input value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} placeholder="ID contribuable" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)} placeholder="Code impôt (ex. IRSA)" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Période (2026-01)" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={taxBase} onChange={(e) => setTaxBase(e.target.value)} placeholder="Assiette" className="rounded-lg border px-2 py-1.5 text-sm" />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={() =>
            mut.mutate({ taxpayerId: Number(taxpayerId), taxTypeCode, period, taxBase: Number(taxBase) })
          }
        >
          Calculer
        </Button>
      </div>
      {mut.data && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <p>Règle : <span className="font-mono">{mut.data.ruleCode} v{mut.data.ruleVersion}</span> — taux {mut.data.rate}%</p>
          <p>Brut : {mut.data.grossTax} · Exonération : {mut.data.exemption} · Déduction : {mut.data.deduction}</p>
          <p className="font-semibold">Net : {mut.data.netTax} MGA</p>
        </div>
      )}
    </Modal>
  )
}

function OfficeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [taxpayerId, setTaxpayerId] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [taxBase, setTaxBase] = useState('')
  const [observations, setObservations] = useState('')
  const mut = useCreateOffice()
  return (
    <Modal open onClose={onClose} title="Taxation d'office">
      <div className="grid grid-cols-2 gap-2">
        <input value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} placeholder="ID contribuable *" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)} placeholder="Code impôt *" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Période *" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={taxBase} onChange={(e) => setTaxBase(e.target.value)} placeholder="Assiette *" className="rounded-lg border px-2 py-1.5 text-sm" />
        <input value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Motif / observations" className="col-span-2 rounded-lg border px-2 py-1.5 text-sm" />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={() =>
            mut.mutate(
              { taxpayerId: Number(taxpayerId), taxTypeCode, period, taxBase: Number(taxBase), observations: observations || null } as unknown as Record<string, unknown>,
              { onSuccess: () => { qc.invalidateQueries({ queryKey: ['assessments'] }); onClose() } },
            )
          }
        >
          Émettre l'imposition
        </Button>
      </div>
    </Modal>
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
