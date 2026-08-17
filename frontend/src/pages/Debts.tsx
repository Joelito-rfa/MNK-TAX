import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Eye, TrendingDown, Wallet } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { DashboardSummary, Page, TaxDebt } from '../types'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

const debtActionMessages: Record<string, string> = {
  'mark-overdue': 'Impôts en retard détectés',
  cancel: 'Créance annulée',
  adjustment: 'Ajustement enregistré',
  'in-collection': 'Créance envoyée en recouvrement',
}

const itemLabels: Record<string, string> = {
  PRINCIPAL: 'Principal',
  PENALTY: 'Pénalité',
  INTEREST: 'Intérêt',
  ADJUSTMENT: 'Ajustement',
  CREDIT: 'Crédit',
}

export default function Debts() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<TaxDebt | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [adjLabel, setAdjLabel] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (status) params.set('status', status)
  if (q) params.set('q', q)

  const { data, isLoading } = useQuery({
    queryKey: ['debts', page, status, q],
    queryFn: () => apiGet<Page<TaxDebt>>(`/debts?${params.toString()}`),
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary-lite'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard/summary'),
  })

  const mutate = useMutation({
    mutationFn: ({ id, op, body }: { id: number; op: 'mark-overdue' | 'cancel' | 'adjustment' | 'in-collection'; body?: unknown }) => {
      if (op === 'mark-overdue') return apiPost(`/debts/${op}`)
      return apiPatch(`/debts/${id}/${op}`, body ?? {})
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected(null)
      setAdjLabel('')
      setAdjAmount('')
      toast.success(debtActionMessages[vars.op] ?? 'Créance mise à jour')
    },
  })

  const pay = useMutation({
    mutationFn: (payload: { debtId: number; amount: number; paymentDate: string; method: string }) =>
      apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPaymentOpen(false)
      setPayAmount('')
      toast.success('Paiement enregistré')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créances fiscales"
        subtitle="Suivi des impayés et actions de recouvrement"
        actions={
          <Button variant="secondary" onClick={() => mutate.mutate({ id: 0, op: 'mark-overdue' })} disabled={mutate.isPending}>
            <AlertTriangle className="h-4 w-4" /> Détecter les impayés
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total créances" value={summary ? fmtMGA(summary.totalDebts) : '—'} icon={<TrendingDown className="h-5 w-5" />} tone="brand" sub="toutes périodes" />
        <StatCard label="Encours" value={summary ? fmtMGA(summary.totalOutstanding) : '—'} icon={<TrendingDown className="h-5 w-5" />} tone="amber" sub="non recouvré" />
        <StatCard label="En retard" value={summary ? fmtMGA(summary.overdueBalance) : '—'} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" sub={`${summary?.overdueCount ?? '—'} créance(s)`} />
        <StatCard label="Résultats affichés" value={data?.totalElements ?? '—'} icon={<Wallet className="h-5 w-5" />} tone="sky" sub="selon les filtres" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); setPage(0) }}
            placeholder="Rechercher par référence, NIF ou nom…"
            className="min-w-56 flex-1"
          />
          <div className="w-48">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              <option value="OPEN">Ouverte</option>
              <option value="OVERDUE">En retard</option>
              <option value="IN_COLLECTION">Recouvrement</option>
              <option value="PAID">Payée</option>
              <option value="CANCELLED">Annulée</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune créance" subtitle="Modifiez vos critères de recherche." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Impôt</Th>
                  <Th>Période</Th>
                  <Th>Total</Th>
                  <Th>Payé</Th>
                  <Th>Solde</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((d) => (
                  <tr key={d.id} className="transition hover:bg-slate-50/60">
                    <Td className="font-mono text-brand-700">{d.reference}</Td>
                    <Td className="max-w-48 truncate">{d.taxpayerName}</Td>
                    <Td>{d.taxTypeCode}</Td>
                    <Td>{d.period}</Td>
                    <Td className="font-medium">{fmtMGA(d.totalAmount)}</Td>
                    <Td>{fmtMGA(d.paidAmount)}</Td>
                    <Td className="font-medium text-amber-700">{fmtMGA(d.balance)}</Td>
                    <Td>{fmtDate(d.dueDate)}</Td>
                    <Td>
                      <StatusBadge value={d.status} />
                    </Td>
                    <Td>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(d)}>
                        <Eye className="h-4 w-4" /> Détail
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Créance ${selected?.reference ?? ''}`} wide>
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Contribuable">
                <div className="text-sm font-medium">{selected.taxpayerName}</div>
              </Field>
              <Field label="Impôt / Période">
                <div className="text-sm">{selected.taxTypeCode} · {selected.period}</div>
              </Field>
              <Field label="Imposition">
                <div className="text-sm font-mono">{selected.assessmentReference}</div>
              </Field>
              <Field label="Statut">
                <StatusBadge value={selected.status} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Composantes</p>
              <Table>
                <tbody className="divide-y divide-slate-100">
                  {selected.items.map((it) => (
                    <tr key={it.id}>
                      <Td className="w-40">{itemLabels[it.kind] ?? it.kind}</Td>
                      <Td>{it.label}</Td>
                      <Td className="text-right font-medium">{fmtMGA(it.amount)}</Td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-semibold">
                    <Td>Total</Td>
                    <Td></Td>
                    <Td className="text-right">{fmtMGA(selected.totalAmount)}</Td>
                  </tr>
                  <tr>
                    <Td>Solde restant</Td>
                    <Td></Td>
                    <Td className={`text-right font-semibold ${selected.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {fmtMGA(selected.balance)}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>
            {mutate.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(mutate.error)}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.status !== 'PAID' && selected.status !== 'CANCELLED' && (
                <Button onClick={() => { setSelected(selected); setPaymentOpen(true) }}>
                  <Wallet className="h-4 w-4" /> Encaisser un paiement
                </Button>
              )}
              {selected.status !== 'CANCELLED' && (
                <Button variant="secondary" onClick={() => mutate.mutate({ id: selected.id, op: 'cancel' })} disabled={mutate.isPending}>
                  Annuler la créance
                </Button>
              )}
              {selected.status === 'OVERDUE' && (
                <Button variant="secondary" onClick={() => mutate.mutate({ id: selected.id, op: 'in-collection' })} disabled={mutate.isPending}>
                  Passer en recouvrement
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
              <div className="min-w-40 flex-1">
                <Field label="Libellé d’ajustement">
                  <Input value={adjLabel} onChange={(e) => setAdjLabel(e.target.value)} placeholder="ex : Remise gracieuse" />
                </Field>
              </div>
              <div className="w-40">
                <Field label="Montant (MGA)">
                  <Input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
                </Field>
              </div>
              <Button
                variant="secondary"
                disabled={!adjLabel || !adjAmount || mutate.isPending}
                onClick={() =>
                  mutate.mutate({ id: selected.id, op: 'adjustment', body: { label: adjLabel, amount: Number(adjAmount) } })
                }
              >
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Enregistrer un paiement">
        {selected && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              pay.mutate({ debtId: selected.id, amount: Number(payAmount), paymentDate: new Date().toISOString().slice(0, 10), method: payMethod })
            }}
            className="space-y-4"
          >
            {pay.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(pay.error)}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              Solde de la créance : <strong>{fmtMGA(selected.balance)}</strong>
            </div>
            <Field label="Montant (MGA)">
              <Input type="number" min="1" max={selected.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </Field>
            <Field label="Mode de paiement">
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pay.isPending || !payAmount}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
