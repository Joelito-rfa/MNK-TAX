import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { useLocaleFormatters } from '../lib/format'
import { apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import type { CollectionDebtRow, InstallmentStatus, Page, PaymentPlan, PaymentPlanStatus } from '../types'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

/* ═══════════════════════════════════════════════════════════
   LIBELLÉS — statuts des échéanciers et tranches
   ═══════════════════════════════════════════════════════════ */

const PLAN_STATUS: Record<PaymentPlanStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'En cours', badge: 'border-sky-500/25 bg-sky-500/15 text-sky-400', dot: 'bg-sky-400' },
  COMPLETED: { label: 'Soldé', badge: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  CANCELLED: { label: 'Annulé', badge: 'border-slate-500/20 bg-slate-500/10 text-slate-500', dot: 'bg-slate-500' },
}

const INSTALLMENT_STATUS: Record<InstallmentStatus, { label: string; badge: string; dot: string }> = {
  PENDING: { label: 'À échoir', badge: 'border-blue-500/25 bg-blue-500/15 text-blue-400', dot: 'bg-blue-400' },
  PARTIALLY_PAID: { label: 'Partiel', badge: 'border-indigo-500/25 bg-indigo-500/15 text-indigo-400', dot: 'bg-indigo-400' },
  PAID: { label: 'Payée', badge: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  OVERDUE: { label: 'En retard', badge: 'border-rose-500/25 bg-rose-500/15 text-rose-400', dot: 'bg-rose-400' },
  CANCELLED: { label: 'Annulée', badge: 'border-slate-500/20 bg-slate-500/10 text-slate-500', dot: 'bg-slate-500' },
}

function PlanBadge({ status }: { status: PaymentPlanStatus }) {
  const c = PLAN_STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function InstallmentBadge({ status }: { status: InstallmentStatus }) {
  const c = INSTALLMENT_STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function Progress({ paid, total }: { paid: number; total: number }) {
  if (total <= 0) return <span className="text-xs text-slate-500">—</span>
  const pct = Math.min(100, Math.round((paid / total) * 100))
  return (
    <div className="flex items-center gap-2" aria-label={`Avancement : ${pct} %`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-sky-500' : 'bg-slate-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">{pct}%</span>
    </div>
  )
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/* ═══════════════════════════════════════════════════════════
   MODALE DE CRÉATION D'UN ÉCHÉANCIER
   ═══════════════════════════════════════════════════════════ */

interface InstallmentDraft {
  dueDate: string
  amount: string
}

function CreatePlanModal({
  open,
  onClose,
  presetDebtId,
}: {
  open: boolean
  onClose: () => void
  presetDebtId: string
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)

  const [debtId, setDebtId] = useState(presetDebtId)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<InstallmentDraft[]>([])
  const [scheduleCount, setScheduleCount] = useState('')

  /* Réinitialise le formulaire à chaque ouverture. */
  useEffect(() => {
    if (!open) return
    setDebtId(presetDebtId)
    setLabel('')
    setNotes('')
    setRows([{ dueDate: addDays(new Date(), 30), amount: '' }])
    setScheduleCount('')
  }, [open, presetDebtId])

  const { data: debts } = useQuery({
    queryKey: ['plan-eligible-debts'],
    queryFn: () =>
      apiGet<Page<CollectionDebtRow>>('/collection/debts?size=9999').then((p) =>
        p.content.filter(
          (d) =>
            d.balance > 0 &&
            !['PAID', 'CANCELLED', 'CLOSED'].includes(d.debtStatus),
        ),
      ),
    enabled: open,
  })

  const selectedDebt = debts?.find((d) => String(d.id) === debtId)
  const plannedTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const diff = (selectedDebt?.balance ?? 0) - plannedTotal

  const createPlan = useMutation({
    mutationFn: () =>
      apiPost<PaymentPlan>('/collection/plans', {
        debtId: Number(debtId),
        label: label.trim(),
        notes: notes.trim() || null,
        installments: rows
          .filter((r) => r.dueDate && Number(r.amount) > 0)
          .map((r) => ({ dueDate: r.dueDate, amount: Number(r.amount) })),
      }),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['collection-plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-stats'] })
      toast.success(`Échéancier ${plan.reference} créé`)
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  function addRow() {
    const last = rows.length > 0 ? rows[rows.length - 1].dueDate : today
    setRows([...rows, { dueDate: addDays(new Date(last), 30), amount: '' }])
  }

  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i))
  }

  function setRow(i: number, patch: Partial<InstallmentDraft>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function splitEvenly() {
    const n = Number(scheduleCount)
    if (!n || n < 1 || n > 60 || !selectedDebt) return
    const base = Math.floor(selectedDebt.balance / n)
    const rem = selectedDebt.balance - base * n
    const out: InstallmentDraft[] = []
    let d = new Date()
    for (let i = 0; i < n; i++) {
      d = new Date(d)
      d.setDate(d.getDate() + 30)
      out.push({ dueDate: d.toISOString().slice(0, 10), amount: String(base + (i === n - 1 ? rem : 0)) })
    }
    setRows(out)
  }

  const valid =
    debtId &&
    label.trim().length > 0 &&
    rows.length > 0 &&
    rows.every((r) => r.dueDate >= today && Number(r.amount) > 0) &&
    plannedTotal > 0 &&
    plannedTotal <= (selectedDebt?.balance ?? 0)

  return (
    <Modal open={open} onClose={onClose} title="Nouvel échéancier" subtitle="Plan de paiement amiable sur une créance" wide>
      <div className="space-y-5">
        <Field label="Créance à échelonner">
          <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
            <option value="">Choisir une créance…</option>
            {debts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.reference} · {d.taxpayerName} ({d.nif}) — reste {fmtMGA(d.balance)}
              </option>
            ))}
          </Select>
          {!debts && <p className="mt-1 text-xs text-slate-400">Chargement des créances éligibles…</p>}
          {debts?.length === 0 && (
            <p className="mt-1 text-xs text-amber-500">Aucune créance avec un solde restant n'est disponible.</p>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Intitulé de l'échéancier">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. : Régularisation en 4 fois" maxLength={120} />
          </Field>
          <Field label="Notes (facultatif)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Accord amiable, contexte…" />
          </Field>
        </div>

        {/* ── Tranches ── */}
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tranches ({rows.length}) — total {fmtMGA(plannedTotal)}
              {selectedDebt && (
                <span className={`ml-2 ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {diff >= 0 ? `reste ${fmtMGA(diff)}` : `dépasse le solde de ${fmtMGA(-diff)}`}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="2"
                max="60"
                value={scheduleCount}
                onChange={(e) => setScheduleCount(e.target.value)}
                placeholder="N tranches"
                className="w-24"
                aria-label="Nombre de tranches mensuelles"
              />
              <Button type="button" size="sm" variant="secondary" onClick={splitEvenly} disabled={!scheduleCount || !selectedDebt}>
                <CalendarDays className="h-3.5 w-3.5" /> Mensualiser
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="w-40">
                  <Field label={`Tranche ${i + 1} — date`}>
                    <Input type="date" min={today} value={r.dueDate} onChange={(e) => setRow(i, { dueDate: e.target.value })} />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Montant (MGA)">
                    <Input
                      type="number"
                      min="0"
                      value={r.amount}
                      onChange={(e) => setRow(i, { amount: e.target.value })}
                      placeholder="0"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  className="mb-1 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
                  aria-label={`Supprimer la tranche ${i + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addRow}>
            <Plus className="h-4 w-4" /> Ajouter une tranche
          </Button>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          Les tranches sont soldées exclusivement par les paiements réels enregistrés sur la créance. Une tranche échue
          non réglée déclenche une alerte (jamais une procédure automatique).
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={() => createPlan.mutate()} loading={createPlan.isPending} disabled={!valid}>
            Créer l'échéancier
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */

export default function CollectionPlans() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [presetDebtId, setPresetDebtId] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PaymentPlan | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  /* Paramètre ?debt=… : ouvrir la création pré-remplie (depuis le tableau
     des créances via « Plan de paiement »). */
  useEffect(() => {
    const debt = searchParams.get('debt')
    if (debt) {
      setPresetDebtId(debt)
      setCreateOpen(true)
      searchParams.delete('debt')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildUrl = () => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) p.set('status', status)
    if (q) p.set('q', q)
    return p.toString()
  }

  const { data, isError, error } = useQuery({
    queryKey: ['collection-plans', page, size, status, q],
    queryFn: () => apiGet<Page<PaymentPlan>>(`/collection/plans?${buildUrl()}`),
  })

  const { data: stats } = useQuery({
    queryKey: ['plan-stats'],
    queryFn: () =>
      apiGet<{ activePlans: number; completedPlans: number; cancelledPlans: number; overdueInstallments: number; plansWithOverdue: number }>(
        '/collection/plans/stats',
      ),
  })

  const cancelPlan = useMutation({
    mutationFn: () =>
      apiPatch<PaymentPlan>(`/collection/plans/${cancelTarget!.id}/cancel`, {
        reason: cancelReason.trim() || null,
      }),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['collection-plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-stats'] })
      setCancelTarget(null)
      setCancelReason('')
      toast.success(`Échéancier ${plan.reference} annulé`)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const total = data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/collection"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au recouvrement
          </Link>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Échéanciers de paiement
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plans d'étalement des créances — tranches soldées par les paiements réels, alertes en cas de tranche échue
          </p>
        </div>
        <Button onClick={() => { setPresetDebtId(''); setCreateOpen(true) }}>
          <Plus className="h-4 w-4" /> Nouvel échéancier
        </Button>
      </div>

      {/* ── Synthèse (style Règles fiscales) ── */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { iconBg: 'bg-sky-50', iconColor: 'text-sky-600', icon: <CalendarDays className="h-5 w-5" />, label: 'Échéanciers en cours', value: stats.activePlans, sub: undefined as string | undefined },
            { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: <CircleDollarSign className="h-5 w-5" />, label: 'Soldés', value: stats.completedPlans, sub: undefined as string | undefined },
            { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', icon: <Clock className="h-5 w-5" />, label: 'Tranches en retard', value: stats.overdueInstallments, sub: stats.plansWithOverdue > 0 ? `${stats.plansWithOverdue} échéancier(s) concerné(s)` : undefined },
            { iconBg: 'bg-slate-100', iconColor: 'text-slate-500', icon: <Ban className="h-5 w-5" />, label: 'Annulés', value: stats.cancelledPlans, sub: undefined as string | undefined },
          ].map((c) => (
            <div key={c.label} className="card fx-spot group relative overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{c.label}</p>
                  <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{c.value}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.iconBg} ${c.iconColor} transition-transform duration-200 group-hover:scale-110`}>{c.icon}</span>
              </div>
              {c.sub && <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{c.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Filtres ── */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0) }}
              placeholder="Rechercher par référence, contribuable, NIF ou créance…"
              aria-label="Rechercher un échéancier"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-700"
            />
          </div>
          <div className="w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} aria-label="Filtrer par statut">
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">En cours</option>
              <option value="COMPLETED">Soldés</option>
              <option value="CANCELLED">Annulés</option>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-plans'] })}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {/* ── Tableau ── */}
        {isError ? (
          <div className="px-5 py-10 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="mt-2 font-medium text-rose-600 dark:text-rose-400">Impossible de charger les échéanciers. Réessayez.</p>
            <p className="mt-1 text-xs text-slate-400">{apiErrorMessage(error)}</p>
          </div>
        ) : !data ? (
          <Spinner label="Chargement des échéanciers…" />
        ) : data.content.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="Aucun échéancier"
            subtitle="Créez un plan de paiement depuis une créance avec solde restant."
          />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <tr>
                    <Th>Référence</Th>
                    <Th>Créance</Th>
                    <Th>Contribuable</Th>
                    <Th>Total</Th>
                    <Th>Payé</Th>
                    <Th>Reste</Th>
                    <Th>Avancement</Th>
                    <Th>Tranches</Th>
                    <Th>Prochaine échéance</Th>
                    <Th>Statut</Th>
                    <Th className="w-12"></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {data.content.map((plan) => {
                    const open = expanded === plan.id
                    return (
                      <PlanRow
                        key={plan.id}
                        plan={plan}
                        open={open}
                        onToggle={() => setExpanded(open ? null : plan.id)}
                        onCancel={() => setCancelTarget(plan)}
                      />
                    )
                  })}
                </tbody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span> échéancier{total > 1 ? 's' : ''}
              </p>
            </div>
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

      {/* ── Modales ── */}
      <CreatePlanModal open={createOpen} onClose={() => setCreateOpen(false)} presetDebtId={presetDebtId} />
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Annuler l'échéancier"
        message={
          <div className="space-y-3">
            <p>
              L'échéancier <strong>{cancelTarget?.reference}</strong> ({cancelTarget?.label}) sera annulé. Les tranches
              non réglées seront marquées annulées ; les montants déjà payés restent acquis à la créance.
            </p>
            <Field label="Motif de l'annulation">
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="Dossier passé en contentieux, accord différent…" />
            </Field>
          </div>
        }
        confirmLabel="Annuler l'échéancier"
        loading={cancelPlan.isPending}
        onConfirm={() => cancelPlan.mutate()}
        onClose={() => { setCancelTarget(null); setCancelReason('') }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   LIGNE DU TABLEAU (avec tranches dépliables)
   ═══════════════════════════════════════════════════════════ */

function PlanRow({
  plan,
  open,
  onToggle,
  onCancel,
}: {
  plan: PaymentPlan
  open: boolean
  onToggle: () => void
  onCancel: () => void
}) {
  return (
    <>
      <tr className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
        <Td>
          <button onClick={onToggle} className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-brand-700 transition hover:text-brand-600 dark:text-brand-400">
            {plan.reference}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </Td>
        <Td className="font-mono text-xs text-slate-500 dark:text-slate-400">{plan.debtReference}</Td>
        <Td>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{plan.taxpayerName}</p>
          <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{plan.nif}</p>
        </Td>
        <Td className="tabular-nums text-slate-700 dark:text-slate-200">{fmtMGA(plan.totalAmount)}</Td>
        <Td className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMGA(plan.paidAmount)}</Td>
        <Td className="tabular-nums text-slate-700 dark:text-slate-200">{fmtMGA(plan.remainingAmount)}</Td>
        <Td><Progress paid={plan.paidAmount} total={plan.totalAmount} /></Td>
        <Td>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {plan.paidInstallments}/{plan.installmentCount} payées
            {plan.overdueInstallments > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                <AlertTriangle className="h-3 w-3" /> {plan.overdueInstallments} en retard
              </span>
            )}
          </span>
        </Td>
        <Td>{plan.nextDueDate ? <span className="text-xs">{fmtDate(plan.nextDueDate)}</span> : <span className="text-xs text-slate-400">—</span>}</Td>
        <Td><PlanBadge status={plan.status} /></Td>
        <Td>
          {plan.status === 'ACTIVE' && (
            <button
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
              aria-label={`Annuler l'échéancier ${plan.reference}`}
              title="Annuler l'échéancier"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </Td>
      </tr>
      {open && (
        <tr className="bg-slate-50/60 dark:bg-slate-800/30">
          <td colSpan={11} className="px-5 py-0">
            <div className="py-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  <CircleDollarSign className="h-3.5 w-3.5" /> {plan.label}
                </span>
                <span className="text-[11px] text-slate-400">Créé par {plan.createdBy ?? '—'} le {fmtDate(plan.createdAt)}</span>
                {plan.notes && <span className="text-[11px] text-slate-500 dark:text-slate-400">— {plan.notes}</span>}
              </div>
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <Th>N°</Th>
                      <Th>Échéance</Th>
                      <Th>Montant</Th>
                      <Th>Payé</Th>
                      <Th>Reste</Th>
                      <Th>Retard</Th>
                      <Th>Statut</Th>
                      <Th>Payée le</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/20">
                    {plan.installments.map((i) => (
                      <tr key={i.id}>
                        <Td className="text-xs text-slate-400">{i.number}</Td>
                        <Td className="text-xs">{fmtDate(i.dueDate)}</Td>
                        <Td className="tabular-nums text-xs">{fmtMGA(i.amount)}</Td>
                        <Td className="tabular-nums text-xs text-emerald-600 dark:text-emerald-400">{fmtMGA(i.paidAmount)}</Td>
                        <Td className="tabular-nums text-xs">{fmtMGA(i.remainingAmount)}</Td>
                        <Td>
                          {i.daysOverdue > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
                              <Clock className="h-3 w-3" /> {i.daysOverdue} j
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                        <Td><InstallmentBadge status={i.status} /></Td>
                        <Td className="text-xs text-slate-500">{i.paidAt ? fmtDate(i.paidAt) : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
