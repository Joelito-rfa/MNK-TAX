import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Gavel,
  Mail,
  RotateCcw,
  Scale,
  Send,
  X,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiGetBlob, apiPatch, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { useLocaleFormatters } from '../../lib/format'
import type { CollectionDebtRow, CollectionDetail, DebtStatus } from '../../types'
import { Button, Field, Input, Select, Spinner, Textarea } from '../ui'
import { useToast } from '../Toast'
import { UserAvatar } from '../UserAvatar'
import { TERMINAL_STATUSES, ACTION_KEYS, ACTION_ICONS } from './constants'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { PaymentProgress } from './PaymentProgress'
import { InfoRow } from './InfoRow'

function toRow(detail: CollectionDetail): CollectionDebtRow {
  return {
    id: detail.id,
    reference: detail.reference,
    nif: detail.taxpayer.nif,
    taxpayerName: detail.taxpayer.name,
    taxTypeCode: detail.taxTypeCode,
    period: detail.period,
    totalAmount: detail.totalAmount,
    paidAmount: detail.paidAmount,
    balance: detail.balance,
    dueDate: detail.dueDate,
    debtStatus: detail.debtStatus as DebtStatus,
    collectionStatus: detail.collectionStatus as CollectionDebtRow['collectionStatus'],
    collectionPriority: detail.collectionPriority as CollectionDebtRow['collectionPriority'],
    origin: detail.origin as CollectionDebtRow['origin'],
    daysOverdue: detail.daysOverdue,
    lastActionType: null,
    lastAction: null,
    lastActionDate: null,
    lastResponsible: null,
    nextAction: null,
    nextActionDate: null,
  }
}

