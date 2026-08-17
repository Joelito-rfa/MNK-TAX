import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  Phone,
  ScrollText,
  Search,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type {
  CollectionDebtRow,
  CollectionHistory,
  CollectionStats,
  Page,
  TaxType,
} from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

const actionTypeLabels: Record<string, string> = {
  PHONE_CONTACT: 'Relance téléphonique',
  SMS: 'Relance SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  PAYMENT_RECORD: 'Enregistrement paiement',
  NOTE: 'Note',
  FOLLOW_UP: 'Prochaine action',
  REMINDER: 'Relance',
  VISIT: 'Visite',
  SEIZURE: 'Saisie',
}

const collectionStatusConfig: Record<string, { label: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'rose' | 'slate' }> = {
  PAYE: { label: 'Payé', tone: 'green' },
  EN_ATTENTE: { label: 'En attente', tone: 'amber' },
  RELANCE_EN_COURS: { label: 'Relance en cours', tone: 'blue' },
  EN_RETARD: { label: 'En retard', tone: 'red' },
  MISE_EN_DEMEURE: { label: 'Mise en demeure', tone: 'violet' },
  CONTENTIEUX: { label: 'Contentieux', tone: 'rose' },
  ANNULE: { label: 'Annulé', tone: 'slate' },
}

const filterTabs = [
  { id: '', label: 'Tous les dossiers' },
  { id: 'OVERDUE', label: 'En retard' },
  { id: 'TO_RECOVER', label: 'À recouvrer' },
  { id: 'IN_REMINDER', label: 'Relance en cours' },
  { id: 'IN_COLLECTION', label: 'Mise en demeure' },
  { id: 'PAID', label: 'Payé' },
]

function CollectionStatusBadge({ status }: { status: string }) {
  const cfg = collectionStatusConfig[status]
  if (!cfg) return <Badge tone="slate">{status}</Badge>
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>
}

