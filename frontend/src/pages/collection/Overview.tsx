import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Inbox,
  Plus,
  RefreshCw,
  Send,
  Wallet,
  X,
  Clock,
  History,
} from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { useLocaleFormatters } from '../../lib/format'
import { apiErrorMessage, apiGet, apiGetBlob, apiPost } from '../../lib/api'
import type { CollectionDebtRow, CollectionHistory, CollectionStats, DebtStatus, Page, TaxType } from '../../types'
import { Button, Card, EmptyState, Pagination, Select, Spinner, Table, Td, Th } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { CollectionSkeleton } from '../../components/collection/CollectionSkeleton'
import { KpiCard } from '../../components/collection/KpiCard'
import { StatusBadge } from '../../components/collection/StatusBadge'
import { PriorityBadge } from '../../components/collection/PriorityBadge'
import { PaymentProgress } from '../../components/collection/PaymentProgress'
import { RowActions } from '../../components/collection/RowActions'
import { DetailDrawer } from '../../components/collection/DetailDrawer'
import { CollectionFilters, EMPTY_ADV, type AdvancedFilters } from '../../components/collection/CollectionFilters'
import { TERMINAL_STATUSES, ACTION_KEYS, ACTION_ICONS, daysUntil } from '../../components/collection/constants'
import { useCreateReminder } from '../../features/collection/api/mutations'
import { ReminderModal, emptyReminderForm, type ReminderForm } from '../../features/collection/components/modals/ReminderModal'