export function DetailDrawer({
  open,
  onClose,
  debtId,
  onPayment,
  onReminder,
  onNotice,
  onPlan,
  onAction,
}: {
  open: boolean
  onClose: () => void
  debtId: number | null
  onPayment: (debt: CollectionDebtRow) => void
  onReminder: (debt: CollectionDebtRow) => void
  onNotice: (debt: CollectionDebtRow) => void
  onPlan: (debt: CollectionDebtRow) => void
  onAction: (debt: CollectionDebtRow, type: 'commandment' | 'atd') => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { fmtDate, fmtMGA } = useLocaleFormatters()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeAmount, setDisputeAmount] = useState('')
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [decisionChoice, setDecisionChoice] = useState<'SUSTAINED' | 'REJECTED' | 'WITHDRAWN'>('REJECTED')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [docBusy, setDocBusy] = useState<string | null>(null)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['collection-detail', debtId],
    queryFn: () => apiGet<CollectionDetail>(`/collection/detail/${debtId}`),
    enabled: open && debtId !== null,
  })

  const openDispute = detail?.disputes.find((d) => d.status === 'OPEN')

  const createDispute = useMutation({
    mutationFn: () =>
      apiPost('/collection/disputes', {
        debtId: debtId,
        reason: disputeReason.trim(),
        contestedAmount: disputeAmount ? Number(disputeAmount) : null,
        contestationDate: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      toast.success(t('toast.actionSaved'))
      setDisputeOpen(false)
      setDisputeReason('')
      setDisputeAmount('')
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const resolveDispute = useMutation({
    mutationFn: () =>
      apiPatch(`/collection/disputes/${openDispute!.id}/decision`, {
        decision: decisionChoice,
        notes: decisionNotes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t('toast.saveSuccess'))
      setDecisionOpen(false)
      setDecisionNotes('')
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const suspendDebt = useMutation({
    mutationFn: () =>
      apiPatch(`/debts/${debtId}/suspend`, { reason: suspendReason.trim() || 'Suspension depuis le recouvrement' }),
    onSuccess: () => {
      toast.success(t('toast.actionSaved'))
      setSuspendOpen(false)
      setSuspendReason('')
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const resumeDebt = useMutation({
    mutationFn: () => apiPatch(`/debts/${debtId}/resume`),
    onSuccess: () => {
      toast.success(t('toast.actionSaved'))
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const closeDebt = useMutation({
    mutationFn: () =>
      apiPatch(`/debts/${debtId}/close`, { reason: closeReason.trim() || 'Clôture depuis le recouvrement' }),
    onSuccess: () => {
      toast.success(t('toast.actionSaved'))
      setCloseOpen(false)
      setCloseReason('')
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['collection-detail', debtId] })
    queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
    queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
    queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
  }

  async function downloadDocument(kind: 'mise-en-demeure' | 'relance') {
    if (!debtId) return
    setDocBusy(kind)
    try {
      const blob = await apiGetBlob(`/collection/documents/${kind}/${debtId}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind === 'mise-en-demeure' ? 'mise-en-demeure' : 'lettre-relance'}_${detail?.reference ?? debtId}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('toast.pdfGenerated'))
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setDocBusy(null)
    }
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const canAct = detail
    ? !TERMINAL_STATUSES.includes(detail.debtStatus as DebtStatus)
    : false
  const isSuspended = detail?.debtStatus === 'SUSPENDED'
  const isDisputed = detail?.debtStatus === 'DISPUTED'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t("collection.drawer.title")}
    >
      <div className="fixed inset-y-0 right-0 w-full max-w-xl animate-drawer-in border-l border-slate-200/70 bg-white shadow-popover dark:border-slate-700/50 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("collection.drawer.title")}</h3>
            {detail && <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{detail.reference}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={t("collection.drawer.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100vh-60px)] overflow-y-auto px-5 py-4">
          {isLoading || !detail ? (
            <Spinner label={t("common.loading")} />
          ) : (
            <div className="space-y-6">
              {/* ── Info contribuable ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contribuable
                </h4>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <InfoRow label="Nom" value={detail.taxpayer.name} strong />
                  <InfoRow label="NIF" value={detail.taxpayer.nif} mono />
                  {detail.taxpayer.phone && <InfoRow label="Téléphone" value={detail.taxpayer.phone} />}
                  {detail.taxpayer.email && <InfoRow label="Email" value={detail.taxpayer.email} />}
                  {detail.taxpayer.address && <InfoRow label="Adresse" value={detail.taxpayer.address} />}
                  {detail.taxpayer.taxCenterName && <InfoRow label="Centre fiscal" value={detail.taxpayer.taxCenterName} />}
                  {detail.taxpayer.taxRegimeCode && <InfoRow label="Régime" value={detail.taxpayer.taxRegimeCode} />}
                </div>
              </section>

              {/* ── Info créance ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Créance
                </h4>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <InfoRow label="Impôt / Période" value={`${detail.taxTypeCode} — ${detail.period}`} />
                  <InfoRow label="Montant principal" value={fmtMGA(detail.principalAmount)} />
                  {detail.penaltyAmount > 0 && <InfoRow label="Pénalités" value={fmtMGA(detail.penaltyAmount)} warn />}
                  {detail.interestAmount > 0 && <InfoRow label="Intérêts" value={fmtMGA(detail.interestAmount)} warn />}
                  <InfoRow label="Montant total" value={fmtMGA(detail.totalAmount)} strong />
                  <InfoRow label="Montant payé" value={fmtMGA(detail.paidAmount)} paid />
                  <InfoRow label="Reste à payer" value={fmtMGA(detail.balance)} balance />
                  <InfoRow label="Échéance" value={fmtDate(detail.dueDate)} />
                  {detail.daysOverdue > 0 && (
                    <InfoRow label="Jours de retard" value={`${detail.daysOverdue} jours`} overdue />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Statut</span>
                    <StatusBadge status={detail.debtStatus} />
                  </div>
                  <InfoRow label="Priorité" value={<PriorityBadge priority={detail.collectionPriority} />} />
                  <InfoRow label="Origine" value={detail.origin} />
                  {detail.observations && <InfoRow label="Observations" value={detail.observations} />}
                  <div className="pt-1">
                    <PaymentProgress paid={detail.paidAmount} total={detail.totalAmount} />
                  </div>
                </div>
              </section>

              {/* ── Historique des actions (timeline) ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Historique des actions ({detail.actions.length})
                </h4>
                {detail.actions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucune action enregistrée.</p>
                ) : (
                  <div className="relative ml-3 space-y-4 border-l-2 border-slate-200 dark:border-slate-700">
                    {detail.actions.map((a) => (
                      <div key={a.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-violet-500 dark:border-slate-800" />
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {ACTION_ICONS[a.type]} {t(ACTION_KEYS[a.type] ?? 'common.unknown')}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{fmtDate(a.actionDate)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.description}</p>
                          {a.outcome && <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">✓ {a.outcome}</p>}
                          {a.nextAction && (
                            <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400">
                              → {a.nextAction}
                              {a.nextActionDate && ` — ${fmtDate(a.nextActionDate)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Litiges / contentieux ── */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Litiges / contentieux ({detail.disputes.length})
                  </h4>
                  {canAct && !isDisputed && (
                    <button
                      onClick={() => setDisputeOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/15"
                    >
                      <Scale className="h-3.5 w-3.5" /> Déclarer un litige
                    </button>
                  )}
                </div>
                {detail.disputes.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucun litige déclaré.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.disputes.map((d) => (
                      <div
                        key={d.id}
                        className={`rounded-xl border p-3 text-sm ${
                          d.status === 'OPEN'
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">
                            {d.reference}
                          </span>
                          <span className="text-[10px] text-slate-400">{fmtDate(d.contestationDate)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{d.reason}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                          {d.contestedAmount != null && (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-500">
                              Contesté : {fmtMGA(d.contestedAmount)}
                            </span>
                          )}
                          {d.status === 'OPEN' ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-500">En cours</span>
                          ) : (
                            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 font-medium text-slate-500">
                              Décision : {d.decision === 'SUSTAINED' ? 'admise' : d.decision === 'REJECTED' ? 'rejetée' : 'retirée'}
                            </span>
                          )}
                          {d.decisionNotes && <span className="text-slate-400">— {d.decisionNotes}</span>}
                        </div>
                        {d.status === 'OPEN' && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => { setDecisionOpen(true); setDecisionChoice('REJECTED') }}
                            >
                              <Gavel className="h-3.5 w-3.5" /> Rendre une décision
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Mises en demeure ── */}
              {detail.notices.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mises en demeure / courriers ({detail.notices.length})
                  </h4>
                  <ul className="space-y-2">
                    {detail.notices.map((n) => (
                      <li key={n.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">
                            {n.noticeNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">{fmtDate(n.noticeDate)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{n.content || n.noticeType}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Documents PDF ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Documents PDF
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadDocument('mise-en-demeure')}
                    disabled={docBusy !== null}
                    loading={docBusy === 'mise-en-demeure'}
                    title={t("collection.drawer.downloadNotice")}
                  >
                    <FileText className="h-3.5 w-3.5" /> Mise en demeure PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadDocument('relance')}
                    disabled={docBusy !== null}
                    loading={docBusy === 'relance'}
                    title={t("collection.drawer.downloadReminder")}
                  >
                    <FileText className="h-3.5 w-3.5" /> Lettre de relance PDF
                  </Button>
                </div>
              </section>

              {/* ── Actions rapides ── */}
              {canAct && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions rapides
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.balance > 0 && (
                      <Button
                        size="sm"
                        onClick={() => onPayment(toRow(detail))}
                        className="bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Enregistrer un paiement
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onReminder(toRow(detail))}>
                      <Send className="h-3.5 w-3.5" /> Envoyer une relance
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onNotice(toRow(detail))}>
                      <Mail className="h-3.5 w-3.5" /> Mise en demeure
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction(toRow(detail), 'commandment')}>
                      <FileWarning className="h-3.5 w-3.5" /> Commandement
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction(toRow(detail), 'atd')}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> ATD
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onPlan(toRow(detail))}>
                      <CalendarDays className="h-3.5 w-3.5" /> Plan de paiement
                    </Button>
                    {!isSuspended && !isDisputed && (
                      <Button size="sm" variant="secondary" onClick={() => setSuspendOpen(true)}>
                        <Ban className="h-3.5 w-3.5" /> Suspendre
                      </Button>
                    )}
                    {isSuspended && (
                      <Button size="sm" variant="secondary" onClick={() => resumeDebt.mutate()} loading={resumeDebt.isPending}>
                        <RotateCcw className="h-3.5 w-3.5" /> Réactiver
                      </Button>
                    )}
                    {!isSuspended && (
                      <Button size="sm" variant="danger" onClick={() => setCloseOpen(true)}>
                        <Ban className="h-3.5 w-3.5" /> Clôturer
                      </Button>
                    )}
                  </div>
                </section>
              )}

              {/* ── Modales litige / suspension / clôture ── */}
              {disputeOpen && (
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Déclarer un litige
                    </h4>
                    <div className="space-y-3 rounded-xl bg-red-500/5 p-4">
                      <Field label="Motif de la contestation">
                        <Textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          rows={3}
                          placeholder="Ex. : erreur de liquidation, base contestée, double imposition…"
                        />
                      </Field>
                      <Field label="Montant contesté (facultatif, MGA)">
                        <Input
                          type="number"
                          min="0"
                          value={disputeAmount}
                          onChange={(e) => setDisputeAmount(e.target.value)}
                          placeholder="0"
                        />
                      </Field>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => { setDisputeOpen(false); setDisputeReason(''); setDisputeAmount('') }}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => createDispute.mutate()}
                          disabled={!disputeReason.trim() || createDispute.isPending}
                          loading={createDispute.isPending}
                        >
                          <Scale className="h-3.5 w-3.5" /> Déclarer le litige
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {decisionOpen && openDispute && (
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Décision sur le litige {openDispute.reference}
                    </h4>
                    <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                      <Field label="Décision">
                        <Select value={decisionChoice} onChange={(e) => setDecisionChoice(e.target.value as 'SUSTAINED' | 'REJECTED' | 'WITHDRAWN')}>
                          <option value="REJECTED">Rejetée (contestation écartée)</option>
                          <option value="WITHDRAWN">Retirée (par le contribuable)</option>
                          <option value="SUSTAINED">Admise (régularisation à effectuer)</option>
                        </Select>
                      </Field>
                      {decisionChoice === 'SUSTAINED' && (
                        <p className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-600 dark:text-sky-400">
                          Une décision d'admission ne réduit ni n'annule rien automatiquement : la régularisation
                          (annulation, réduction ou clôture) reste une action explicite et autorisée.
                        </p>
                      )}
                      <Field label="Motif / notes (facultatif)">
                        <Textarea
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          rows={2}
                          placeholder="Référence de la décision, observations…"
                        />
                      </Field>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setDecisionOpen(false)}>Annuler</Button>
                        <Button
                          size="sm"
                          onClick={() => resolveDispute.mutate()}
                          loading={resolveDispute.isPending}
                        >
                          Enregistrer la décision
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {suspendOpen && (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Suspendre la créance
                  </h4>
                  <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <Field label="Motif de la suspension">
                      <Textarea
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        rows={2}
                        placeholder="Litige en instruction, moratoire, procédure en cours…"
                      />
                    </Field>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setSuspendOpen(false)}>Annuler</Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => suspendDebt.mutate()}
                        loading={suspendDebt.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" /> Suspendre
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {closeOpen && (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Clôturer la créance
                  </h4>
                  <div className="space-y-3 rounded-xl bg-rose-500/5 p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Une créance clôturée n'est plus recouvrée. Motif (irrécouvrable, régularisée, décision de
                      gestion…) :
                    </p>
                    <Field label="Motif de la clôture">
                      <Textarea
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        rows={2}
                        placeholder="Raison de la clôture…"
                      />
                    </Field>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setCloseOpen(false)}>Annuler</Button>
                      <Button size="sm" variant="danger" onClick={() => closeDebt.mutate()} loading={closeDebt.isPending}>
                        <Ban className="h-3.5 w-3.5" /> Clôturer définitivement
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
