import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Clock, Wallet } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { Page, Payment, TaxDebt } from '../types'
import { Card, CardHeader, EmptyState, PageHeader, Pagination, Spinner, StatCard, StatusBadge, Table, Td, Th } from '../components/ui'

export default function Reports() {
  const [debtsPage, setDebtsPage] = useState(0)
  const [paymentsPage, setPaymentsPage] = useState(0)

  const { data: debts, isLoading: loadingDebts } = useQuery({
    queryKey: ['report-collection', debtsPage],
    queryFn: () => apiGet<Page<TaxDebt>>(`/reports/collection?page=${debtsPage}&size=20`),
  })

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['report-payments', paymentsPage],
    queryFn: () => apiGet<Page<Payment>>(`/reports/payments?page=${paymentsPage}&size=20`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        subtitle="Synthèses du recouvrement et des encaissements"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total encaissé" value={fmtMGA(sumPayments(payments?.content))} icon={<Wallet className="h-5 w-5" />} tone="brand" sub={`${payments?.totalElements ?? 0} paiements`} />
        <StatCard label="Créances ouvertes" value={countStatus(debts?.content, ['OPEN', 'OVERDUE', 'IN_COLLECTION'])} icon={<BarChart3 className="h-5 w-5" />} tone="sky" sub="non soldées" />
        <StatCard label="Créances en retard" value={countStatus(debts?.content, ['OVERDUE'])} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" sub="en cours" />
        <StatCard label="Solde total dû" value={fmtMGA(sumBalance(debts?.content))} icon={<Clock className="h-5 w-5" />} tone="rose" sub="échantillon affiché" />
      </div>

      <Card>
        <CardHeader title="Rapport de recouvrement" />
        {loadingDebts ? (
          <Spinner />
        ) : !debts || debts.content.length === 0 ? (
          <EmptyState title="Aucune créance" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <Th>Référence</Th>
                  <Th>NIF</Th>
                  <Th>Contribuable</Th>
                  <Th>Impôt</Th>
                  <Th>Période</Th>
                  <Th>Total</Th>
                  <Th>Payé</Th>
                  <Th>Solde</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debts.content.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td className="font-mono text-brand-700">{d.reference}</Td>
                    <Td className="font-mono">{d.nif}</Td>
                    <Td className="max-w-44 truncate">{d.taxpayerName}</Td>
                    <Td>{d.taxTypeCode}</Td>
                    <Td>{d.period}</Td>
                    <Td>{fmtMGA(d.totalAmount)}</Td>
                    <Td>{fmtMGA(d.paidAmount)}</Td>
                    <Td className="font-medium text-amber-700">{fmtMGA(d.balance)}</Td>
                    <Td>{fmtDate(d.dueDate)}</Td>
                    <Td>
                      <StatusBadge value={d.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={debts.number} totalPages={debts.totalPages} onChange={setDebtsPage} />
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="Rapport des paiements" />
        {loadingPayments ? (
          <Spinner />
        ) : !payments || payments.content.length === 0 ? (
          <EmptyState title="Aucun paiement" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Date</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Alloué</Th>
                  <Th>Quittance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.content.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td className="font-mono text-brand-700">{p.reference}</Td>
                    <Td className="max-w-44 truncate">{p.taxpayerName}</Td>
                    <Td>{fmtDate(p.paymentDate)}</Td>
                    <Td className="font-medium">{fmtMGA(p.amount)}</Td>
                    <Td>{p.method}</Td>
                    <Td>{fmtMGA(p.allocatedAmount)}</Td>
                    <Td>{p.receiptReference ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={payments.number} totalPages={payments.totalPages} onChange={setPaymentsPage} />
          </>
        )}
      </Card>
    </div>
  )
}

function sumPayments(items: Payment[] | undefined): number {
  return items?.reduce((s, p) => s + p.amount, 0) ?? 0
}

function sumBalance(items: TaxDebt[] | undefined): number {
  return items?.reduce((s, d) => s + d.balance, 0) ?? 0
}

function countStatus(items: TaxDebt[] | undefined, statuses: string[]): number {
  return items?.filter((d) => statuses.includes(d.status)).length ?? 0
}