// Vue d'ensemble — Étape fiscale 1 : synthèse de toutes créances exigibles (DUE/PARTIALLY_PAID) avec KPIs globaux
export default function CollectionOverview() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [searchQ, setSearchQ] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [advDraft, setAdvDraft] = useState<AdvancedFilters>(EMPTY_ADV)
  const [advApplied, setAdvApplied] = useState<AdvancedFilters>(EMPTY_ADV)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [drawerDebtId, setDrawerDebtId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<CollectionDebtRow | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeDebtId, setNoticeDebtId] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [actionType, setActionType] = useState<'call' | 'reminder' | 'commandment' | 'atd' | 'payment_plan' | 'suspension'>('call')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDebtId, setHistoryDebtId] = useState<number | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderDebt, setReminderDebt] = useState<CollectionDebtRow | null>(null)
  const [reminderForm, setReminderForm] = useState<ReminderForm>(emptyReminderForm())

  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { fmtMGA, fmtDate } = useLocaleFormatters()

  const buildParams = () => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    if (advApplied.status) p.set('status', advApplied.status)
    if (advApplied.priority) p.set('priority', advApplied.priority)
    if (advApplied.balanceMin) p.set('balanceMin', advApplied.balanceMin)
    if (advApplied.balanceMax) p.set('balanceMax', advApplied.balanceMax)
    if (advApplied.dueFrom) p.set('dueFrom', advApplied.dueFrom)
    if (advApplied.dueTo) p.set('dueTo', advApplied.dueTo)
    return p.toString()
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['collection-debts', page, size, searchQ, taxTypeFilter, periodFilter, advApplied],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${buildParams()}`),
  })

  const { data: taxTypes } = useQuery({ queryKey: ['tax-types-ref'], queryFn: () => apiGet<TaxType[]>('/tax-types') })
  const { data: periods } = useQuery({ queryKey: ['collection-periods'], queryFn: () => apiGet<string[]>('/collection/periods') })
  const { data: stats } = useQuery({ queryKey: ['collection-stats'], queryFn: () => apiGet<CollectionStats>('/collection/stats') })
  const { data: history } = useQuery({
    queryKey: ['collection-history', historyDebtId],
    queryFn: () => apiGet<CollectionHistory>(`/collection/history/${historyDebtId}`),
    enabled: historyOpen && historyDebtId !== null,
  })
  const { data: actionDebts } = useQuery({
    queryKey: ['collection-action-debts'],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?size=9999`),
    enabled: actionOpen || noticeOpen,
  })

  const [actionForm, setActionForm] = useState({
    debtId: '', type: 'PHONE_CONTACT', description: '', actionDate: new Date().toISOString().slice(0, 10),
    outcome: '', nextAction: '', nextActionDate: '',
  })

  const createAction = useMutation({
    mutationFn: () => apiPost('/collection/actions', {
      debtId: Number(actionForm.debtId), type: actionForm.type, description: actionForm.description,
      actionDate: actionForm.actionDate, outcome: actionForm.outcome || undefined,
      nextAction: actionForm.nextAction || undefined, nextActionDate: actionForm.nextActionDate || undefined,
    }),
    onSuccess: () => { invalidateQueries(); setActionOpen(false); resetActionForm(); toast.success(t('collection.actionSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const createNotice = useMutation({
    mutationFn: () => apiPost('/collection/notices', {
      debtId: Number(noticeDebtId), noticeType: 'MISE_EN_DEMEURE', content: noticeContent || undefined,
    }),
    onSuccess: () => { invalidateQueries(); setNoticeOpen(false); setNoticeDebtId(''); setNoticeContent(''); toast.success(t('collection.noticeIssued')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const createReminder = useCreateReminder()

  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })

  const registerPayment = useMutation({
    mutationFn: () => apiPost('/collection/payment', {
      debtId: selectedDebt!.id, amount: Number(payForm.amount), paymentDate: payForm.paymentDate, method: payForm.method,
    }),
    onSuccess: () => {
      invalidateQueries(); setPaymentOpen(false); setSelectedDebt(null)
      setPayForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })
      toast.success(t('collection.paymentSaved'))
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  function invalidateQueries() {
    queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
    queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
    queryClient.invalidateQueries({ queryKey: ['collection-history'] })
    queryClient.invalidateQueries({ queryKey: ['collection-action-debts'] })
    queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
  }

  function resetActionForm() {
    setActionForm({ debtId: '', type: 'PHONE_CONTACT', description: '', actionDate: new Date().toISOString().slice(0, 10), outcome: '', nextAction: '', nextActionDate: '' })
  }

  function openReminder(debtId?: string, debt?: CollectionDebtRow | null) { setReminderDebt(debt ?? null); setReminderForm(emptyReminderForm(debtId ?? '')); setReminderOpen(true) }
  function submitReminder() {
    createReminder.mutate({
      debtId: Number(reminderForm.debtId),
      description: reminderForm.description.trim(),
      actionDate: reminderForm.actionDate,
      outcome: reminderForm.outcome || undefined,
      nextAction: reminderForm.nextAction || undefined,
      nextActionDate: reminderForm.nextActionDate || undefined,
    }, { onSuccess: () => { setReminderOpen(false); setReminderDebt(null); setReminderForm(emptyReminderForm()) } })
  }

  function openActionWithType(type: 'call' | 'reminder' | 'commandment' | 'atd' | 'payment_plan' | 'suspension', debtId?: string) {
    if (type === 'reminder') { openReminder(debtId); return }
    setActionType(type)
    const typeMap: Record<string, string> = { call: 'PHONE_CONTACT', reminder: 'REMINDER', commandment: 'COMMANDMENT', atd: 'ATD', payment_plan: 'PAYMENT_PLAN', suspension: 'SUSPENSION_REQUEST' }
    setActionForm((f) => ({ ...f, type: typeMap[type], debtId: debtId ?? f.debtId, description: '' }))
    setActionOpen(true)
  }

  function openNotice(debtId?: string) { setNoticeDebtId(debtId ?? ''); setNoticeContent(''); setNoticeOpen(true) }

  const totalResults = data?.totalElements ?? 0
  const hasFilters = !!(searchQ || taxTypeFilter || periodFilter || Object.values(advApplied).some(Boolean))
  const activeFilterCount = [searchQ, taxTypeFilter, periodFilter, advApplied.status, advApplied.priority, advApplied.balanceMin, advApplied.balanceMax, advApplied.dueFrom, advApplied.dueTo].filter(Boolean).length

  function resetFilters() {
    setSearchQ(''); setTaxTypeFilter(''); setPeriodFilter(''); setAdvApplied(EMPTY_ADV); setAdvDraft(EMPTY_ADV); setPage(0)
  }
  function applyAdvanced() { setAdvApplied(advDraft); setPage(0) }
  function removeChip(kind: keyof AdvancedFilters | 'q' | 'taxType' | 'period' | 'tab') {
    if (kind === 'q') setSearchQ('')
    else if (kind === 'taxType') setTaxTypeFilter('')
    else if (kind === 'period') setPeriodFilter('')
    else if (kind !== 'tab') setAdvApplied((a) => ({ ...a, [kind]: '' }))
    setPage(0)
  }

      function exportCsv() {
    const p = new URLSearchParams(buildParams()); p.delete('page'); p.delete('size')
    apiGet<Page<CollectionDebtRow>>(`/collection/debts?${p.toString()}&size=9999`).then((rows) => {
      const csv = [
        t('collection.csv.headers'),
        ...rows.content.map((d) => [`"${d.reference}"`, d.nif, `"${d.taxpayerName}"`, d.taxTypeCode, d.period, d.totalAmount, d.paidAmount, d.balance, d.dueDate, d.daysOverdue, `"${d.debtStatus}"`, d.collectionPriority].join(',')),
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `recouvrement_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
      toast.success(t('collection.exportDone'))
    }).catch((err) => toast.error(apiErrorMessage(err)))
  }

  async function exportEtatPdf() {
    try {
      const p = new URLSearchParams()
      if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter); if (periodFilter) p.set('period', periodFilter); if (searchQ) p.set('q', searchQ)
      const blob = await apiGetBlob(`/collection/documents/etat-restes?${p.toString()}`)
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `etat-restes-a-recouvrer_${new Date().toISOString().slice(0, 10)}.pdf`; a.click(); URL.revokeObjectURL(url)
      toast.success(t('collection.pdfGenerated'))
    } catch (err) { toast.error(apiErrorMessage(err)) }
  }

  if (isLoading && !data) return <CollectionSkeleton />

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-violet-500/[0.03] blur-[100px]" />
        <div className="absolute -right-20 top-2/3 h-80 w-80 rounded-full bg-indigo-500/[0.03] blur-[100px]" />
      </div>

      {/* 1. EN-TÊTE */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">{t('collection.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('collection.subtitle')}</p>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection'] })}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>
          <Link to="/collection/history"><Button variant="ghost" size="sm"><History className="h-4 w-4" />{t('collection.history')}</Button></Link>
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download className="h-4 w-4" />{t('collection.export')}</Button>
          <Button variant="secondary" size="sm" onClick={exportEtatPdf}><FileText className="h-4 w-4" />{t('collection.report')}</Button>
          <Link to="/reports"><Button variant="secondary" size="sm"><FileSpreadsheet className="h-4 w-4" />{t('collection.report')}</Button></Link>
          <button onClick={() => openActionWithType('call')} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:bg-brand-500 hover:shadow-xl hover:shadow-violet-500/30">
            <Plus className="h-4 w-4" /> {t('collection.newAction')}
          </button>
        </div>
      </div>

      {/* 2. KPI */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={t('collection.kpi.rate')} value={`${stats.collectionRate.toFixed(1)} %`} icon={<Clock className="h-5 w-5 text-violet-500" />} wrap="bg-violet-500/10" bar="bg-violet-500" sub={t('collection.kpi.rateSub')} />
          <KpiCard label={t('collection.kpi.collected')} value={fmtMGA(stats.totalCollected)} icon={<Wallet className="h-5 w-5 text-emerald-500" />} wrap="bg-emerald-500/10" bar="bg-emerald-500" sub={t('collection.kpi.exigible', { amount: fmtMGA(stats.totalExigible) })} />
          <KpiCard label={t('collection.kpi.outstanding')} value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-orange-500" />} wrap="bg-orange-500/10" bar="bg-orange-500" />
          <KpiCard label={t('collection.kpi.overdueFiles')} value={stats.overdueDebts} icon={<AlertTriangle className="h-5 w-5 text-rose-500" />} wrap="bg-rose-500/10" bar="bg-rose-500" sub={stats.overdueBalance > 0 ? t('collection.kpi.overdueBalance', { amount: fmtMGA(stats.overdueBalance) }) : t('collection.kpi.noOverdueBalance')} />
          <KpiCard label={t('collection.kpi.overdueAging')} value={`${stats.overdue30} · ${stats.overdue60} · ${stats.overdue90}`} icon={<Clock className="h-5 w-5 text-amber-500" />} wrap="bg-amber-500/10" bar="bg-amber-500" sub={t('collection.kpi.aging')} />
          <KpiCard label={t('collection.kpi.reminders')} value={stats.reminderActions} icon={<Send className="h-5 w-5 text-violet-500" />} wrap="bg-violet-500/10" bar="bg-violet-500" />
          <KpiCard label={t('collection.kpi.notices')} value={stats.noticeCount} icon={<FileText className="h-5 w-5 text-orange-500" />} wrap="bg-orange-500/10" bar="bg-orange-500" />
          <KpiCard label={t('collection.kpi.disputes')} value={stats.disputedDebts} icon={<AlertCircle className="h-5 w-5 text-red-500" />} wrap="bg-red-500/10" bar="bg-red-500" sub={t('collection.kpi.suspendedPartial', { s: stats.suspendedDebts, p: stats.partialDebts })} />
        </div>
      )}

      {/* 3. FILTRES + TABLEAU */}
      <Card>
        <CollectionFilters
          searchQ={searchQ} onSearchChange={(v) => { setSearchQ(v); setPage(0) }}
          taxTypeFilter={taxTypeFilter} onTaxTypeChange={(v) => { setTaxTypeFilter(v); setPage(0) }}
          periodFilter={periodFilter} onPeriodChange={(v) => { setPeriodFilter(v); setPage(0) }}
          taxTypes={taxTypes} periods={periods}
          advDraft={advDraft} onAdvDraftChange={setAdvDraft} advApplied={advApplied}
          onApplyAdvanced={applyAdvanced} onResetFilters={resetFilters}
          showAdvanced={showAdvanced} onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          activeFilterCount={activeFilterCount} hasFilters={hasFilters}
          onRemoveChip={removeChip}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {!isLoading && data ? (<span className="font-medium text-slate-700 dark:text-slate-300">{t('collection.count.found', { count: totalResults, plural: totalResults > 1 ? 's' : '' })}</span>) : t('collection.loading')}
          </p>
        </div>

        {isError ? (
          <div className="px-5 py-10">
            <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 font-medium text-red-700 dark:text-red-400">{t('collection.loadError')}</p>
              <p className="mt-1 text-xs text-red-500/80">{apiErrorMessage(error)}</p>
              <Button className="mt-4" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-3.5 w-3.5" /> {t('collection.retry')}</Button>
            </div>
          </div>
        ) : !data || data.content.length === 0 ? (
          <div className="py-14">
            <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("collection.noResult")} subtitle={t("common.noResult")} />
            {hasFilters && <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm" onClick={resetFilters}><X className="h-4 w-4" /> {t('collection.resetFilters')}</Button></div>}
          </div>
        ) : (
          <div key={`${taxTypeFilter}|${periodFilter}|${JSON.stringify(advApplied)}|${page}`} className="animate-page-in">
            {isLoading ? <Spinner /> : (
              <>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <Table>
                    <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                      <tr>
                        <Th>{t('common.reference')}</Th><Th>NIF</Th><Th>{t('collection.table.taxpayer')}</Th><Th>{t('collection.table.tax')}</Th><Th>{t('collection.table.period')}</Th><Th>{t('collection.table.amountDue')}</Th><Th>{t('collection.table.paid')}</Th><Th>{t('collection.table.remaining')}</Th><Th>{t('collection.table.dueDate')}</Th><Th>{t('collection.table.status')}</Th><Th>{t('collection.table.priority')}</Th><Th>{t('collection.table.lastAction')}</Th><Th>{t('collection.table.agent')}</Th><Th className="w-12"></Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                      {data.content.map((d) => {
                        const isTerminal = TERMINAL_STATUSES.includes(d.debtStatus as DebtStatus)
                        const isOverdue = d.daysOverdue > 0 && !isTerminal
                        const daysLeft = daysUntil(d.dueDate)
                        const nearDue = !isTerminal && !isOverdue && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
                        return (
                          <tr key={d.id} className="group cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/40" onClick={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }}>
                            <Td><span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{d.reference}</span></Td>
                            <Td><span className="font-mono text-xs">{d.nif}</span></Td>
                            <Td><span className="block max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200">{d.taxpayerName}</span></Td>
                            <Td><span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{d.taxTypeCode}</span></Td>
                            <Td><span className="text-sm text-slate-600 dark:text-slate-400">{d.period}</span></Td>
                            <Td><span className="font-medium text-slate-800 dark:text-slate-200">{fmtMGA(d.totalAmount)}</span></Td>
                            <Td><span className="text-emerald-600 dark:text-emerald-400">{fmtMGA(d.paidAmount)}</span></Td>
                            <Td>
                              <span className={`font-semibold ${isOverdue ? 'text-red-500 dark:text-red-400' : d.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMGA(d.balance)}</span>
                              <div className="mt-1"><PaymentProgress paid={d.paidAmount} total={d.totalAmount} /></div>
                            </Td>
                            <Td>
                              <div>
                                <span className={`text-sm ${isOverdue ? 'font-semibold text-red-500 dark:text-red-400' : nearDue ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>{fmtDate(d.dueDate)}</span>
                                {!isTerminal && <p className="text-[10px] text-slate-400 dark:text-slate-500">{isOverdue ? t('collection.table.daysLate', { count: d.daysOverdue }) : daysLeft === 0 ? t('collection.table.today') : daysLeft !== null ? t('collection.table.inDays', { count: daysLeft }) : ''}</p>}
                              </div>
                            </Td>
                            <Td><StatusBadge status={d.debtStatus} /></Td>
                            <Td><PriorityBadge priority={d.collectionPriority} /></Td>
                            <Td>
                              <div className="max-w-[170px]">
                                {d.lastAction ? (<><p className="truncate text-xs text-slate-600 dark:text-slate-400" title={d.lastAction}>{ACTION_ICONS[d.lastActionType ?? ''] ?? ''} {t(ACTION_KEYS[d.lastActionType ?? ''] ?? 'common.unknown') ?? d.lastAction}</p>{d.lastActionDate && <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('collection.table.on')} {fmtDate(d.lastActionDate)}{d.nextActionDate && ` · ${t('collection.table.next', { date: fmtDate(d.nextActionDate) })}`}</p>}</>) : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                              </div>
                            </Td>
                            <Td><span className="text-xs text-slate-500 dark:text-slate-400">{d.lastResponsible ?? '—'}</span></Td>
                            <Td>
                              <RowActions debt={d} onView={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }} onPayment={() => { setSelectedDebt(d); setPaymentOpen(true) }} onCall={() => openActionWithType('call', String(d.id))} onReminder={() => openActionWithType('reminder', String(d.id))} onNotice={() => openNotice(String(d.id))} onCommandment={() => openActionWithType('commandment', String(d.id))} onAtd={() => openActionWithType('atd', String(d.id))} onPaymentPlan={() => navigate(`/collection/plans?debt=${d.id}`)} onHistory={() => { setHistoryDebtId(d.id); setHistoryOpen(true) }} />
                            </Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
                <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements} pageSize={size} onPageSizeChange={(n) => { setSize(n); setPage(0) }} onChange={setPage} />
              </>
            )}
          </div>
        )}
      </Card>

      {/* MODAL : NOUVELLE ACTION */}
      {actionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActionOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {actionType === 'call' ? t('collection.modal.action.titleCall') : actionType === 'reminder' ? t('collection.modal.action.titleReminder') : actionType === 'commandment' ? t('collection.modal.action.titleCommandment') : actionType === 'atd' ? t('collection.modal.action.titleAtd') : actionType === 'payment_plan' ? t('collection.modal.action.titlePlan') : actionType === 'suspension' ? t('collection.modal.action.titleSuspension') : t('collection.modal.action.titleDefault')}
            </h3>
            {createAction.isError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{t('collection.modal.action.saveError')}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.debt')}</label>
                  <Select value={actionForm.debtId} onChange={(e) => setActionForm({ ...actionForm, debtId: e.target.value })}>
                    <option value="">{t('collection.modal.action.selectDebt')}</option>
                    {(actionDebts?.content ?? data?.content ?? []).filter((d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus)).map((d) => (
                      <option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} — {d.taxTypeCode} {d.period} — {t('collection.modal.action.remaining', { amount: fmtMGA(d.balance) })}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.type')}</label>
                  <Select value={actionForm.type} onChange={(e) => setActionForm({ ...actionForm, type: e.target.value })}>
                    {Object.entries(ACTION_KEYS).map(([k, key]) => [k, t(key)]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.description')}</label>
                <input value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} placeholder={t('collection.filters.search')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.actionDate')}</label>
                  <input type="date" value={actionForm.actionDate} onChange={(e) => setActionForm({ ...actionForm, actionDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.outcomeOpt')}</label>
                  <input value={actionForm.outcome} onChange={(e) => setActionForm({ ...actionForm, outcome: e.target.value })} placeholder={t('common.description')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.nextOpt')}</label>
                  <input value={actionForm.nextAction} onChange={(e) => setActionForm({ ...actionForm, nextAction: e.target.value })} placeholder={t('common.description')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.nextDate')}</label>
                  <input type="date" value={actionForm.nextActionDate} onChange={(e) => setActionForm({ ...actionForm, nextActionDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setActionOpen(false)}>{t('collection.modal.action.cancel')}</Button>
                <Button onClick={() => createAction.mutate()} disabled={createAction.isPending || !actionForm.debtId || !actionForm.description}>{createAction.isPending ? t('collection.modal.action.saving') : t('collection.modal.action.save')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : MISE EN DEMEURE */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setNoticeOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('collection.modal.notice.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('collection.modal.notice.subtitle')}</p>
            {createNotice.isError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{apiErrorMessage(createNotice.error)}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.notice.debt')}</label>
                <Select value={noticeDebtId} onChange={(e) => setNoticeDebtId(e.target.value)}>
                  <option value="">{t('collection.modal.notice.selectDebt')}</option>
                  {(actionDebts?.content ?? data?.content ?? []).filter((d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus)).map((d) => (
                    <option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} — {d.taxTypeCode} {d.period} — {t('collection.modal.action.remaining', { amount: fmtMGA(d.balance) })}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.notice.contentOpt')}</label>
                <textarea rows={4} value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} placeholder={t('common.description')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setNoticeOpen(false)}>{t('collection.modal.notice.cancel')}</Button>
                <Button onClick={() => createNotice.mutate()} disabled={createNotice.isPending || !noticeDebtId}>{createNotice.isPending ? t('collection.modal.notice.issuing') : t('collection.modal.notice.issue')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : PAIEMENT */}
      {paymentOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPaymentOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('collection.modal.payment.title')}</h3>
            {registerPayment.isError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{t('collection.modal.payment.saveError')}</div>}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 mb-4">{t('collection.modal.payment.debtBalance', { ref: selectedDebt.reference, amount: fmtMGA(selectedDebt.balance) })}</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.amount')}</label>
                <input type="number" min="1" max={selectedDebt.balance} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.date')}</label>
                  <input type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.mode')}</label>
                  <Select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                    <option value="CASH">{t('payments.method.CASH')}</option><option value="BANK_TRANSFER">{t('payments.method.BANK_TRANSFER')}</option><option value="CHECK">{t('payments.method.CHECK')}</option><option value="MOBILE_MONEY">{t('payments.method.MOBILE_MONEY')}</option><option value="CARD">{t('payments.method.CARD')}</option>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setPaymentOpen(false)}>{t('collection.modal.payment.cancel')}</Button>
                <Button onClick={() => registerPayment.mutate()} disabled={registerPayment.isPending || !payForm.amount}>{registerPayment.isPending ? t('collection.modal.payment.saving') : t('collection.modal.payment.save')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : HISTORIQUE D'UNE CRÉANCE */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('collection.modal.history.title')}</h3>
            {history ? (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('collection.modal.history.actions', { count: history.actions.length })}</p>
                  {history.actions.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('collection.modal.history.noActions')}</p> : (
                    <ul className="space-y-2">
                      {history.actions.map((a) => (
                        <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <UserAvatar name={a.responsibleName ?? ''} className="shrink-0" />
                              <span className="font-medium">{ACTION_ICONS[a.type]} {t(ACTION_KEYS[a.type] ?? 'common.unknown')}</span>
                              {a.responsibleName && <span className="truncate text-xs text-slate-400 dark:text-slate-500">— {a.responsibleName}</span>}
                            </span>
                            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{fmtDate(a.actionDate)}</span>
                          </div>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400">{a.description}</p>
                          {a.outcome && <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('collection.modal.history.result', { result: a.outcome })}</p>}
                          {a.nextAction && <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400">{t('collection.modal.history.nextAction', { action: `${a.nextAction}${a.nextActionDate ? ` — ${fmtDate(a.nextActionDate)}` : ''}` })}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('collection.modal.history.notices', { count: history.notices.length })}</p>
                  {history.notices.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('collection.modal.history.noNotices')}</p> : (
                    <ul className="space-y-2">
                      {history.notices.map((n) => (
                        <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700/50">
                          <div className="flex items-center justify-between"><span className="font-mono font-medium">{n.noticeNumber}</span><span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(n.noticeDate)}</span></div>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400">{n.content || n.noticeType}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : <Spinner />}
          </div>
        </div>
      )}

      {/* MODAL : RELANCE AMIABLE */}
      <ReminderModal open={reminderOpen} onClose={() => { setReminderOpen(false); setReminderDebt(null) }} form={reminderForm} setForm={setReminderForm} debts={actionDebts?.content ?? data?.content ?? []} debt={reminderDebt} onSubmit={submitReminder} pending={createReminder.isPending} error={createReminder.isError ? createReminder.error : null} fmtMGA={fmtMGA} />

      {/* DETAIL DRAWER */}
      <DetailDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setDrawerDebtId(null) }} debtId={drawerDebtId} onPayment={(debt) => { setSelectedDebt(debt); setPaymentOpen(true) }} onReminder={(debt) => openActionWithType('reminder', String(debt.id))} onNotice={(debt) => openNotice(String(debt.id))} onPlan={(debt) => navigate(`/collection/plans?debt=${debt.id}`)} onAction={(debt, type) => openActionWithType(type, String(debt.id))} />
    </div>
  )
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  return <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300 ${className ?? ''}`}>{name ? name.charAt(0).toUpperCase() : '?'}</div>
}
