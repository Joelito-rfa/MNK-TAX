import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Inbox, Mail, Plus, RefreshCw, X } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../../lib/api'
import { fmtDate, fmtMGA } from '../../lib/format'
import type { CollectionDebtRow, CollectionStats, DebtStatus, Page, TaxType } from '../../types'
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
import { TERMINAL_STATUSES, ACTION_LABELS, ACTION_ICONS } from '../../components/collection/constants'

export default function CollectionNotices() {
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
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeDebtId, setNoticeDebtId] = useState('')
  const [noticeContent, setNoticeContent] = useState('')

  const queryClient = useQueryClient()
  const toast = useToast()

  const buildParams = () => {
    const p = new URLSearchParams({ page: String(page), size: String(size), inCollection: 'true' })
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    if (advApplied.priority) p.set('priority', advApplied.priority)
    return p.toString()
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['collection-debts', 'notices', page, size, searchQ, taxTypeFilter, periodFilter, advApplied],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${buildParams()}`),
  })
  const { data: taxTypes } = useQuery({ queryKey: ['tax-types-ref'], queryFn: () => apiGet<TaxType[]>('/tax-types') })
  const { data: periods } = useQuery({ queryKey: ['collection-periods'], queryFn: () => apiGet<string[]>('/collection/periods') })
  const { data: stats } = useQuery({ queryKey: ['collection-stats'], queryFn: () => apiGet<CollectionStats>('/collection/stats') })
  const { data: actionDebts } = useQuery({
    queryKey: ['collection-action-debts'],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?size=9999`),
    enabled: noticeOpen,
  })

  const createNotice = useMutation({
    mutationFn: () => apiPost('/collection/notices', { debtId: Number(noticeDebtId), noticeType: 'MISE_EN_DEMEURE', content: noticeContent || undefined }),
    onSuccess: () => { invalidateQueries(); setNoticeOpen(false); setNoticeDebtId(''); setNoticeContent(''); toast.success('Mise en demeure émise') },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })
  const registerPayment = useMutation({
    mutationFn: () => apiPost('/collection/payment', { debtId: selectedDebt!.id, amount: Number(payForm.amount), paymentDate: payForm.paymentDate, method: payForm.method }),
    onSuccess: () => { invalidateQueries(); setPaymentOpen(false); setSelectedDebt(null); setPayForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' }); toast.success('Paiement enregistré') },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  function invalidateQueries() { queryClient.invalidateQueries({ queryKey: ['collection-debts'] }); queryClient.invalidateQueries({ queryKey: ['collection-stats'] }); queryClient.invalidateQueries({ queryKey: ['debt-stats'] }) }
  function openNotice(debtId?: string) { setNoticeDebtId(debtId ?? ''); setNoticeContent(''); setNoticeOpen(true) }

  const totalResults = data?.totalElements ?? 0
  const hasFilters = !!(searchQ || taxTypeFilter || periodFilter || Object.values(advApplied).some(Boolean))
  const activeFilterCount = [searchQ, taxTypeFilter, periodFilter, advApplied.priority].filter(Boolean).length
  function resetFilters() { setSearchQ(''); setTaxTypeFilter(''); setPeriodFilter(''); setAdvApplied(EMPTY_ADV); setAdvDraft(EMPTY_ADV); setPage(0) }
  function applyAdvanced() { setAdvApplied(advDraft); setPage(0) }
  function removeChip(kind: keyof AdvancedFilters | 'q' | 'taxType' | 'period') { if (kind === 'q') setSearchQ(''); else if (kind === 'taxType') setTaxTypeFilter(''); else if (kind === 'period') setPeriodFilter(''); else setAdvApplied((a) => ({ ...a, [kind]: '' })); setPage(0) }

  if (isLoading && !data) return <CollectionSkeleton />

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-orange-500/[0.03] blur-[100px]" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">Mises en demeure</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Créances en phase de mise en demeure</p>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-4 w-4" /> Actualiser</Button>
          <button onClick={() => openNotice()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-500 hover:to-amber-500 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nouvelle mise en demeure
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Mises en demeure" value={stats.noticeCount} icon={<Mail className="h-5 w-5 text-orange-500" />} wrap="bg-orange-500/10" bar="bg-orange-500" />
          <KpiCard label="Dossiers en litige" value={stats.disputedDebts} icon={<AlertCircle className="h-5 w-5 text-red-500" />} wrap="bg-red-500/10" bar="bg-red-500" />
          <KpiCard label="Suspendus" value={stats.suspendedDebts} icon={<AlertCircle className="h-5 w-5 text-amber-500" />} wrap="bg-amber-500/10" bar="bg-amber-500" />
          <KpiCard label="Reste à recouvrer" value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-orange-500" />} wrap="bg-orange-500/10" bar="bg-orange-500" />
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
            {!isLoading && data ? (<><span className="font-medium text-slate-700 dark:text-slate-300">{totalResults}</span> mise{totalResults > 1 ? 's' : ''} en demeure</>) : 'Chargement…'}
          </p>
        </div>

        {isError ? (
          <div className="px-5 py-10">
            <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 font-medium text-red-700 dark:text-red-400">Erreur de chargement.</p>
              <p className="mt-1 text-xs text-red-500/80">{apiErrorMessage(error)}</p>
              <Button className="mt-4" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}><RefreshCw className="h-3.5 w-3.5" /> Réessayer</Button>
            </div>
          </div>
        ) : !data || data.content.length === 0 ? (
          <div className="py-14">
            <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune mise en demeure" subtitle="Aucune créance n'est en phase de mise en demeure." />
            {hasFilters && <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm" onClick={resetFilters}><X className="h-4 w-4" /> Réinitialiser</Button></div>}
          </div>
        ) : (
          <div className="animate-page-in">
            {isLoading ? <Spinner /> : (
              <>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <Table>
                    <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                      <tr><Th>Réf.</Th><Th>NIF</Th><Th>Contribuable</Th><Th>Impôt</Th><Th>Reste</Th><Th>Statut</Th><Th>Priorité</Th><Th>Dernière action</Th><Th className="w-12"></Th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                      {data.content.map((d) => (
                        <tr key={d.id} className="group cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/40" onClick={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }}>
                          <Td><span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{d.reference}</span></Td>
                          <Td><span className="font-mono text-xs">{d.nif}</span></Td>
                          <Td><span className="block max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200">{d.taxpayerName}</span></Td>
                          <Td><span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{d.taxTypeCode}</span></Td>
                          <Td><span className="font-semibold text-orange-600 dark:text-orange-400">{fmtMGA(d.balance)}</span></Td>
                          <Td><StatusBadge status={d.debtStatus} /></Td>
                          <Td><PriorityBadge priority={d.collectionPriority} /></Td>
                          <Td><div className="max-w-[170px]">{d.lastAction ? <><p className="truncate text-xs text-slate-600 dark:text-slate-400">{ACTION_ICONS[d.lastActionType ?? ''] ?? ''} {ACTION_LABELS[d.lastActionType ?? ''] ?? d.lastAction}</p>{d.lastActionDate && <p className="text-[10px] text-slate-400 dark:text-slate-500">le {fmtDate(d.lastActionDate)}</p>}</> : <span className="text-xs text-slate-400">—</span>}</div></Td>
                          <Td><RowActions debt={d} onView={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }} onPayment={() => { setSelectedDebt(d); setPaymentOpen(true) }} onCall={() => {}} onReminder={() => {}} onNotice={() => openNotice(String(d.id))} onCommandment={() => {}} onAtd={() => {}} onPaymentPlan={() => navigate(`/collection/plans?debt=${d.id}`)} onHistory={() => {}} /></Td>
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

      {/* MODAL : MISE EN DEMEURE */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setNoticeOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Émettre une mise en demeure</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Acte formel effectué par un agent habilité.</p>
            {createNotice.isError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{apiErrorMessage(createNotice.error)}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Créance concernée</label>
                <Select value={noticeDebtId} onChange={(e) => setNoticeDebtId(e.target.value)}>
                  <option value="">— Sélectionner une créance —</option>
                  {(actionDebts?.content ?? data?.content ?? []).filter((d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus)).map((d) => (
                    <option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} — reste {fmtMGA(d.balance)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contenu (facultatif)</label>
                <textarea rows={4} value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} placeholder="ex : Invitation à régulariser la créance dans les délais prévus par la réglementation applicable." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setNoticeOpen(false)}>Annuler</Button>
                <Button onClick={() => createNotice.mutate()} disabled={createNotice.isPending || !noticeDebtId}>{createNotice.isPending ? 'Émission…' : 'Émettre la mise en demeure'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {paymentOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPaymentOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Enregistrer un paiement</h3>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 mb-4">Créance : <strong className="font-mono">{selectedDebt.reference}</strong> — Solde : <strong className="text-amber-600">{fmtMGA(selectedDebt.balance)}</strong></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant (MGA)</label>
                <input type="number" min="1" max={selectedDebt.balance} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Annuler</Button>
                <Button onClick={() => registerPayment.mutate()} disabled={registerPayment.isPending || !payForm.amount}>{registerPayment.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DetailDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setDrawerDebtId(null) }} debtId={drawerDebtId} onPayment={(debt) => { setSelectedDebt(debt); setPaymentOpen(true) }} onReminder={() => {}} onNotice={(debt) => openNotice(String(debt.id))} onPlan={(debt) => navigate(`/collection/plans?debt=${debt.id}`)} onAction={() => {}} />
    </div>
  )
}
