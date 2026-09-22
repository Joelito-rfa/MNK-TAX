import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote, CheckCircle2, HandCoins, XCircle, Pencil, Trash2, Eye, CalendarClock, Filter, RotateCcw } from 'lucide-react'
import { apiDelete, apiErrorMessage, apiPatch, apiPost } from '../lib/api'
import { fmtDateTime, fmtDate, fmtMGA, fmtNumber } from '../lib/format'
import { useAuth } from '../lib/auth'
import { refundKeys } from '../features/refund/api/keys'
import { useRefundDetail, useRefunds, useRefundStats, useTaxpayersRef } from '../features/refund/api/queries'
import { useRefundFilters } from '../features/refund/hooks/useRefundFilters'
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
  SearchInput,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import RowActionPortal from '../components/RowActionPortal'

export const refundReasonLabels: Record<string, string> = {
  VAT_CREDIT: 'Crédit de TVA',
  OVERPAYMENT: 'Trop-perçu',
  OTHER: 'Autre',
}

export const refundStatusLabels: Record<string, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: 'En examen',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PAID: 'Payé',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

export default function Refunds() {
  const { can } = useAuth()
  const {
    setPage, size, setSize, q, setQ, status, setStatus,
    reason, setReason, taxpayerId, setTaxpayerId,
    dateFrom, setDateFrom, dateTo, setDateTo,
    minAmount, setMinAmount, maxAmount, setMaxAmount,
    showFilters, setShowFilters,
    buildParams, hasFilters, advancedFilterCount, resetFilters,
  } = useRefundFilters()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useRefunds(buildParams)
  const { data: taxpayers } = useTaxpayersRef(showFilters)
  const { data: stats } = useRefundStats()

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/refunds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all })
      toast.success('Remboursement supprimé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fx-page space-y-6">
      <PageHeader
        title="Remboursements"
        subtitle="Demandes de remboursement et suivi des versements"
        actions={
          can('REFUND_WRITE') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Banknote className="h-4 w-4" /> Demande de remboursement
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Demandes"
          value={fmtNumber(stats?.total ?? 0)}
          sub={stats ? `${stats.pending} en attente` : undefined}
          icon={<Banknote className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="En examen"
          value={fmtNumber(stats?.underReview ?? 0)}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Approuvés" value={fmtNumber(stats?.approved ?? 0)} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Payés"
          value={fmtNumber(stats?.paid ?? 0)}
          sub={stats ? `${stats.rejected} rejeté(s)` : undefined}
          icon={<HandCoins className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); setPage(0) }}
            placeholder="Rechercher par référence, NIF ou nom…"
            className="min-w-56 flex-1"
          />
          <div className="w-48">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              {Object.entries(refundStatusLabels).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </Select>
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-4 w-4" /> Filtres
            {advancedFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                {advancedFilterCount}
              </span>
            )}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" /> Réinitialiser
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800/30">
            <div className="w-48">
              <Field label="Motif">
                <Select value={reason} onChange={(e) => { setReason(e.target.value); setPage(0) }}>
                  <option value="">Tous les motifs</option>
                  {Object.entries(refundReasonLabels).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="w-64">
              <Field label="Contribuable">
                <Select value={taxpayerId} onChange={(e) => { setTaxpayerId(e.target.value); setPage(0) }}>
                  <option value="">Tous les contribuables</option>
                  {taxpayers?.content.map((t) => (
                    <option key={t.id} value={t.id}>{t.nif} — {t.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="w-40">
              <Field label="Demandé du">
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }} />
              </Field>
            </div>
            <div className="w-40">
              <Field label="Au">
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }} />
              </Field>
            </div>
            <div className="w-36">
              <Field label="Montant min">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(0) }}
                  placeholder="0"
                />
              </Field>
            </div>
            <div className="w-36">
              <Field label="Montant max">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={maxAmount}
                  onChange={(e) => { setMaxAmount(e.target.value); setPage(0) }}
                  placeholder="—"
                />
              </Field>
            </div>
          </div>
        )}

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title="Aucun remboursement"
            subtitle={
              hasFilters
                ? 'Aucun résultat pour ces critères. Élargissez la recherche ou réinitialisez les filtres.'
                : 'Aucune demande enregistrée pour le moment.'
            }
          />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Motif</Th>
                  <Th>Montant</Th>
                  <Th>Statut</Th>
                  <Th>Demandé le</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <Td className="font-mono font-medium text-brand-700">{r.reference}</Td>
                    <Td>
                      <Link to={`/taxpayers/${r.taxpayerId}`} className="hover:underline">
                        <span className="block max-w-44 truncate font-medium text-slate-800 dark:text-slate-200">{r.taxpayerName}</span>
                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500">{r.nif}</span>
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone="slate">{refundReasonLabels[r.reason] ?? r.reason}</Badge>
                    </Td>
                    <Td className="font-medium">{fmtMGA(r.amount)}</Td>
                    <Td>
                      <StatusBadge value={r.status} />
                    </Td>
                    <Td>{fmtDate(r.createdAt)}</Td>
