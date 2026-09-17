import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, AlertCircle, Inbox, Plus, RefreshCw, X } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { useLocaleFormatters } from '../../lib/format'
import { apiErrorMessage, apiPost } from '../../lib/api'
import type { CollectionDebtRow } from '../../types'
import { Button, Card, EmptyState, Pagination, Spinner } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { CollectionSkeleton } from '../../components/collection/CollectionSkeleton'
import { DetailDrawer } from '../../components/collection/DetailDrawer'
import { CollectionFilters } from '../../components/collection/CollectionFilters'
import { TERMINAL_STATUSES } from '../../components/collection/constants'
import { useCollectionFilters } from '../../features/collection/hooks/useCollectionFilters'
import { useCollectionDebts, useCollectionStats, useOverdueSummary, useTaxTypesRef, useCollectionPeriods, useActionDebts } from '../../features/collection/api/queries'
import { KpiStrip } from '../../features/collection/components/KpiStrip'
import { DebtTable } from '../../features/collection/components/DebtTable'
import { ActionModal } from '../../features/collection/components/modals/ActionModal'
import { PaymentModal } from '../../features/collection/components/modals/PaymentModal'
import { ReminderModal, emptyReminderForm, type ReminderForm } from '../../features/collection/components/modals/ReminderModal'
import { useCreateReminder } from '../../features/collection/api/mutations'

