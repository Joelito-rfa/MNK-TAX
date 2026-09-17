import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Inbox, Mail, Plus, RefreshCw, Send, X } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { useLocaleFormatters } from '../../lib/format'
import { apiErrorMessage, apiGet, apiPost } from '../../lib/api'
import type { CollectionDebtRow, CollectionStats, Page, TaxType } from '../../types'
import { Button, Card, EmptyState, Pagination, Select, Spinner, Table, Td, Th } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { CollectionSkeleton } from '../../components/collection/CollectionSkeleton'
import { KpiCard } from '../../components/collection/KpiCard'
import { StatusBadge } from '../../components/collection/StatusBadge'
import { PriorityBadge } from '../../components/collection/PriorityBadge'
import { RowActions } from '../../components/collection/RowActions'
import { DetailDrawer } from '../../components/collection/DetailDrawer'
import { CollectionFilters, EMPTY_ADV, type AdvancedFilters } from '../../components/collection/CollectionFilters'
import { TERMINAL_STATUSES, ACTION_KEYS, ACTION_ICONS } from '../../components/collection/constants'
import { useCreateReminder } from '../../features/collection/api/mutations'
import { ReminderModal, emptyReminderForm, type ReminderForm } from '../../features/collection/components/modals/ReminderModal'