<Td>
                        <RowActionPortal>
                                  <button
                                    onClick={() => {
                                      setDetailId(r.id)
                                    }}
                                   className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                 >
                                   <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le détail
                                 </button>
                                 {['PENDING', 'UNDER_REVIEW'].includes(r.status) && (
                                   <>
                                      <button
                                        onClick={() => {
                                          setEditId(r.id)
                                        }}
                                       className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                     >
                                       <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                                     </button>
                                      <button
                                        onClick={() => {
                                          setDetailId(r.id)
                                        }}
                                       className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                     >
                                       <CalendarClock className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Changer le statut
                                     </button>
                                     {r.status === 'PENDING' && (
                                       <>
                                         <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                          <button
                                            onClick={() => {
                                              if (confirm('Supprimer ce remboursement ?')) remove.mutate(r.id)
                                            }}
                                           className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                         >
                                           <Trash2 className="h-4 w-4 shrink-0" /> Supprimer
                                         </button>
                                       </>
                                     )}
                                   </>
                                  )}
                        </RowActionPortal>
                      </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={data.number}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              pageSize={size}
              onPageSizeChange={(n) => { setSize(n); setPage(0) }}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      {createOpen && (
        <CreateRefundModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: refundKeys.all })
          }}
        />
      )}
      {detailId != null && (
        <RefundDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: refundKeys.all })
          }}
        />
      )}
      {editId != null && (
        <EditRefundModal
          id={editId}
          onClose={() => {
            setEditId(null)
            queryClient.invalidateQueries({ queryKey: refundKeys.all })
          }}
        />
      )}
    </div>
  )
}

/* ──────────────────────── Création ──────────────────────── */

