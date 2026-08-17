import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Download, Link2, Receipt as ReceiptIcon, ScrollText } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { DashboardSummary, Page, Receipt } from '../types'
import { Card, EmptyState, PageHeader, Pagination, Spinner, StatCard, Table, Td, Th } from '../components/ui'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

export default function Receipts() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page],
    queryFn: () => apiGet<Page<Receipt>>(`/receipts?page=${page}&size=20`),
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary-lite'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard/summary'),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quittances"
        subtitle="Reçus de paiement émis, consultables et vérifiables"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total encaissé" value={summary ? fmtMGA(summary.totalCollected) : '—'} icon={<ScrollText className="h-5 w-5" />} tone="brand" sub="toutes périodes" />
        <StatCard label="Quittances émises" value={data?.totalElements ?? '—'} icon={<ReceiptIcon className="h-5 w-5" />} tone="sky" sub="selon les filtres" />
        <StatCard label="Vérifiables en ligne" value={summary?.paymentCount ?? '—'} icon={<BadgeCheck className="h-5 w-5" />} tone="emerald" sub="via /verify/receipt/:ref" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune quittance" subtitle="Les quittances sont émises automatiquement après un paiement." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>N°</Th>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Impôt</Th>
                  <Th>Période</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Émise le</Th>
                  <Th>Vérifiée</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50/60">
                    <Td className="font-mono">{r.receiptNumber}</Td>
                    <Td className="font-mono text-brand-700">{r.reference}</Td>
                    <Td className="max-w-44 truncate">{r.taxpayerName}</Td>
                    <Td>{r.taxTypeCode}</Td>
                    <Td>{r.period}</Td>
                    <Td className="font-medium text-slate-900">{fmtMGA(r.amount)}</Td>
                    <Td>{methodLabels[r.method] ?? r.method}</Td>
                    <Td>{fmtDate(r.issuedAt)}</Td>
                    <Td>{r.verifiedAt ? fmtDate(r.verifiedAt) : '—'}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/receipts/${r.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                        <a
                          href={`/verify/receipt/${r.reference}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
                          title="Page publique de vérification"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </Td>
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
