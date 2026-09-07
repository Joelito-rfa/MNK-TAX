import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, FileWarning, History, Info, Pause, Play, ScrollText, Send, Wallet, XCircle } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import { fmtDate, fmtMGA, timeAgo } from '../lib/format'
import type { CollectionAction, CollectionHistory, CollectionNotice, DebtCollectionPriority, DebtHistoryEntry, Page, Payment, TaxDebt } from '../types'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Spinner, StatusBadge, Table, Td, Textarea, Th } from '../components/ui'
import { useToast } from '../components/Toast'

const itemLabels: Record<string, string> = {
  PRINCIPAL: 'Principal',
  PENALTY: 'Pénalité',
  INTEREST: 'Intérêt',
  ADJUSTMENT: 'Ajustement',
  CREDIT: 'Crédit',
}

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

const actionTypeLabels: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique',
  SMS: 'SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  PAYMENT_RECORD: 'Paiement',
  NOTE: 'Note interne',
  FOLLOW_UP: 'Relance',
  REMINDER: 'Rappel',
  VISIT: 'Visite sur place',
  SEIZURE: 'Saisie',
  ADMINISTRATIVE_ACTION: 'Action administrative',
  OTHER: 'Autre',
}

const originLabels: Record<string, string> = {
  ASSESSMENT: 'Imposition',
  DECLARATION: 'Déclaration',
  AUDIT: 'Audit',
  CONTROL: 'Contrôle',
  RECOVERY: 'Recouvrement',
  OTHER: 'Autre',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
}

const historyEventTypeLabels: Record<string, string> = {
  CREATED: 'Création',
  STATUS_CHANGE: 'Changement de statut',
  PAYMENT_RECEIVED: 'Paiement reçu',
  PENALTY_APPLIED: 'Pénalité appliquée',
  INTEREST_APPLIED: 'Intérêts appliqués',
  ADJUSTMENT: 'Ajustement',
  IN_COLLECTION: 'Recouvrement forcé',
  CANCELLED: 'Annulation',
  SUSPENDED: 'Suspension',
  RESUMED: 'Réactivation',
  CLOSED: 'Clôture',
  PRIORITY_CHANGED: 'Priorité modifiée',
  OBSERVATIONS_UPDATED: 'Observations mises à jour',
}

type DetailTab = 'synthese' | 'origine' | 'paiements' | 'recouvrement' | 'historique'