export default function Collection() {
  const [page, setPage] = useState(0)
  const [activeTab, setActiveTab] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')

  const [actionOpen, setActionOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDebtId, setHistoryDebtId] = useState<number | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<CollectionDebtRow | null>(null)

  const queryClient = useQueryClient()
  const toast = useToast()

  const buildParams = (extra?: Record<string, string>) => {
    const p = new URLSearchParams({ page: String(page), size: '20' })
    if (activeTab) {
      if (activeTab === 'TO_RECOVER') {
        p.set('status', 'ISSUED')
      } else if (activeTab === 'IN_REMINDER') {
        p.set('status', 'PARTIALLY_PAID')
      } else {
        p.set('status', activeTab)
      }
    }
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    return p.toString()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['collection-debts', page, activeTab, searchQ, taxTypeFilter, periodFilter],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${buildParams()}`),
  })

  const { data: stats } = useQuery({
    queryKey: ['collection-stats', activeTab, searchQ, taxTypeFilter, periodFilter],
    queryFn: () => apiGet<CollectionStats>(`/collection/stats?${buildParams()}`),
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const { data: history } = useQuery({
    queryKey: ['collection-history', historyDebtId],
    queryFn: () => apiGet<CollectionHistory>(`/collection/history/${historyDebtId}`),
    enabled: historyOpen && historyDebtId !== null,
  })

  const [actionForm, setActionForm] = useState({
    debtId: '',
    type: 'PHONE_CONTACT',
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  })

  const createAction = useMutation({
    mutationFn: () =>
      apiPost('/collection/actions', {
        debtId: Number(actionForm.debtId),
        type: actionForm.type,
        description: actionForm.description,
        actionDate: actionForm.actionDate,
        outcome: actionForm.outcome || undefined,
        nextAction: actionForm.nextAction || undefined,
        nextActionDate: actionForm.nextActionDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
      setActionOpen(false)
      resetActionForm()
      toast.success('Action de recouvrement enregistrée')
    },
  })

  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })

  const registerPayment = useMutation({
    mutationFn: () =>
      apiPost('/collection/payment', {
        debtId: selectedDebt!.id,
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        method: payForm.method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
      setPaymentOpen(false)
      setSelectedDebt(null)
      setPayForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'CASH' })
      toast.success('Paiement enregistré')
    },
  })

  function resetActionForm() {
    setActionForm({
      debtId: '',
      type: 'PHONE_CONTACT',
      description: '',
      actionDate: new Date().toISOString().slice(0, 10),
      outcome: '',
      nextAction: '',
      nextActionDate: '',
    })
  }

  const uniquePeriods = (() => {
    const set = new Set<string>()
    data?.content.forEach((d) => set.add(d.period))
    return Array.from(set).sort().reverse()
  })()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recouvrement"
        subtitle="Suivi des créances fiscales, relances et actions de recouvrement"
        actions={
          <Button onClick={() => setActionOpen(true)}>
            <Phone className="h-4 w-4" /> Nouvelle action
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Taux de recouvrement"
          value={stats ? `${stats.collectionRate.toFixed(2)} %` : '—'}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="brand"
          sub="montant encaissé / exigible"
        />
        <StatCard
          label="Encaissé"
          value={stats ? fmtMGA(stats.totalCollected) : '—'}
          icon={<Wallet className="h-5 w-5" />}
          tone="emerald"
          sub="toutes périodes"
        />
        <StatCard
          label="Restant dû"
          value={stats ? fmtMGA(stats.totalOutstanding) : '—'}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="rose"
          sub="solde impayé"
        />
        <StatCard
          label="Actions recensées"
          value={stats?.actionCount ?? '—'}
          icon={<ScrollText className="h-5 w-5" />}
          tone="sky"
          sub="toutes actions confondues"
        />
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 pt-4">
          <div className="flex flex-wrap gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(0) }}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(0) }}
              placeholder="Rechercher par NIF, nom ou référence…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
          <div className="w-48">
            <Select value={taxTypeFilter} onChange={(e) => { setTaxTypeFilter(e.target.value); setPage(0) }}>
              <option value="">Tous les impôts</option>
              {taxTypes?.map((tt) => (
                <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPage(0) }}>
              <option value="">Toutes périodes</option>
              {uniquePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
        </div>

        <div
          key={`${activeTab}|${taxTypeFilter}|${periodFilter}|${page}`}
          className="animate-page-in"
        >
          {isLoading ? (
            <Spinner />
          ) : !data || data.content.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title="Aucune créance en recouvrement"
              subtitle="Modifiez vos critères de recherche ou créez une nouvelle action."
            />
          ) : (
            <>
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr>
                    <Th>Réf. créance</Th>
                    <Th>NIF</Th>
                    <Th>Contribuable</Th>
                    <Th>Impôt</Th>
                    <Th>Exercice</Th>
                    <Th>Montant dû</Th>
                    <Th>Payé</Th>
                    <Th>Reste</Th>
                    <Th>Échéance</Th>
                    <Th>Dernière action</Th>
                    <Th>Prochaine action</Th>
                    <Th>Statut</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.content.map((d) => (
                    <tr key={d.id} className="transition hover:bg-slate-50/60">
                      <Td className="font-mono text-brand-700">{d.reference}</Td>
                      <Td className="font-mono text-xs">{d.nif}</Td>
                      <Td className="max-w-40 truncate">{d.taxpayerName}</Td>
                      <Td>{d.taxTypeCode}</Td>
                      <Td>{d.period}</Td>
                      <Td className="font-medium">{fmtMGA(d.totalAmount)}</Td>
                      <Td>{fmtMGA(d.paidAmount)}</Td>
                      <Td className={`font-medium ${d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {fmtMGA(d.balance)}
                      </Td>
                      <Td>{fmtDate(d.dueDate)}</Td>
                      <Td className="max-w-40 truncate text-xs text-slate-500">
                        {d.lastAction || '—'}
                      </Td>
                      <Td className="max-w-40 truncate text-xs">
                        {d.nextAction ? (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3 text-sky-500" />
                            {d.nextAction}
                          </span>
                        ) : '—'}
                      </Td>
                      <Td>
                        <CollectionStatusBadge status={d.collectionStatus} />
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setHistoryDebtId(d.id); setHistoryOpen(true) }}
                          >
                            <ScrollText className="h-4 w-4" />
                          </Button>
                          {d.collectionStatus !== 'PAYE' && d.collectionStatus !== 'ANNULE' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedDebt(d); setPaymentOpen(true) }}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </Card>

      <Modal open={actionOpen} onClose={() => setActionOpen(false)} title="Nouvelle action de recouvrement" wide>
        <form
          onSubmit={(e) => { e.preventDefault(); createAction.mutate() }}
          className="space-y-4"
        >
          {createAction.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(createAction.error)}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Créance (ID)">
              <Input
                type="number"
                placeholder="ex : 2"
                value={actionForm.debtId}
                onChange={(e) => setActionForm({ ...actionForm, debtId: e.target.value })}
              />
            </Field>
            <Field label="Type d'action">
              <Select
                value={actionForm.type}
                onChange={(e) => setActionForm({ ...actionForm, type: e.target.value })}
              >
                {Object.entries(actionTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Input
              value={actionForm.description}
              onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              placeholder="ex : Relance téléphonique du contribuable"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date de l'action">
              <Input
                type="date"
                value={actionForm.actionDate}
                onChange={(e) => setActionForm({ ...actionForm, actionDate: e.target.value })}
              />
            </Field>
            <Field label="Résultat (facultatif)">
              <Input
                value={actionForm.outcome}
                onChange={(e) => setActionForm({ ...actionForm, outcome: e.target.value })}
                placeholder="ex : Promesse de paiement"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prochaine action (facultatif)">
              <Input
                value={actionForm.nextAction}
                onChange={(e) => setActionForm({ ...actionForm, nextAction: e.target.value })}
                placeholder="ex : Relance dans 7 jours"
              />
            </Field>
            <Field label="Date prochaine action">
              <Input
                type="date"
                value={actionForm.nextActionDate}
                onChange={(e) => setActionForm({ ...actionForm, nextActionDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setActionOpen(false)}>Annuler</Button>
            <Button
              type="submit"
              disabled={createAction.isPending || !actionForm.debtId || !actionForm.description}
            >
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Enregistrer un paiement">
        {selectedDebt && (
          <form
            onSubmit={(e) => { e.preventDefault(); registerPayment.mutate() }}
            className="space-y-4"
          >
            {registerPayment.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(registerPayment.error)}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              Créance : <strong className="font-mono">{selectedDebt.reference}</strong> — Solde restant : <strong>{fmtMGA(selectedDebt.balance)}</strong>
            </div>
            <Field label="Montant (MGA)">
              <Input
                type="number"
                min="1"
                max={selectedDebt.balance}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date de paiement">
                <Input
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                />
              </Field>
              <Field label="Mode de paiement">
                <Select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                  <option value="CASH">Espèces</option>
                  <option value="BANK_TRANSFER">Virement</option>
                  <option value="CHECK">Chèque</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={registerPayment.isPending || !payForm.amount}>Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Historique de recouvrement" wide>
        {history ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Actions ({history.actions.length})</p>
              {history.actions.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune action.</p>
              ) : (
                <ul className="space-y-2">
                  {history.actions.map((a) => (
                    <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{actionTypeLabels[a.type] ?? a.type}</span>
                        <span className="text-xs text-slate-500">{fmtDate(a.actionDate)}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{a.description}</p>
                      {a.outcome && <p className="text-xs text-emerald-700">Résultat : {a.outcome}</p>}
                      {a.nextAction && (
                        <p className="mt-0.5 text-xs text-sky-600">
                          Prochaine action : {a.nextAction}
                          {a.nextActionDate && ` — ${fmtDate(a.nextActionDate)}`}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Mises en demeure ({history.notices.length})</p>
              {history.notices.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune mise en demeure.</p>
              ) : (
                <ul className="space-y-2">
                  {history.notices.map((n) => (
                    <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{n.noticeNumber}</span>
                        <span className="text-xs text-slate-500">{fmtDate(n.noticeDate)}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{n.content || n.noticeType}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <Spinner />
        )}
      </Modal>
    </div>
  )
}