export function CreateRefundModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [taxpayerId, setTaxpayerId] = useState('')
  const [reason, setReason] = useState('VAT_CREDIT')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const toast = useToast()

  const { data: taxpayers, isLoading: loadingTaxpayers } = useTaxpayersRef()

  const create = useMutation({
    mutationFn: () =>
      apiPost('/refunds', {
        taxpayerId: Number(taxpayerId),
        reason,
        amount: Number(amount),
        description: description || null,
      }),
    onSuccess: () => {
      toast.success('Demande de remboursement créée')
      onClose()
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const selectedTp = taxpayers?.content.find((t) => String(t.id) === taxpayerId) ?? null
  return (
    <Modal open onClose={onClose} title={`Étape ${step + 1}/3 — Demande de remboursement`} size="full">
      <form onSubmit={(e) => { e.preventDefault(); if (step === 2) create.mutate() }} className="space-y-4">
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{apiErrorMessage(create.error)}</div>
        )}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Contribuable">
              <Select value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {loadingTaxpayers ? null : taxpayers?.content.map((t) => (
                  <option key={t.id} value={t.id}>{t.nif} — {t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Motif">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(refundReasonLabels).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Montant (MGA)">
              <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Justification de la demande" />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold">Récapitulatif</h4>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex justify-between"><span className="text-slate-500">Contribuable</span><span className="font-medium">{selectedTp ? `${selectedTp.name} (${selectedTp.nif})` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Motif</span><span className="font-medium">{refundReasonLabels[reason] ?? reason}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Montant</span><strong>{amount || '—'} MGA</strong></div>
              {description && <p className="text-slate-600 dark:text-slate-400">{description}</p>}
            </div>
          </div>
        )}
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>{step > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>← Précédent</Button>}</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            {step < 2 ? (
              <Button type="button" size="sm" className="bg-brand-600 text-white" disabled={step === 0 ? !taxpayerId : !amount || Number(amount) <= 0} onClick={() => setStep(step + 1)}>Suivant →</Button>
            ) : (
              <Button type="submit" disabled={create.isPending || !taxpayerId || !amount || Number(amount) <= 0}>{create.isPending ? 'Création…' : 'Créer'}</Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Modification ──────────────────────── */

export function EditRefundModal({ id, onClose }: { id: number; onClose: () => void }) {
  const toast = useToast()
  const { data, isLoading } = useRefundDetail(id)

  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!data) return
    setReason(data.reason)
    setAmount(String(data.amount))
    setDescription(data.description ?? '')
  }, [data])

  const update = useMutation({
    mutationFn: () =>
      apiPatch(`/refunds/${id}`, {
        reason,
        amount: Number(amount),
        description: description || null,
      }),
    onSuccess: () => {
      toast.success('Remboursement mis à jour')
      onClose()
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title="Modifier le remboursement" wide>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            update.mutate()
          }}
          className="space-y-4"
        >
          {update.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(update.error)}
            </div>
          )}
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-3 text-sm">
            <span className="font-mono font-medium text-brand-700">{data.reference}</span>
            <span className="ml-2 text-slate-500 dark:text-slate-400">
              {data.taxpayerName} ({data.nif})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Motif">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(refundReasonLabels).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Montant (MGA)">
              <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Justification de la demande" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={update.isPending || !amount || Number(amount) <= 0}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ──────────────────────── Détail + actions ──────────────────────── */

export function RefundDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [approve, setApprove] = useState(true)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  const [paymentReference, setPaymentReference] = useState('')

  const { data, isLoading } = useRefundDetail(id)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: refundKeys.detail(id) })
    queryClient.invalidateQueries({ queryKey: refundKeys.all })
  }

  const review = useMutation({
    mutationFn: () =>
      apiPatch(`/refunds/${id}/review`, {
        approve,
        approvedAmount: approve && approvedAmount ? Number(approvedAmount) : null,
        rejectionReason: !approve && rejectionReason ? rejectionReason : null,
      }),
    onSuccess: () => {
      refresh()
      setApprovedAmount('')
      setRejectionReason('')
      toast.success(approve ? 'Remboursement approuvé' : 'Remboursement rejeté')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const pay = useMutation({
    mutationFn: () =>
      apiPatch(`/refunds/${id}/pay`, {
        paymentMethod,
        paymentReference: paymentReference || null,
      }),
    onSuccess: () => {
      refresh()
      toast.success('Paiement du remboursement enregistré')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  if (isLoading || !data) {
    return (
      <Modal open onClose={onClose} title="Détail du remboursement" wide>
        <Spinner />
      </Modal>
    )
  }

  const r = data
  const canReview = can('REFUND_WRITE') && (r.status === 'PENDING' || r.status === 'UNDER_REVIEW')
  const canPay = can('REFUND_WRITE') && r.status === 'APPROVED'

  return (
    <Modal open onClose={onClose} title="Détail du remboursement" wide>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-brand-700">{r.reference}</span>
            <StatusBadge value={r.status} />
            <Badge tone="slate">{refundReasonLabels[r.reason] ?? r.reason}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Contribuable</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
                <Link to={`/taxpayers/${r.taxpayerId}`} className="text-brand-700 hover:underline">
                  {r.taxpayerName} ({r.nif})
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Montant demandé</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{fmtMGA(r.amount)}</dd>
            </div>
            {r.approvedAmount != null && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Montant approuvé</dt>
                <dd className="text-right font-medium text-emerald-700">{fmtMGA(r.approvedAmount)}</dd>
              </div>
            )}
            {r.paymentMethod && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Mode de paiement</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{paymentMethodLabels[r.paymentMethod] ?? r.paymentMethod}</dd>
              </div>
            )}
            {r.paymentReference && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Référence paiement</dt>
                <dd className="text-right font-mono text-slate-900 dark:text-slate-100">{r.paymentReference}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Demandé par</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{r.requestedBy ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Demandé le</dt>
              <dd className="text-right text-slate-900 dark:text-slate-100">{fmtDateTime(r.createdAt)}</dd>
            </div>
            {r.reviewedBy && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Examiné par</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{r.reviewedBy}</dd>
              </div>
            )}
            {r.paidAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Payé le</dt>
                <dd className="text-right text-slate-900 dark:text-slate-100">{fmtDateTime(r.paidAt)}</dd>
              </div>
            )}
          </dl>
          {r.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{r.description}</p>}
          {r.rejectionReason && (
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <span className="font-semibold">Motif du rejet : </span>
              {r.rejectionReason}
            </div>
          )}
        </div>

        {canReview && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Examiner la demande</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={approve ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setApprove(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> Approuver
              </Button>
              <Button
                variant={!approve ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => setApprove(false)}
              >
                <XCircle className="h-4 w-4" /> Rejeter
              </Button>
            </div>
            {approve ? (
              <div className="mt-3">
                <Field label="Montant approuvé (MGA)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedAmount || (r.approvedAmount != null ? String(r.approvedAmount) : String(r.amount))}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <div className="mt-3">
                <Field label="Motif du rejet">
                  <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Raison du rejet" />
                </Field>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                onClick={() => review.mutate()}
                disabled={review.isPending || (!approve && !rejectionReason.trim())}
              >
                {approve ? 'Approuver' : 'Rejeter'}
              </Button>
            </div>
          </div>
        )}

        {canPay && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enregistrer le paiement</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Mode de paiement">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {Object.entries(paymentMethodLabels).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Référence de paiement">
                <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="ex : VIR-2026-0042" />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => pay.mutate()} disabled={pay.isPending}>
                <HandCoins className="h-4 w-4" /> Marquer comme payé
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
