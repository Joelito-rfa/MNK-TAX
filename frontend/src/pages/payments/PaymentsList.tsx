import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Ban, Check, Download, Eye, Filter, Plus, Search, X } from 'lucide-react'
import { apiErrorMessage, apiGet } from '../../lib/api'
import { fmtDate, fmtMGA } from '../../lib/format'
import { downloadCsv } from '../../lib/csv'
import type { Page, Payment, PaymentStats, TaxType } from '../../types'
import { Button, Card, EmptyState, Input, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, Td, Th } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { PaymentStatsCards } from './shared/PaymentStatsCards'
import { PaymentDetailModal } from './shared/PaymentDetailModal'
import { CreatePaymentModal, methodLabels } from './shared/CreatePaymentModal'
import RowActionPortal from '../../components/RowActionPortal'

export interface PaymentsListProps {
  initialStatus?: string
  initialTaxType?: string
}

export function PaymentsList({ initialStatus = '', initialTaxType = '' }: PaymentsListProps) {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(25)
  const [status, setStatus] = useState(initialStatus ? initialStatus : searchParams.get('status') ?? '')
  const [taxType, setTaxType] = useState(initialTaxType ? initialTaxType : searchParams.get('taxTypeCode') ?? '')
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1')
  const [detail, setDetail] = useState<Payment | null>(null)
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
    setStatus(initialStatus)
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
    <div className="fx-page space-y-6">
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

      {stats && <PaymentStatsCards stats={stats} />}

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
                <option value="25">25</option>
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
                        <RowActionPortal width={224}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetail(p) }}
                            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le détail
                          </button>
                          {['PENDING', 'CONFIRMED'].includes(p.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetail(p) }}
                              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Ban className="h-4 w-4 shrink-0" /> Annuler le paiement
                            </button>
                          )}
                          {p.status !== 'ALLOCATED' && p.status !== 'REFUNDED' && p.status !== 'CANCELLED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toast.info('Fonctionnalité à venir') }}
                              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <Check className="h-4 w-4 shrink-0" /> Allouer manuellement
                            </button>
                          )}
                        </RowActionPortal>
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