import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, Eye, FileText, Receipt, Scale, Wallet } from 'lucide-react'
import { fmtDate, fmtMGA, fmtNumber } from '../lib/format'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { apiGet, apiGetBlob } from '../lib/api'
import type { Assessment, Page } from '../types'
import { ExportButton } from '../components/ExportButton'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
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
  useNotifyAssessment,
  useSimulate,
  useTaxTypesRef,
} from '../features/assessment/api/queries'
import { OfficeWizard } from '../features/assessment/components/OfficeWizard'
import { useTaxpayersRef } from '../features/taxpayer/api/queries'

const ORIGINS = ['', 'DECLARATIVE', 'RECTIFICATIVE', 'REDRESSEMENT', 'OFFICE']
const STATUSES = ['', 'EMISED', 'NOTIFIEE', 'ANNULEE']

export default function Assessments() {
  const { t, locale } = useI18n()
  const { can } = useAuth()
  const canWrite = can('ASSESSMENT_WRITE')
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

  /** Toutes les impositions correspondant aux filtres actifs (hors pagination). */
  const exportAssessmentRows = async () => {
    const p = new URLSearchParams(query)
    p.delete('page')
    p.delete('size')
    const rows = await apiGet<Page<Assessment>>(`/assessments?${p.toString()}&size=9999`)
    return rows.content.map((a) => [
      a.reference, a.taxpayerName, a.nif, a.taxTypeCode, a.period, a.origin, a.status,
      a.taxBase ?? 0, a.netTax ?? 0, `${a.ruleCode} v${a.ruleVersion}`,
    ])
  }

  return (
    <div className="fx-page space-y-6">
      <PageHeader
        title={t('assessments.page.title')}
        subtitle={t('assessments.page.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            {taxpayerId && (
              <Button variant="secondary" onClick={() => setParams({})}>
                {t('assessments.page.removeTaxpayerFilter')}{' '}</Button>
            )}
            <Button variant="secondary" onClick={() => setShowSimulate(true)}>
              <Calculator className="h-4 w-4" /> {t('assessments.page.simulate')}{' '}</Button>
            <ExportButton
              filenameBase="impositions"
              title={t('assessments.page.title')}
              headers={['Référence', 'Contribuable', 'NIF', 'Impôt', 'Période', 'Origine', 'Statut', 'Assiette', 'Net', 'Règle']}
              rows={exportAssessmentRows}
            />
            {canWrite && <Button onClick={() => setShowOffice(true)}>{t('assessments.page.officeAssessment')}</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('assessments.page.stat.total')} value={fmtNumber(stats?.total ?? data?.totalElements ?? 0, locale)} icon={<Scale className="h-5 w-5" />} tone="violet" />
        <StatCard label={t('assessments.page.stat.baseTotal')} value={fmtMGA(stats?.baseTotal ?? 0, locale)} icon={<Calculator className="h-5 w-5" />} tone="brand" />
        <StatCard label={t('assessments.page.stat.netTotal')} value={fmtMGA(stats?.netTotal ?? 0, locale)} icon={<Wallet className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label={t('assessments.page.stat.origins')}
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
            placeholder={t('assessments.page.searchPlaceholder')}
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
              <option value="">{t('assessments.page.allTaxes')}</option>
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
              placeholder={t('assessments.page.periodPlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === '' ? t('assessments.page.allStatuses') : s}</option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(0) }}>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>{o === '' ? t('assessments.page.allOrigins') : o}</option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title={t('assessments.page.empty.title')}
            subtitle={t('assessments.page.empty.subtitle')}
          />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                <tr>
                  <Th>{t('common.reference')}</Th>
                  <Th>{t('common.taxpayer')}</Th>
                  <Th>{t('assessments.page.table.tax')}</Th>
                  <Th>{t('common.period')}</Th>
                  <Th>{t('assessments.page.table.origin')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th>{t('assessments.page.table.taxBase')}</Th>
                  <Th>{t('assessments.page.table.netTax')}</Th>
                  <Th>{t('assessments.page.table.calculatedAt')}</Th>
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
                        <Eye className="h-4 w-4" /> {t('common.details')}{' '}</button>
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
      {showOffice && <OfficeWizard open onClose={() => setShowOffice(false)} />}
    </div>
  )
}

/* ──────────────────────── Détail + liens croisés ──────────────────────── */

export function AssessmentDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { t, locale } = useI18n()
  const { can } = useAuth()
  const canWrite = can('ASSESSMENT_WRITE')
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
    <Modal open onClose={onClose} title={t('assessments.page.modal.detailTitle')} wide>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <AssessmentDetailBody a={data} locale={locale} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadAvis(data.reference)}>
              <Receipt className="h-4 w-4" /> {t('assessments.page.modal.avisPdf')}{' '}</Button>
            <Link
              to={`/debts?taxpayerId=${data.taxpayerId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
            >
              <Receipt className="h-3.5 w-3.5" /> {t('assessments.page.modal.taxpayerDebts')}{' '}</Link>
            <Link
              to={`/payments?q=${encodeURIComponent(data.nif)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
            >
              <Wallet className="h-3.5 w-3.5" /> {t('assessments.page.modal.taxpayerPayments')}{' '}</Link>
            {data.status !== 'ANNULEE' && canWrite && (
              <>
                <Button variant="secondary" onClick={() => notifyMut.mutate(undefined, { onSuccess: refresh })}>
                  {t('assessments.page.notify')}{' '}</Button>
                <Button variant="secondary" onClick={() => setAdjustOpen((v) => !v)}>
                  {t('assessments.page.adjust')}{' '}</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const r = window.prompt(t('assessments.page.cancelReason')) ?? ''
                    cancelMut.mutate({ reason: r }, { onSuccess: refresh })
                  }}
                >
                  {t('common.cancel')}{' '}</Button>
              </>
            )}
          </div>
          {adjustOpen && (
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700/50">
              <label className="text-xs">{t('assessments.page.credit')}{' '}<input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="0" className="ml-2 w-32 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs">{t('assessments.page.adjustment')}{' '}<input value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" className="ml-2 w-32 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs">{t('assessments.page.observations')}{' '}<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('assessments.page.reasonPlaceholder')} className="ml-2 w-48 rounded-lg border px-2 py-1.5 text-sm" />
              </label>
              <Button
                onClick={() =>
                  adjustMut.mutate(
                    { credit: credit === '' ? null : Number(credit), adjustment: adjustment === '' ? null : Number(adjustment), observations: reason || null } as unknown as Record<string, unknown>,
                    { onSuccess: () => { setAdjustOpen(false); refresh() } },
                  )
                }
              >
                {t('common.apply')}{' '}</Button>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('assessments.page.history', { count: history?.length ?? 0 })}
            </h4>
            <div className="space-y-1.5">
              {(history ?? []).map((h) => (
                <div key={h.id} className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-slate-400">{fmtDate(h.createdAt)}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{h.action}</span>
                  <span>{h.commentaire}</span>
                  <span className="text-slate-400">{t('assessments.page.by')}{' '}{h.username}</span>
                </div>
              ))}
              {(history ?? []).length === 0 && <p className="text-xs text-slate-400">{t('assessments.page.noHistory')}</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function AssessmentDetailBody({ a, locale }: { a: Assessment; locale: 'fr' | 'mg' | 'en' }) {
  const { t } = useI18n()
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
          <p className="mt-2 text-xs text-slate-500">{t('assessments.page.parentOrigin')}{' '}<span className="font-mono">{a.parentReference}</span> {t('assessments.page.parentNote')}</p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('common.taxpayer')}</p>
            <Link to={`/taxpayers/${a.taxpayerId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              {a.taxpayerName}
            </Link>
            <p className="font-mono text-xs text-slate-400">{a.nif}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('assessments.page.originalDeclaration')}</p>
            {a.declarationId ? (
              <Link to={`/declarations/${a.declarationId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                {a.declarationReference}
              </Link>
            ) : (
              <p className="text-slate-500">{t('assessments.page.noDeclaration')}</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('assessments.page.calculation')}</p>
            <p className="text-slate-700 dark:text-slate-300">{fmtDate(a.calculationDate)}</p>
            <p className="text-xs text-slate-400">{t('assessments.page.by')}{' '}{a.computedBy}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Amount label={t('assessments.page.table.taxBase')} value={fmtMGA(a.taxBase, locale)} />
        <Amount label={t('assessments.page.gross')} value={fmtMGA(a.grossTax, locale)} />
        <Amount label={t('assessments.page.exemption')} value={fmtMGA(a.exemption, locale)} />
        <Amount label={t('assessments.page.deduction')} value={fmtMGA(a.deduction, locale)} />
        <Amount label={t('assessments.page.credit')} value={fmtMGA(a.credit, locale)} />
        <Amount label={t('assessments.page.adjustment')} value={fmtMGA(a.adjustment, locale)} />
        <Amount label={t('assessments.page.table.netTax')} value={fmtMGA(a.netTax, locale)} emphasized />
      </div>

      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('assessments.page.calculationDetail', { count: a.lines.length })}
        </h4>
        {a.lines.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('assessments.page.noLines')}</p>
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
              <tr>
                <Th>#</Th>
                <Th>{t('assessments.page.label')}</Th>
                <Th>{t('assessments.page.base')}</Th>
                <Th>{t('assessments.page.rate')}</Th>
                <Th>{t('common.amount')}</Th>
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
  const { t } = useI18n()
  const [taxpayerId, setTaxpayerId] = useState(0)
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [taxBase, setTaxBase] = useState('')
  const mut = useSimulate()
  const { data: taxpayers } = useTaxpayersRef()
  const { data: taxTypes } = useTaxTypesRef()
  const selectedTaxpayer = taxpayers?.content?.find((tp) => tp.id === taxpayerId)
  const canCalculate = !!taxpayerId && !!taxTypeCode && !!period && Number(taxBase) > 0
  return (
    <Modal open onClose={onClose} title={t('assessments.page.simulateTitle')}>
      <div className="grid grid-cols-2 gap-3">
        <Select value={String(taxpayerId)} onChange={(e) => setTaxpayerId(Number(e.target.value) || 0)}>
          <option value="0">{t('assessments.page.selectTaxpayer')}</option>
          {taxpayers?.content?.map((tp) => (
            <option key={tp.id} value={tp.id}>{tp.nif} — {tp.name}</option>
          ))}
        </Select>
        <Select value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)}>
          <option value="">{t('assessments.page.selectTax')}</option>
          {taxTypes?.map((tt) => (
            <option key={tt.id} value={tt.code}>{tt.code} — {tt.name}</option>
          ))}
        </Select>
        <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder={t('assessments.page.periodPlaceholderShort')} maxLength={10} />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={taxBase}
          onChange={(e) => setTaxBase(e.target.value)}
          placeholder={t('assessments.page.taxBasePlaceholder')}
        />
      </div>
      {selectedTaxpayer && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <p className="font-medium">{selectedTaxpayer.nif} — {selectedTaxpayer.name}</p>
          {selectedTaxpayer.taxCenterCode && <p className="text-slate-500">{t('assessments.page.taxCenter')}{' '}{selectedTaxpayer.taxCenterCode}</p>}
          {selectedTaxpayer.taxRegimeCode && <p className="text-slate-500">{t('assessments.page.regime')}{' '}{selectedTaxpayer.taxRegimeCode}</p>}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button onClick={() => mut.mutate({ taxpayerId, taxTypeCode, period, taxBase: Number(taxBase) })} disabled={!canCalculate}>
          {t('assessments.page.calculate')}{' '}</Button>
      </div>
      {mut.data && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <p>{t('assessments.page.rule')}{' '}<span className="font-mono">{mut.data.ruleCode} v{mut.data.ruleVersion}</span> {t('assessments.page.rateShort')}{' '}{mut.data.rate}%</p>
          <p>{t('assessments.page.grossShort')}{' '}{mut.data.grossTax} {t('assessments.page.exemptionShort')}{' '}{mut.data.exemption} {t('assessments.page.deductionShort')}{' '}{mut.data.deduction}</p>
          <p className="font-semibold">{t('assessments.page.netShort')}{' '}{mut.data.netTax} MGA</p>
        </div>
      )}
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