export default function DebtDetail() {
  const { id } = useParams<{ id: string }>()
  const debtId = Number(id)
  const [tab, setTab] = useState<DetailTab>('synthese')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeType, setNoticeType] = useState('MISE_EN_DEMEURE')
  const [noticeContent, setNoticeContent] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [adjLabel, setAdjLabel] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [observations, setObservations] = useState('')
  const [obsEditing, setObsEditing] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: debt, isLoading } = useQuery({
    queryKey: ['debt', debtId],
    queryFn: () => apiGet<TaxDebt>(`/debts/${debtId}`),
    enabled: !!debtId,
  })

  const { data: debtHistory } = useQuery({
    queryKey: ['debt-history', debtId],
    queryFn: () => apiGet<DebtHistoryEntry[]>(`/debts/${debtId}/history`),
    enabled: !!debtId,
  })

  const { data: collectionHistory } = useQuery({
    queryKey: ['debt-collection-history', debtId],
    queryFn: () => apiGet<CollectionHistory>(`/collection/history/${debtId}`),
    enabled: !!debtId,
  })

  const { data: payments } = useQuery({
    queryKey: ['debt-payments', debtId],
    queryFn: () => apiGet<Page<Payment>>(`/payments?debtId=${debtId}&size=50`),
    enabled: !!debtId,
  })

  const mutate = useMutation({
    mutationFn: ({ op, body }: { op: 'cancel' | 'in-collection' | 'adjustment'; body?: unknown }) =>
      apiPatch(`/debts/${debtId}/${op}`, body ?? {}),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (vars.op === 'cancel') toast.success('Créance annulée')
      else if (vars.op === 'in-collection') toast.success('Créance envoyée en recouvrement')
      else {
        setAdjLabel('')
        setAdjAmount('')
        toast.success('Ajustement enregistré')
      }
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const pay = useMutation({
    mutationFn: (payload: { debtId: number; amount: number; paymentDate: string; method: string }) =>
      apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-payments', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPaymentOpen(false)
      setPayAmount('')
      toast.success('Paiement enregistré')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const sendNotice = useMutation({
    mutationFn: (payload: { debtId: number; noticeType: string; content: string }) =>
      apiPost('/collection/notices', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-collection-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setNoticeOpen(false)
      toast.success('Mise en demeure émise')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const suspendMutation = useMutation({
    mutationFn: (reason?: string) => apiPatch(`/debts/${debtId}/suspend`, reason ? { reason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Créance suspendue')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const resumeMutation = useMutation({
    mutationFn: () => apiPatch(`/debts/${debtId}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Créance réactivée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const closeMutation = useMutation({
    mutationFn: (reason?: string) => apiPatch(`/debts/${debtId}/close`, reason ? { reason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Créance clôturée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const updateObsMutation = useMutation({
    mutationFn: (obs: string) => apiPatch(`/debts/${debtId}/observations`, { observations: obs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      setObsEditing(false)
      toast.success('Observations mises à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: DebtCollectionPriority) => apiPatch(`/debts/${debtId}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      queryClient.invalidateQueries({ queryKey: ['debt-history', debtId] })
      toast.success('Priorité modifiée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  if (isLoading) return <Card className="p-8"><Spinner /></Card>
  if (!debt) return <Card className="p-8"><EmptyState title="Créance introuvable" /></Card>

  const canAct = !['PAID', 'CANCELLED', 'CLOSED'].includes(debt.status)
  const canSuspend = canAct && debt.status !== 'SUSPENDED'
  const canResume = debt.status === 'SUSPENDED'
  const actions = collectionHistory?.actions ?? []
  const notices = collectionHistory?.notices ?? []
  const paymentsList = payments?.content ?? []
  const historyEntries = debtHistory ?? []

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/debts" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
            <ChevronLeft className="h-4 w-4" /> Créances
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <span className="font-mono">{debt.reference}</span>
            <StatusBadge value={debt.status} />
            <Badge tone={debt.collectionPriority === 'URGENT' ? 'rose' : debt.collectionPriority === 'HIGH' ? 'amber' : 'slate'}>
              {priorityLabels[debt.collectionPriority] ?? debt.collectionPriority}
            </Badge>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {debt.taxTypeCode} · Période {debt.period} · {originLabels[debt.origin] ?? debt.origin} —{' '}
            <Link to={`/taxpayers/${debt.taxpayerId}`} className="font-medium text-brand-700 hover:underline">
              {debt.taxpayerName}
            </Link>{' '}
            ({debt.nif}) {debt.taxpayerCenter ? `· Centre ${debt.taxpayerCenter}` : ''}
          </p>
          {debt.daysOverdue > 0 && (
            <p className="mt-0.5 text-sm font-medium text-red-600">
              En retard de {debt.daysOverdue} jour(s)
            </p>
          )}
        </div>
        {canAct && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setNoticeOpen(true)}>
              <FileWarning className="h-4 w-4" /> Mise en demeure
            </Button>
            <Button onClick={() => setPaymentOpen(true)}>
              <Wallet className="h-4 w-4" /> Encaisser
            </Button>
            {canSuspend && (
              <Button variant="secondary" onClick={() => suspendMutation.mutate(undefined)} disabled={suspendMutation.isPending}>
                <Pause className="h-4 w-4" /> Suspendre
              </Button>
            )}
            {debt.status === 'OVERDUE' && (
              <Button variant="secondary" onClick={() => mutate.mutate({ op: 'in-collection' })} disabled={mutate.isPending}>
                <ScrollText className="h-4 w-4" /> Recouvrement
              </Button>
            )}
            <Button variant="danger" onClick={() => closeMutation.mutate(undefined)} disabled={closeMutation.isPending}>
              <XCircle className="h-4 w-4" /> Clôturer
            </Button>
          </div>
        )}
        {canResume && (
          <Button onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
            <Play className="h-4 w-4" /> Réactiver
          </Button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        {([
          { id: 'synthese' as const, label: 'Synthèse', icon: <Wallet className="h-4 w-4" /> },
          { id: 'origine' as const, label: 'Origine', icon: <Info className="h-4 w-4" /> },
          { id: 'paiements' as const, label: `Paiements (${paymentsList.length})`, icon: <Wallet className="h-4 w-4" /> },
          { id: 'recouvrement' as const, label: `Recouvrement (${actions.length + notices.length})`, icon: <ScrollText className="h-4 w-4" /> },
          { id: 'historique' as const, label: `Historique (${historyEntries.length})`, icon: <History className="h-4 w-4" /> },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'tab-active' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Synthèse */}
      {tab === 'synthese' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Composantes de la créance" subtitle="Détail du principal, pénalités et intérêts" />
            <div className="px-5 py-4">
              <Table>
                <tbody className="divide-y divide-slate-100">
                  {debt.items.map((it) => (
                    <tr key={it.id}>
                      <Td className="w-40">
                        <Badge tone={it.kind === 'PENALTY' ? 'amber' : it.kind === 'INTEREST' ? 'rose' : 'slate'}>
                          {itemLabels[it.kind] ?? it.kind}
                        </Badge>
                      </Td>
                      <Td>{it.label}</Td>
                      <Td className="text-right font-medium">{fmtMGA(it.amount)}</Td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                    <Td>Total</Td>
                    <Td></Td>
                    <Td className="text-right">{fmtMGA(debt.totalAmount)}</Td>
                  </tr>
                  <tr>
                    <Td>Déjà payé</Td>
                    <Td></Td>
                    <Td className="text-right font-medium text-emerald-700">{fmtMGA(debt.paidAmount)}</Td>
                  </tr>
                  <tr>
                    <Td>Solde restant</Td>
                    <Td></Td>
                    <Td className={`text-right font-semibold ${debt.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {fmtMGA(debt.balance)}
                    </Td>
                  </tr>
                </tbody>
              </Table>

              {canAct && (
                <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                  <div className="min-w-40 flex-1">
                    <Field label="Libellé d'ajustement">
                      <Input value={adjLabel} onChange={(e) => setAdjLabel(e.target.value)} placeholder="ex : Remise gracieuse" />
                    </Field>
                  </div>
                  <div className="w-40">
                    <Field label="Montant (MGA)">
                      <Input type="number" min="0" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
                    </Field>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!adjLabel || !adjAmount || mutate.isPending}
                    onClick={() => mutate.mutate({ op: 'adjustment', body: { label: adjLabel, amount: Number(adjAmount) } })}
                  >
                    Appliquer
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Informations" subtitle="Caractéristiques de la créance" />
            <dl className="divide-y divide-slate-100 px-5">
              <InfoRow label="Contribuable" value={debt.taxpayerName} />
              <InfoRow label="NIF" value={debt.nif} />
              <InfoRow label="Centre fiscal" value={debt.taxpayerCenter ?? '—'} />
              <InfoRow label="Impôt" value={`${debt.taxTypeCode} — ${debt.period}`} />
              <InfoRow label="Imposition" value={debt.assessmentReference} mono />
              <InfoRow label="Émise le" value={fmtDate(debt.issueDate)} />
              <InfoRow label="Échéance" value={fmtDate(debt.dueDate)} />
              {debt.daysOverdue > 0 && <InfoRow label="Jours retard" value={`${debt.daysOverdue} jour(s)`} />}
              <InfoRow label="Créée par" value={debt.createdBy ?? '—'} />
              {debt.closedAt && <InfoRow label="Clôturée le" value={fmtDate(debt.closedAt)} />}
              {debt.suspendedAt && <InfoRow label="Suspendue le" value={fmtDate(debt.suspendedAt)} />}
            </dl>
          </Card>
        </div>
      )}

      {/* Tab: Origine */}
      {tab === 'origine' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Origine de la créance" subtitle="Comment cette créance a-t-elle été générée" />
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Type d'origine</label>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{originLabels[debt.origin] ?? debt.origin}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Référence de l'imposition</label>
                <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{debt.assessmentReference}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Contribuable</label>
                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{debt.taxpayerName} (NIF {debt.nif})</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Priorité de recouvrement</label>
                <div className="mt-1">
                  <Select
                    value={debt.collectionPriority}
                    onChange={(e) => updatePriorityMutation.mutate(e.target.value as DebtCollectionPriority)}
                    disabled={updatePriorityMutation.isPending}
                  >
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="URGENT">Urgente</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Observations</label>
                {obsEditing ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Notes sur l'origine, le contexte…"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateObsMutation.mutate(observations)} disabled={updateObsMutation.isPending}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setObsEditing(false)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-start gap-2">
                    <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{debt.observations || 'Aucune observation'}</p>
                    <button onClick={() => { setObservations(debt.observations ?? ''); setObsEditing(true) }}
                      className="text-xs text-brand-600 hover:underline">
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Montants" subtitle="Détail financier" />
            <div className="px-5 py-4">
              <dl className="space-y-3">
                <AmountRow label="Principal" value={debt.principalAmount} />
                <AmountRow label="Pénalités" value={debt.penaltyAmount} tone="amber" />
                <AmountRow label="Intérêts" value={debt.interestAmount} tone="rose" />
                <AmountRow label="Ajustements" value={debt.adjustmentsAmount} tone="slate" />
                <AmountRow label="Crédits" value={debt.creditsAmount} tone="emerald" />
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <AmountRow label="Total" value={debt.totalAmount} bold />
                </div>
                <AmountRow label="Payé" value={debt.paidAmount} tone="emerald" />
                <AmountRow label="Solde" value={debt.balance} bold tone={debt.balance > 0 ? 'amber' : 'emerald'} />
              </dl>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Paiements */}
      {tab === 'paiements' && (
        <Card>
          <CardHeader title="Paiements affectés" subtitle={`${paymentsList.length} paiement(s)`} />
          {paymentsList.length === 0 ? (
            <EmptyState icon={<Wallet className="h-8 w-8" />} title="Aucun paiement" subtitle="Les encaissements affectés à cette créance apparaîtront ici." />
          ) : (
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <Th>Référence</Th>
                  <Th>Date</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Alloué</Th>
                  <Th>Statut</Th>
                  <Th>Quittance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {paymentsList.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                    <Td className="font-mono text-brand-700">{p.reference}</Td>
                    <Td>{fmtDate(p.paymentDate)}</Td>
                    <Td className="font-medium">{fmtMGA(p.amount)}</Td>
                    <Td>{methodLabels[p.method] ?? p.method}</Td>
                    <Td>{fmtMGA(p.allocatedAmount)}</Td>
                    <Td><StatusBadge value={p.status} /></Td>
                    <Td>{p.receiptReference ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Tab: Recouvrement */}
      {tab === 'recouvrement' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Actions de recouvrement" subtitle={`${actions.length} action(s)`} />
            <div className="px-5 py-4">
              {actions.length === 0 ? (
                <EmptyState icon={<ScrollText className="h-8 w-8" />} title="Aucune action de recouvrement" />
              ) : (
                <div className="space-y-3">
                  {actions.map((a) => (
                    <ActionRow key={a.id} action={a} />
                  ))}
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Mises en demeure" subtitle={`${notices.length} mise(s) en demeure`} />
            {notices.length === 0 ? (
              <EmptyState icon={<FileWarning className="h-8 w-8" />} title="Aucune mise en demeure" />
            ) : (
              <Table>
                <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <Th>N°</Th>
                    <Th>Type</Th>
                    <Th>Date</Th>
                    <Th>Statut</Th>
                    <Th>Contenu</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {notices.map((n) => (
                    <NoticeRow key={n.id} notice={n} />
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Historique */}
      {tab === 'historique' && (
        <Card>
          <CardHeader title="Chronologie des événements" subtitle={`${historyEntries.length} événement(s)`} />
          <div className="px-5 py-4">
            {historyEntries.length === 0 ? (
              <EmptyState icon={<History className="h-8 w-8" />} title="Aucun événement" />
            ) : (
              <div className="space-y-3">
                {historyEntries.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                      <History className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {historyEventTypeLabels[h.eventType] ?? h.eventType}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(h.eventDate)}</span>
                        {h.performedBy && (
                          <Badge tone="slate">{h.performedBy}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{h.description}</p>
                      {h.oldValue && h.newValue && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {h.oldValue} → {h.newValue}
                        </p>
                      )}
                      {h.newValue && !h.oldValue && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{h.newValue}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Modal mise en demeure */}
      <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Émettre une mise en demeure" subtitle={`${debt.reference} — ${debt.taxpayerName}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendNotice.mutate({ debtId, noticeType: noticeType, content: noticeContent })
          }}
          className="space-y-4"
        >
          {sendNotice.isError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {apiErrorMessage(sendNotice.error)}
            </div>
          )}
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Solde restant : <strong>{fmtMGA(debt.balance)}</strong> — échéance le {fmtDate(debt.dueDate)}.
          </div>
          <Field label="Type de mise en demeure">
            <Select value={noticeType} onChange={(e) => setNoticeType(e.target.value)}>
              <option value="RELANCE_AMICALE">Relance amicale</option>
              <option value="MISE_EN_DEMEURE">Mise en demeure</option>
              <option value="AVIS_AVANT_SAISIE">Avis avant saisie</option>
              <option value="CONTRAINTE">Contrainte</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </Field>
          <Field label="Contenu (optionnel)">
            <Textarea
              rows={4}
              placeholder="Rappel du montant dû, délai de régularisation…"
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setNoticeOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={sendNotice.isPending}>
              <Send className="h-4 w-4" /> {sendNotice.isPending ? 'Émission…' : 'Émettre'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal paiement */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Encaisser un paiement">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            pay.mutate({ debtId, amount: Number(payAmount), paymentDate: new Date().toISOString().slice(0, 10), method: payMethod })
          }}
          className="space-y-4"
        >
          {pay.isError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {apiErrorMessage(pay.error)}
            </div>
          )}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm">
            Solde de la créance : <strong>{fmtMGA(debt.balance)}</strong>
          </div>
          <Field label="Montant (MGA)">
            <Input type="number" min="1" max={debt.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
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
            <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={pay.isPending || !payAmount}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function AmountRow({ label, value, bold = false, tone = 'slate' }: { label: string; value: number; bold?: boolean; tone?: string }) {
  const toneClass = tone === 'amber' ? 'text-amber-700' : tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="flex justify-between gap-4">
      <dt className={`text-sm ${bold ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{label}</dt>
      <dd className={`text-right text-sm font-medium ${toneClass}`}>{fmtMGA(value)}</dd>
    </div>
  )
}

function ActionRow({ action }: { action: CollectionAction }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
        <ScrollText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{actionTypeLabels[action.type] ?? action.type}</span>
          <Badge tone={action.status === 'DONE' ? 'green' : action.status === 'PLANNED' ? 'blue' : 'slate'}>{action.status}</Badge>
          <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(action.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{action.description}</p>
        {action.outcome && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Résultat : {action.outcome}</p>}
        {action.nextAction && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700">
            <AlertTriangle className="h-3 w-3" /> Prochaine action : {action.nextAction}
            {action.nextActionDate ? ` — ${fmtDate(action.nextActionDate)}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

function NoticeRow({ notice }: { notice: CollectionNotice }) {
  return (
    <tr className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
      <Td className="font-mono text-brand-700">{notice.noticeNumber}</Td>
      <Td>{notice.noticeType}</Td>
      <Td>{fmtDate(notice.noticeDate)}</Td>
      <Td><StatusBadge value={notice.status} /></Td>
      <Td className="max-w-md truncate text-slate-500 dark:text-slate-400">{notice.content || '—'}</Td>
    </tr>
  )
}