export default function CollectionReminders() {
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
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderDebt, setReminderDebt] = useState<CollectionDebtRow | null>(null)
  const [reminderForm, setReminderForm] = useState<ReminderForm>(emptyReminderForm())

  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { fmtMGA, fmtDate } = useLocaleFormatters()

  const buildParams = () => {
    const p = new URLSearchParams({ page: String(page), size: String(size), hasReminder: 'true' })
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    if (advApplied.priority) p.set('priority', advApplied.priority)
    return p.toString()
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['collection-debts', 'reminders', page, size, searchQ, taxTypeFilter, periodFilter, advApplied],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${buildParams()}`),
  })
  const { data: taxTypes } = useQuery({ queryKey: ['tax-types-ref'], queryFn: () => apiGet<TaxType[]>('/tax-types') })
  const { data: periods } = useQuery({ queryKey: ['collection-periods'], queryFn: () => apiGet<string[]>('/collection/periods') })
  const { data: stats } = useQuery({ queryKey: ['collection-stats'], queryFn: () => apiGet<CollectionStats>('/collection/stats') })
  const { data: actionDebts } = useQuery({
    queryKey: ['collection-action-debts'],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?size=9999`),
    enabled: actionOpen || reminderOpen,
  })

  const [actionForm, setActionForm] = useState({ debtId: '', type: 'PHONE_CONTACT', description: '', actionDate: new Date().toISOString().slice(0, 10), outcome: '', nextAction: '', nextActionDate: '' })
  const createAction = useMutation({
    mutationFn: () => apiPost('/collection/actions', { debtId: Number(actionForm.debtId), type: actionForm.type, description: actionForm.description, actionDate: actionForm.actionDate, outcome: actionForm.outcome || undefined, nextAction: actionForm.nextAction || undefined, nextActionDate: actionForm.nextActionDate || undefined }),
    onSuccess: () => { invalidateQueries(); setActionOpen(false); resetActionForm(); toast.success(t('collection.actionSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const createReminder = useCreateReminder()
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })
  const registerPayment = useMutation({
    mutationFn: () => apiPost('/collection/payment', { debtId: selectedDebt!.id, amount: Number(payForm.amount), paymentDate: payForm.paymentDate, method: payForm.method }),
    onSuccess: () => { invalidateQueries(); setPaymentOpen(false); setSelectedDebt(null); setPayForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' }); toast.success(t('collection.paymentSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  function invalidateQueries() { queryClient.invalidateQueries({ queryKey: ['collection-debts'] }); queryClient.invalidateQueries({ queryKey: ['collection-stats'] }); queryClient.invalidateQueries({ queryKey: ['debt-stats'] }) }
  function resetActionForm() { setActionForm({ debtId: '', type: 'PHONE_CONTACT', description: '', actionDate: new Date().toISOString().slice(0, 10), outcome: '', nextAction: '', nextActionDate: '' }) }
  function openAction(type: string, debtId?: string) { setActionForm((f) => ({ ...f, type, debtId: debtId ?? f.debtId, description: '' })); setActionOpen(true) }
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

  const totalResults = data?.totalElements ?? 0
  const hasFilters = !!(searchQ || taxTypeFilter || periodFilter || Object.values(advApplied).some(Boolean))
  const activeFilterCount = [searchQ, taxTypeFilter, periodFilter, advApplied.priority].filter(Boolean).length
  function resetFilters() { setSearchQ(''); setTaxTypeFilter(''); setPeriodFilter(''); setAdvApplied(EMPTY_ADV); setAdvDraft(EMPTY_ADV); setPage(0) }
  function applyAdvanced() { setAdvApplied(advDraft); setPage(0) }
  function removeChip(kind: keyof AdvancedFilters | 'q' | 'taxType' | 'period' | 'tab') { if (kind === 'q') setSearchQ(''); else if (kind === 'taxType') setTaxTypeFilter(''); else if (kind === 'period') setPeriodFilter(''); else if (kind !== 'tab') setAdvApplied((a) => ({ ...a, [kind]: '' })); setPage(0) }

  if (isLoading && !data) return <CollectionSkeleton />

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">{t('collection.reminders')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('collection.subtitle')}</p>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>
          <button onClick={() => openReminder()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-brand-500 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> {t('collection.modal.reminder.new')}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={t('collection.kpi.reminders')} value={stats.reminderActions} icon={<Send className="h-5 w-5 text-violet-500" />} wrap="bg-violet-500/10" bar="bg-violet-500" />
          <KpiCard label={t('collection.kpi.notices')} value={stats.noticeCount} icon={<Mail className="h-5 w-5 text-orange-500" />} wrap="bg-orange-500/10" bar="bg-orange-500" />
          <KpiCard label={t('collection.kpi.totalActions')} value={stats.actionCount} icon={<Send className="h-5 w-5 text-blue-500" />} wrap="bg-blue-500/10" bar="bg-blue-500" />
          <KpiCard label={t('collection.kpi.outstanding')} value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-amber-500" />} wrap="bg-amber-500/10" bar="bg-amber-500" />
        </div>
      )}

      {/* Alerte fiscale : prochaines relances dépassées */}
      {stats && stats.remindersOverdue > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/60 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {t('collection.reminder.overdueAlert', { count: stats.remindersOverdue, plural: stats.remindersOverdue > 1 ? 's' : '' })}
          </p>
        </div>
      )}

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

        <div className="flex items-center justify-between gap-3 px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {!isLoading && data ? (<span className="font-medium text-slate-700 dark:text-slate-300">{t('collection.count.withReminders', { count: totalResults, plural: totalResults > 1 ? 's' : '' })}</span>) : t('collection.loading')}
          </p>
        </div>

        {isError ? (
          <div className="px-5 py-10">
            <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 font-medium text-red-700 dark:text-red-400">{t('collection.loadErrorShort')}</p>
              <p className="mt-1 text-xs text-red-500/80">{apiErrorMessage(error)}</p>
              <Button className="mt-4" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-3.5 w-3.5" /> {t('collection.retry')}</Button>
            </div>
          </div>
        ) : !data || data.content.length === 0 ? (
          <div className="py-14">
            <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("collection.noResult")} subtitle={t("common.noResult")} />
            {hasFilters && <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm" onClick={resetFilters}><X className="h-4 w-4" /> {t('collection.reset')}</Button></div>}
          </div>
        ) : (
          <div className="animate-page-in">
            {isLoading ? <Spinner /> : (
              <>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <Table>
                    <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                      <tr><Th>{t('common.reference')}</Th><Th>NIF</Th><Th>{t('collection.table.taxpayer')}</Th><Th>{t('collection.table.tax')}</Th><Th>{t('collection.table.remaining')}</Th><Th>{t('collection.table.status')}</Th><Th>{t('collection.table.priority')}</Th><Th>{t('collection.table.lastAction')}</Th><Th>{t('collection.table.reminderTracking')}</Th><Th className="w-12"></Th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                      {data.content.map((d) => (
                        <tr key={d.id} className="group cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/40" onClick={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }}>
                          <Td><span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{d.reference}</span></Td>
                          <Td><span className="font-mono text-xs">{d.nif}</span></Td>
                          <Td><span className="block max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200">{d.taxpayerName}</span></Td>
                          <Td><span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{d.taxTypeCode}</span></Td>
                          <Td><span className="font-semibold text-amber-600 dark:text-amber-400">{fmtMGA(d.balance)}</span></Td>
                          <Td><StatusBadge status={d.debtStatus} /></Td>
                          <Td><PriorityBadge priority={d.collectionPriority} /></Td>
                          <Td><div className="max-w-[170px]">{d.lastAction ? <><p className="truncate text-xs text-slate-600 dark:text-slate-400">{ACTION_ICONS[d.lastActionType ?? ''] ?? ''} {t(ACTION_KEYS[d.lastActionType ?? ''] ?? 'common.unknown') ?? d.lastAction}</p>{d.lastActionDate && <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('collection.table.on')} {fmtDate(d.lastActionDate)}</p>}</> : <span className="text-xs text-slate-400">—</span>}</div></Td>
                          <Td>
                            <div className="max-w-[190px]">
                              {d.lastReminderDate ? (
                                <>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {d.daysSinceLastReminder === 0 ? t('collection.reminder.sinceLastToday') : t('collection.reminder.sinceLast', { days: d.daysSinceLastReminder })}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('collection.table.on')} {fmtDate(d.lastReminderDate)}</p>
                                </>
                              ) : <span className="text-xs text-slate-400">—</span>}
                              {d.nextReminderOverdue ? (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" /> {t('collection.reminder.overdue', { days: d.daysLateNextReminder })}
                                </span>
                              ) : d.nextReminderDate ? (
                                <p className="text-[10px] text-violet-500 dark:text-violet-400">{t('collection.table.plannedReminder', { date: fmtDate(d.nextReminderDate) })}</p>
                              ) : null}
                            </div>
                          </Td>
                          <Td><RowActions debt={d} onView={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }} onPayment={() => { setSelectedDebt(d); setPaymentOpen(true) }} onCall={() => openAction('PHONE_CONTACT', String(d.id))} onReminder={() => openReminder(String(d.id), d)} onNotice={() => {}} onCommandment={() => {}} onAtd={() => {}} onPaymentPlan={() => navigate(`/collection/plans?debt=${d.id}`)} onHistory={() => {}} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements} pageSize={size} onPageSizeChange={(n) => { setSize(n); setPage(0) }} onChange={setPage} />
              </>
            )}
          </div>
        )}
      </Card>

      {actionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActionOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t(ACTION_KEYS[actionForm.type] ?? 'collection.modal.action.titleDefault')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.debt')}</label>
                <Select value={actionForm.debtId} onChange={(e) => setActionForm({ ...actionForm, debtId: e.target.value })}>
                  <option value="">{t('collection.modal.action.selectShort')}</option>
                  {(actionDebts?.content ?? data?.content ?? []).filter((d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus)).map((d) => (
                    <option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} — {t('collection.modal.action.remaining', { amount: fmtMGA(d.balance) })}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.description')}</label>
                <input value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} placeholder={t('common.description')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setActionOpen(false)}>{t('collection.modal.action.cancel')}</Button>
                <Button onClick={() => createAction.mutate()} disabled={createAction.isPending || !actionForm.debtId || !actionForm.description}>{createAction.isPending ? t('collection.modal.action.saving') : t('collection.modal.action.save')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPaymentOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('collection.modal.payment.title')}</h3>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 mb-4">{t('collection.modal.payment.debtBalanceShort', { ref: selectedDebt.reference, amount: fmtMGA(selectedDebt.balance) })}</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.amount')}</label>
                <input type="number" min="1" max={selectedDebt.balance} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setPaymentOpen(false)}>{t('collection.modal.payment.cancel')}</Button>
                <Button onClick={() => registerPayment.mutate()} disabled={registerPayment.isPending || !payForm.amount}>{registerPayment.isPending ? t('collection.modal.payment.saving') : t('collection.modal.payment.save')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReminderModal open={reminderOpen} onClose={() => { setReminderOpen(false); setReminderDebt(null) }} form={reminderForm} setForm={setReminderForm} debts={actionDebts?.content ?? data?.content ?? []} debt={reminderDebt} onSubmit={submitReminder} pending={createReminder.isPending} error={createReminder.isError ? createReminder.error : null} fmtMGA={fmtMGA} />

      <DetailDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setDrawerDebtId(null) }} debtId={drawerDebtId} onPayment={(debt) => { setSelectedDebt(debt); setPaymentOpen(true) }} onReminder={(debt) => openReminder(String(debt.id), debt)} onNotice={() => {}} onPlan={(debt) => navigate(`/collection/plans?debt=${debt.id}`)} onAction={(debt, type) => openAction(type === 'commandment' ? 'COMMANDMENT' : 'ATD', String(debt.id))} />
    </div>
  )
}
