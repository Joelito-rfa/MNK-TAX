import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, Landmark, Wallet } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { DashboardSummary, Page, Payment } from '../types'
import { Card, EmptyState, PageHeader, Pagination, Select, Spinner, StatCard, StatusBadge, Table, Td, Th } from '../components/ui'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

export default function Payments() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')

  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (status) params.set('status', status)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, status],
    queryFn: () => apiGet<Page<Payment>>(`/payments?${params.toString()}`),
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary-lite'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard/summary'),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        subtitle="Encaissements enregistrés et allocation sur les créances"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total encaissé" value={summary ? fmtMGA(summary.totalCollected) : '—'} icon={<Landmark className="h-5 w-5" />} tone="brand" sub="toutes périodes" />
        <StatCard label="Ce mois-ci" value={summary ? fmtMGA(summary.currentMonthPayments) : '—'} icon={<CalendarDays className="h-5 w-5" />} tone="sky" sub="période en cours" />
        <StatCard label="Paiements enregistrés" value={summary?.paymentCount ?? '—'} icon={<Wallet className="h-5 w-5" />} tone="emerald" sub="au total" />
        <StatCard label="Résultats affichés" value={data?.totalElements ?? '—'} icon={<Wallet className="h-5 w-5" />} tone="violet" sub="selon les filtres" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 px-5 py-4">
          <div className="w-52">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              <option value="RECORDED">Enregistré</option>
              <option value="ALLOCATED">Alloué</option>
              <option value="REJECTED">Rejeté</option>
              <option value="CANCELLED">Annulé</option>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun paiement" subtitle="Les encaissements apparaîtront ici." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Date</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Alloué</Th>
                  <Th>Statut</Th>
                  <Th>Quittance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/60">
                    <Td className="font-mono text-brand-700">{p.reference}</Td>
                    <Td className="max-w-44 truncate">
                      <Link to={`/taxpayers/${p.taxpayerId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{p.taxpayerName}</Link>
                    </Td>
                    <Td>{fmtDate(p.paymentDate)}</Td>
                    <Td className="font-medium text-slate-900">{fmtMGA(p.amount)}</Td>
                    <Td>{methodLabels[p.method] ?? p.method}</Td>
                    <Td>{fmtMGA(p.allocatedAmount)}</Td>
                    <Td>
                      <StatusBadge value={p.status} />
                    </Td>
                    <Td>{p.receiptReference ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
