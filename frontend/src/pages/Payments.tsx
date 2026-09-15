import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Download, Eye, Plus, X, Ban, Search, Filter, MoreHorizontal, Check, Clock, AlertTriangle, Wallet, CreditCard } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost, apiPut } from '../lib/api'
import { fmtDate, fmtDateTime, fmtMGA } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import type { Page, Payment, PaymentAllocationDto, PaymentStats, TaxDebt, TaxType } from '../types'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, Td, Th } from '../components/ui'
import { useToast } from '../components/Toast'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  ALLOCATED: 'Alloué',
  PARTIALLY_ALLOCATED: 'Partiellement alloué',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  REFUNDED: 'Remboursé',
}

export default function Payments() {
  const [searchParams] = useSearchParams()
  const initialCreate = searchParams.get('create') === '1'
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [taxType, setTaxType] = useState(searchParams.get('taxTypeCode') ?? '')
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(initialCreate)
  const [detail, setDetail] = useState<Payment | null>(null)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (actionMenu === null) return
    function close() {
      setActionMenu(null)
      setMenuRect(null)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [actionMenu])

  const menuStyle = useMemo(() => {
    if (!actionMenu || !menuRect) return null
    const MENU_W = 192
    const MENU_H = 156
    let left = menuRect.left + menuRect.width - MENU_W
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8))
    const openUp = menuRect.bottom + 8 + MENU_H > window.innerHeight
    return {
      left,
      top: openUp ? menuRect.top - MENU_H - 8 : menuRect.bottom + 8,
    }
  }, [actionMenu, menuRect])
  const toast = useToast()
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (taxType) params.set('taxTypeCode', taxType)
  if (method) params.set('method', method)
  if (q) params.set('q', q)
  if (dateFrom) params.set('from', dateFrom)
  if (dateTo) params.set('to', dateTo)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, size, status, taxType, method, q, dateFrom, dateTo],
    queryFn: () => apiGet<Page<Payment>>(`/payments?${params.toString()}`),
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => apiGet<PaymentStats>('/payments/stats'),
  })

  const resetFilters = () => {
    setStatus('')
    setTaxType('')
    setMethod('')
    setQ('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const exportCsv = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams({ size: '9999' })
      if (status) p.set('status', status)
      if (taxType) p.set('taxTypeCode', taxType)
      if (method) p.set('method', method)
      if (q) p.set('q', q)
      if (dateFrom) p.set('from', dateFrom)
      if (dateTo) p.set('to', dateTo)
      const rows = await apiGet<Page<Payment>>(`/payments?${p.toString()}`)
      downloadCsv(
        `paiements_${new Date().toISOString().slice(0, 10)}.csv`,
        ['Référence', 'NIF', 'Contribuable', 'Date', 'Montant', 'Mode', 'Alloué', 'Reste', 'Statut', 'Quittance'],
        rows.content.map((x) => [
          x.reference, x.nif, x.taxpayerName, x.paymentDate, x.amount,
          methodLabels[x.method] ?? x.method, x.allocatedAmount, x.unpaidAmount, x.status, x.receiptReference ?? '',
        ]),
      )
    },
    onSuccess: () => toast.success('Export terminé'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        subtitle="Suivi des paiements, encaissements et quittances fiscales"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nouveau paiement
            </Button>
          </div>
        }
      />

      {/* ══ KPI Cards ══ */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paiements du mois</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.monthCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{fmtMGA(stats.monthAmount)} encaissés</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paiements du jour</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.todayCount}</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">En attente</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingCount}</p>
                {stats.unallocatedAmount > 0 && (
                  <p className="text-xs text-amber-500 dark:text-amber-400">{fmtMGA(stats.unallocatedAmount)} non alloués</p>
                )}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-rose-500" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rejetés / Annulés</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.rejectedCount + stats.cancelledCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{stats.allocatedCount} alloués</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        {/* ── Barre de recherche et filtres ── */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0) }}
              placeholder="Rechercher (réf., NIF, nom, dette, déclaration…)"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filtres
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Impôt</label>
              <Select value={taxType} onChange={(e) => { setTaxType(e.target.value); setPage(0) }}>
                <option value="">Tous</option>
                {taxTypes?.map((tt) => (
                  <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Statut</label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="ALLOCATED">Alloué</option>
                <option value="PARTIALLY_ALLOCATED">Partiellement alloué</option>
                <option value="REJECTED">Rejeté</option>
                <option value="CANCELLED">Annulé</option>
                <option value="REFUNDED">Remboursé</option>
              </Select>
            </div>
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Mode</label>
              <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0) }}>
                <option value="">Tous</option>
                {Object.entries(methodLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs text-slate-500 mb-1 block">Date début</label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }} />
            </div>
            <div className="w-36">
              <label className="text-xs text-slate-500 mb-1 block">Date fin</label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }} />
            </div>
            <div className="w-24">
              <label className="text-xs text-slate-500 mb-1 block">Taille</label>
              <Select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }}>
                <option value="10">10</option>
                <option value="20">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4" /> Réinitialiser
            </Button>
          </div>
        )}

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun paiement" subtitle="Les encaissements apparaîtront ici." />
        ) : (
          <>
            <Table>
                <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                  <tr>
                    <Th>Référence</Th>
                    <Th>Contribuable</Th>
                    <Th>NIF</Th>
                    <Th>Date</Th>
                    <Th>Montant</Th>
                    <Th>Mode</Th>
                    <Th>Alloué</Th>
                    <Th>Reste</Th>
                    <Th>Statut</Th>
                    <Th>Quittance</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {data.content.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                      <Td className="font-mono text-brand-700 text-xs">{p.reference}</Td>
                      <Td className="max-w-40 truncate">
                        <button onClick={() => setDetail(p)} className="font-medium text-slate-900 dark:text-slate-100 hover:text-brand-700 hover:underline">{p.taxpayerName}</button>
                      </Td>
                      <Td className="text-xs text-slate-500">{p.nif}</Td>
                      <Td>{fmtDate(p.paymentDate)}</Td>
                      <Td className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(p.amount)}</Td>
                      <Td className="text-xs">{methodLabels[p.method] ?? p.method}</Td>
                      <Td>{fmtMGA(p.allocatedAmount)}</Td>
                      <Td>
                        <span className={p.unpaidAmount > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                          {fmtMGA(p.unpaidAmount)}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge value={p.status} />
                      </Td>
                      <Td className="text-xs font-mono">{p.receiptReference ?? '—'}</Td>
                      <Td>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (actionMenu === p.id) {
                                setActionMenu(null)
                                setMenuRect(null)
                              } else {
                                setActionMenu(p.id)
                                setMenuRect(e.currentTarget.getBoundingClientRect())
                              }
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === p.id && menuStyle && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                              <div
                                className="fixed z-50 w-48 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50"
                                style={{ top: menuStyle.top, left: menuStyle.left }}
                              >
                                <div className="space-y-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDetail(p)
                                      setActionMenu(null)
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le détail
                                  </button>
                                  {['PENDING', 'CONFIRMED'].includes(p.status) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDetail(p)
                                        setActionMenu(null)
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                      <Ban className="h-4 w-4 shrink-0" /> Annuler le paiement
                                    </button>
                                  )}
                                  {p.status !== 'ALLOCATED' && p.status !== 'REFUNDED' && p.status !== 'CANCELLED' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toast.info('Fonctionnalité à venir')
                                        setActionMenu(null)
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Check className="h-4 w-4 shrink-0" /> Allouer manuellement
                                    </button>
                                  )}

                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-sm text-slate-500">
                {data.totalElements} résultat{data.totalElements !== 1 ? 's' : ''} — page {data.number + 1} sur {data.totalPages}
              </span>
              <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {createOpen && <CreatePaymentModal onClose={() => setCreateOpen(false)} />}
      {detail && <PaymentDetailModal payment={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

/* ──────────────────── Création de paiement ──────────────────── */

function CreatePaymentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [debtId, setDebtId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [transactionRef, setTransactionRef] = useState('')
  const [observations, setObservations] = useState('')

  const { data: debts } = useQuery({
    queryKey: ['debts-open'],
    queryFn: () => apiGet<Page<TaxDebt>>('/debts?size=200'),
    select: (d) => d.content.filter((x) => ['ISSUED', 'OVERDUE', 'IN_COLLECTION', 'PARTIALLY_PAID'].includes(x.status)),
  })

  const create = useMutation({
    mutationFn: (payload: {
      debtId: number; amount: number; paymentDate: string; method: string;
      transactionReference?: string; observations?: string;
    }) => apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
      toast.success('Paiement enregistré')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const selectedDebt = debts?.find((d) => d.id === Number(debtId))

  return (
    <Modal open onClose={onClose} title="Nouveau paiement" subtitle="Le montant est alloué automatiquement sur la créance choisie." wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            debtId: Number(debtId), amount: Number(amount), paymentDate, method,
            transactionReference: transactionRef || undefined,
            observations: observations || undefined,
          })
        }}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Créance à régler *">
            <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
              <option value="">— Sélectionner une créance —</option>
              {(debts ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.reference} — {d.taxpayerName} ({fmtMGA(d.balance)} restants)
                </option>
              ))}
            </Select>
            {(!debts || debts.length === 0) && (
              <p className="mt-1 text-xs text-amber-600">Aucune créance ouverte à régler pour le moment.</p>
            )}
          </Field>
          <Field label="Montant (MGA) *">
            <Input type="number" min="1" max={selectedDebt?.balance} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
            {selectedDebt && amount && Number(amount) > selectedDebt.balance && (
              <p className="mt-1 text-xs text-rose-600">Le montant dépasse le solde restant.</p>
            )}
          </Field>
        </div>
        {selectedDebt && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Total créance :</span>
              <strong>{fmtMGA(selectedDebt.totalAmount)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Déjà payé :</span>
              <strong>{fmtMGA(selectedDebt.paidAmount)}</strong>
            </div>
            <div className="flex justify-between text-brand-700">
              <span>Solde restant :</span>
              <strong>{fmtMGA(selectedDebt.balance)}</strong>
            </div>
            <div className="text-xs text-slate-400">{selectedDebt.taxTypeCode} · {selectedDebt.period}</div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mode de paiement *">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(methodLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date de paiement *">
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Référence transaction">
          <Input type="text" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="Référence bancaire / Mobile Money" />
        </Field>
        <Field label="Observations">
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={2}
            placeholder="Notes ou observations..."
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={create.isPending || !debtId || !amount || Number(amount) <= 0 || (selectedDebt ? Number(amount) > selectedDebt.balance : false)}>
            {create.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────── Détail d'un paiement ──────────────────── */

function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => apiPut(`/payments/${payment.id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      onClose()
      toast.success('Paiement annulé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const { data: fullPayment } = useQuery({
    queryKey: ['payment', payment.id],
    queryFn: () => apiGet<Payment>(`/payments/${payment.id}`),
    initialData: payment,
  })

  return (
    <Modal open onClose={onClose} title={`Paiement ${fullPayment.reference}`}>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge value={fullPayment.status} />
            <span className="text-xs text-slate-500">{statusLabels[fullPayment.status] ?? fullPayment.status}</span>
          </div>
          <p className="text-sm text-slate-500">Enregistré par {fullPayment.createdBy || '—'} le {fmtDateTime(fullPayment.recordedAt)}</p>
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">Montant payé</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{fmtMGA(fullPayment.amount)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">Montant alloué</p>
          <p className="text-xl font-bold text-emerald-600">{fmtMGA(fullPayment.allocatedAmount)}</p>
        </div>
      </div>
      {fullPayment.unpaidAmount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:border-amber-700">
          Montant non alloué : <strong>{fmtMGA(fullPayment.unpaidAmount)}</strong>
        </div>
      )}

      {/* Détails */}
      <dl className="divide-y divide-slate-100 dark:divide-slate-700/50 mb-4">
        <DetailRow label="Référence" value={fullPayment.reference} mono />
        <DetailRow label="Contribuable" value={`${fullPayment.taxpayerName} (${fullPayment.nif})`} />
        <DetailRow label="NIF" value={fullPayment.nif} />
        {fullPayment.debtReference && (
          <DetailRow label="Créance" value={fullPayment.debtReference} link={`/debts`} />
        )}
        {fullPayment.declarationReference && (
          <DetailRow label="Déclaration" value={fullPayment.declarationReference} link={`/declarations`} />
        )}
        <DetailRow label="Date de paiement" value={fmtDate(fullPayment.paymentDate)} />
        <DetailRow label="Mode" value={methodLabels[fullPayment.method] ?? fullPayment.method} />
        {fullPayment.transactionReference && (
          <DetailRow label="Réf. transaction" value={fullPayment.transactionReference} mono />
        )}
        {fullPayment.observations && (
          <DetailRow label="Observations" value={fullPayment.observations} />
        )}
        <DetailRow label="Quittance" value={fullPayment.receiptReference ?? '—'} mono />
      </dl>

      {/* Allocations */}
      {fullPayment.allocationDetails && fullPayment.allocationDetails.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Allocations</h4>
          <div className="space-y-2">
            {fullPayment.allocationDetails.map((alloc: PaymentAllocationDto) => (
              <div key={alloc.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-brand-700">{alloc.debtReference}</span>
                    <span className="ml-2 text-xs text-slate-500">({alloc.component})</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(alloc.amount)}</span>
                </div>
                {alloc.comment && <p className="mt-1 text-xs text-slate-500">{alloc.comment}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  Alloué par {alloc.createdBy || '—'} le {fmtDateTime(alloc.allocatedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {fullPayment.rejectionReason && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Raison du rejet : {fullPayment.rejectionReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div>
          {fullPayment.status !== 'CANCELLED' && fullPayment.status !== 'REFUNDED' && (
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> Annuler le paiement
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {fullPayment.debtId && (
            <Button variant="ghost" size="sm" onClick={() => onClose()}>
              Voir la créance
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      </div>

      {/* Modal annulation */}
      {cancelOpen && (
        <Modal open onClose={() => setCancelOpen(false)} title="Annuler le paiement">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Le paiement <strong>{fullPayment.reference}</strong> sera annulé.
              Les allocations seront invalidées et la créance sera recalculée.
            </p>
            <Field label="Motif de l'annulation *">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                rows={3}
                placeholder="Motif obligatoire..."
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelOpen(false)}>Retour</Button>
              <Button
                variant="ghost"
                className="text-red-600"
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
              >
                {cancelMutation.isPending ? 'Annulation…' : 'Confirmer l\'annulation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

function DetailRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>
        {link ? (
          <span className="text-brand-700 hover:underline cursor-pointer">{value}</span>
        ) : value}
      </dd>
    </div>
  )
}