export default function CollectionOverdue() {
  // Étape fiscale 2 : En retard — dettes échues (overdue=true), relance amiable avant acte formel
  const navigate = useNavigate()
  const f = useCollectionFilters('overdue')
  const [drawerDebtId, setDrawerDebtId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<CollectionDebtRow | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'call' | 'reminder'>('call')
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderDebt, setReminderDebt] = useState<CollectionDebtRow | null>(null)
  const [reminderForm, setReminderForm] = useState<ReminderForm>(emptyReminderForm())

  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { fmtMGA, fmtDate } = useLocaleFormatters()

  const { data, isLoading, isError, error } = useCollectionDebts('overdue', f.buildParams)
  const { data: taxTypes } = useTaxTypesRef()
  const { data: periods } = useCollectionPeriods()
  const { data: stats } = useCollectionStats()
  const { data: overdueSummary } = useOverdueSummary(new URLSearchParams({ ...(f.searchQ?{q:f.searchQ}:{}), ...(f.taxTypeFilter?{taxTypeCode:f.taxTypeFilter}:{}), ...(f.periodFilter?{period:f.periodFilter}:{}) }).toString())
  const { data: actionDebts } = useActionDebts(actionOpen)

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

  function invalidateQueries() { queryClient.invalidateQueries({ queryKey: ['collection-debts'] }); queryClient.invalidateQueries({ queryKey: ['collection-stats'] }); queryClient.invalidateQueries({ queryKey: ['collection-overdue-summary'] }); queryClient.invalidateQueries({ queryKey: ['debt-stats'] }) }
  function resetActionForm() { setActionForm({ debtId: '', type: 'PHONE_CONTACT', description: '', actionDate: new Date().toISOString().slice(0, 10), outcome: '', nextAction: '', nextActionDate: '' }) }
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
  function openActionWithType(type: 'call' | 'reminder', debtId?: string) { if (type === 'reminder') { openReminder(debtId); return } setActionType(type); const typeMap: Record<string, string> = { call: 'PHONE_CONTACT', reminder: 'REMINDER' }; setActionForm((f) => ({ ...f, type: typeMap[type], debtId: debtId ?? f.debtId, description: '' })); setActionOpen(true) }

  const totalResults = data?.totalElements ?? 0

  if (isLoading && !data) return <CollectionSkeleton />

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-rose-500/[0.03] blur-[100px]" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">{t('collection.overdue')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('collection.subtitle')}</p>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-4 w-4" />{t('common.refresh')}</Button>
          <button onClick={() => openActionWithType('call')} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-brand-500 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> {t('collection.newAction')}
          </button>
        </div>
      </div>

      {/* KPIs — fiscale : retard stratifié 30/60/90 */}
      {stats && <KpiStrip stage="overdue" stats={stats} fmtMGA={fmtMGA} />}

      {/* Filtres + tableau — module En retard isolé */}
      <Card>
        <CollectionFilters
          searchQ={f.searchQ} onSearchChange={(v) => { f.setSearchQ(v); f.setPage(0) }}
          taxTypeFilter={f.taxTypeFilter} onTaxTypeChange={(v) => { f.setTaxTypeFilter(v); f.setPage(0) }}
          periodFilter={f.periodFilter} onPeriodChange={(v) => { f.setPeriodFilter(v); f.setPage(0) }}
          taxTypes={taxTypes} periods={periods}
          advDraft={f.advDraft} onAdvDraftChange={f.setAdvDraft} advApplied={f.advApplied}
          onApplyAdvanced={f.applyAdvanced} onResetFilters={f.resetFilters}
          showAdvanced={f.showAdvanced} onToggleAdvanced={() => f.setShowAdvanced(!f.showAdvanced)}
          activeFilterCount={f.activeFilterCount} hasFilters={f.hasFilters}
          onRemoveChip={f.removeChip}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {!isLoading && data ? (<span className="font-medium text-slate-700 dark:text-slate-300">{t('collection.count.overdue', { count: totalResults, plural: totalResults > 1 ? 's' : '' })}</span>) : t('collection.loading')}
          </p>
          {overdueSummary && overdueSummary.count > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 font-medium text-rose-500"><AlertTriangle className="h-3 w-3" /> {t('collection.overdue.files', { count: overdueSummary.count, plural: overdueSummary.count > 1 ? 's' : '' })}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-600 dark:text-amber-400">{t('collection.overdue.balances', { amount: fmtMGA(overdueSummary.totalBalance) })}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 font-medium text-slate-600 dark:text-slate-400">{t('collection.overdue.avgDelay', { days: overdueSummary.averageDays })}</span>
              {overdueSummary.oldestDueDate && <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 font-medium text-slate-600 dark:text-slate-400">{t('collection.overdue.oldest', { date: fmtDate(overdueSummary.oldestDueDate) })}</span>}
            </div>
          )}
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
            <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("collection.noOverdue")} subtitle={t("common.noResult")} />
            {f.hasFilters && <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm" onClick={f.resetFilters}><X className="h-4 w-4" /> {t('collection.resetFilters')}</Button></div>}
          </div>
        ) : (
          <div className="animate-page-in">
            {isLoading ? <Spinner /> : (
              <>
                <DebtTable stage="overdue" debts={data.content} onView={(d)=>{setDrawerDebtId(d.id);setDrawerOpen(true)}} onPayment={(d)=>{setSelectedDebt(d);setPaymentOpen(true)}} onAction={(_d,type)=>openActionWithType(type as any, String(_d.id))} onNotice={()=>{}} onPlan={(d)=>navigate(`/collection/plans?debt=${d.id}`)} onHistory={()=>{}} fmtMGA={fmtMGA} fmtDate={fmtDate} />
                <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements} pageSize={f.size} onPageSizeChange={(n) => { f.setSize(n); f.setPage(0) }} onChange={f.setPage} />
              </>
            )}
          </div>
        )}
      </Card>

      <ActionModal open={actionOpen} onClose={()=>setActionOpen(false)} actionType={actionType} form={actionForm} setForm={setActionForm} debts={(actionDebts?.content ?? data?.content ?? []).filter((d:any)=>d.balance>0 && !TERMINAL_STATUSES.includes(d.debtStatus))} onSubmit={()=>createAction.mutate()} pending={createAction.isPending} error={createAction.isError} />
      <PaymentModal open={paymentOpen} onClose={()=>setPaymentOpen(false)} debt={selectedDebt} form={payForm} setForm={setPayForm} onSubmit={()=>registerPayment.mutate()} pending={registerPayment.isPending} error={registerPayment.isError} fmtMGA={fmtMGA} />
      <ReminderModal open={reminderOpen} onClose={()=>{ setReminderOpen(false); setReminderDebt(null) }} form={reminderForm} setForm={setReminderForm} debts={actionDebts?.content ?? data?.content ?? []} debt={reminderDebt} onSubmit={submitReminder} pending={createReminder.isPending} error={createReminder.isError ? createReminder.error : null} fmtMGA={fmtMGA} />

      <DetailDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setDrawerDebtId(null) }} debtId={drawerDebtId} onPayment={(debt) => { setSelectedDebt(debt); setPaymentOpen(true) }} onReminder={(debt) => openReminder(String(debt.id), debt)} onNotice={() => {}} onPlan={(debt) => navigate(`/collection/plans?debt=${debt.id}`)} onAction={(debt, type) => openActionWithType(type as 'call' | 'reminder', String(debt.id))} />
    </div>
  )
}
