import { useState, useRef, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Inbox,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Wallet,
  X,
  Eye,
  PhoneCall,
  Mail,
  CreditCard,
  FileWarning,
  History,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type {
  CollectionDebtRow,
  CollectionDetail,
  CollectionHistory,
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
  Pagination,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { UserAvatar } from '../components/UserAvatar'

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ACTION_LABELS: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique',
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

const ACTION_ICONS: Record<string, string> = {
  PHONE_CONTACT: '📞',
  SMS: '✉️',
  NOTIFICATION: '🔔',
  NOTICE: '📨',
  PAYMENT_RECORD: '💳',
  NOTE: '📝',
  FOLLOW_UP: '📅',
  REMINDER: '📧',
  VISIT: '🏢',
  SEIZURE: '⚠️',
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PAYE: { label: 'Payé', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
  EN_ATTENTE: { label: 'En attente', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/25' },
  RELANCE_EN_COURS: { label: 'Relance en cours', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
  EN_RETARD: { label: 'En retard', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
  MISE_EN_DEMEURE: { label: 'Mise en demeure', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
  CONTENTIEUX: { label: 'Litige', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' },
  ANNULE: { label: 'Annulé', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; dot: string; color: string }
> = {
  URGENT: { label: 'Critique', dot: 'bg-red-500', color: 'text-red-400' },
  HIGH: { label: 'Haute', dot: 'bg-orange-500', color: 'text-orange-400' },
  NORMAL: { label: 'Moyenne', dot: 'bg-amber-500', color: 'text-amber-400' },
  LOW: { label: 'Faible', dot: 'bg-emerald-500', color: 'text-emerald-400' },
}

const TAB_LIST = [
  { id: '', label: 'Tous les dossiers', icon: FileText },
  { id: 'OVERDUE', label: 'En retard', icon: AlertTriangle },
  { id: 'TO_RECOVER', label: 'À recouvrer', icon: Wallet },
  { id: 'IN_REMINDER', label: 'Relance en cours', icon: Send },
  { id: 'IN_COLLECTION', label: 'Mise en demeure', icon: FileWarning },
  { id: 'NEAR_DUE', label: 'Échéance proche', icon: CalendarClock },
  { id: 'PAID', label: 'Payé', icon: CheckCircle2 },
  { id: 'DISPUTED', label: 'Litige', icon: AlertCircle },
]

/* ═══════════════════════════════════════════════════════════════
   HELPER: Days between two dates
   ═══════════════════════════════════════════════════════════════ */
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── Skeleton loader ── */
function CollectionSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-80 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      {/* KPI skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      {/* Tabs skeleton */}
      <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      {/* Filters skeleton */}
      <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      {/* Table skeleton */}
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <Badge tone="slate">{status}</Badge>
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
      {cfg.label}
    </span>
  )
}

/* ── Priority badge ── */
function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority]
  if (!cfg) return <span className="text-xs text-slate-500">—</span>
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ── Progress bar ── */
function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  if (total <= 0) return <span className="text-xs text-slate-500">—</span>
  const pct = Math.min(100, Math.round((paid / total) * 100))
  const barColor =
    pct >= 100
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-blue-500'
        : pct > 0
          ? 'bg-amber-500'
          : 'bg-slate-600'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${barColor} animate-progress`}
          style={{ width: `${pct}%`, transformOrigin: 'left' }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
        {pct}%
      </span>
    </div>
  )
}

/* ── Context menu ── */
function RowActions({
  debt,
  onView,
  onPayment,
  onCallReminder,
  onSendReminder,
  onSendNotice,
  onHistory,
}: {
  debt: CollectionDebtRow
  onView: () => void
  onPayment: () => void
  onCallReminder: () => void
  onSendReminder: () => void
  onSendNotice: () => void
  onHistory: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isActive = debt.collectionStatus !== 'PAYE' && debt.collectionStatus !== 'ANNULE'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
            <div className="space-y-0.5">
            <button
              onClick={() => { onView(); setOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le dossier
            </button>
            {isActive && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { onCallReminder(); setOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <PhoneCall className="h-4 w-4 shrink-0 text-blue-500" /> Enregistrer un appel
                </button>
                <button
                  onClick={() => { onSendReminder(); setOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Send className="h-4 w-4 shrink-0 text-violet-500" /> Envoyer une relance
                </button>
                <button
                  onClick={() => { onSendNotice(); setOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Mail className="h-4 w-4 shrink-0 text-orange-500" /> Mise en demeure
                </button>
                <button
                  onClick={() => { onPayment(); setOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  <CreditCard className="h-4 w-4 shrink-0" /> Enregistrer un paiement
                </button>
              </>
            )}
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <button
              onClick={() => { onHistory(); setOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <History className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir l'historique
            </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function Collection() {
  /* ── State ── */
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [activeTab, setActiveTab] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [drawerDebtId, setDrawerDebtId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<CollectionDebtRow | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'call' | 'reminder' | 'notice'>('call')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDebtId, setHistoryDebtId] = useState<number | null>(null)

  const queryClient = useQueryClient()
  const toast = useToast()

  /* ── Build query params ── */
  const buildParams = () => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (activeTab) {
      if (activeTab === 'TO_RECOVER') p.set('status', 'DUE')
      else if (activeTab === 'IN_REMINDER') p.set('status', 'OVERDUE')
      else p.set('status', activeTab)
    }
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    return p.toString()
  }

  /* ── Queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ['collection-debts', page, size, activeTab, searchQ, taxTypeFilter, periodFilter],
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${buildParams()}`),
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

  /* ── Mutations ── */
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

  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    method: 'CASH',
  })

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

  function openActionWithType(type: 'call' | 'reminder' | 'notice', debtId?: string) {
    setActionType(type)
    const typeMap = { call: 'PHONE_CONTACT', reminder: 'REMINDER', notice: 'NOTICE' }
    setActionForm((f) => ({
      ...f,
      type: typeMap[type],
      debtId: debtId ?? f.debtId,
      description: '',
    }))
    setActionOpen(true)
  }

  /* ── Unique periods from data ── */
  const uniquePeriods = useMemo(() => {
    const set = new Set<string>()
    data?.content.forEach((d) => set.add(d.period))
    return Array.from(set).sort().reverse()
  }, [data])

  /* ── Tab counts (approximate from data totalElements) ── */
  const totalResults = data?.totalElements ?? 0

  /* ── Alert computation ── */
  const alerts = useMemo(() => {
    const rows = data?.content ?? []
    const over30 = rows.filter((d) => {
      const days = daysUntil(d.dueDate)
      return days !== null && days < -30 && d.collectionStatus !== 'PAYE'
    }).length
    const highAmount = rows.filter(
      (d) => d.totalAmount >= 1_000_000 && d.collectionStatus !== 'PAYE'
    ).length
    const upcoming = rows.filter((d) => {
      const days = daysUntil(d.dueDate)
      return days !== null && days >= 0 && days <= 7 && d.collectionStatus !== 'PAYE'
    }).length
    return { over30, highAmount, upcoming }
  }, [data])

  const hasAnyAlert = alerts.over30 > 0 || alerts.highAmount > 0 || alerts.upcoming > 0

  /* ── Handlers ── */
  function handleTabChange(tabId: string) {
    setActiveTab(tabId)
    setPage(0)
  }

  function resetFilters() {
    setSearchQ('')
    setTaxTypeFilter('')
    setPeriodFilter('')
    setActiveTab('')
    setPage(0)
  }

  const hasFilters = !!(searchQ || taxTypeFilter || periodFilter || activeTab)
  const activeFilterCount = [searchQ, taxTypeFilter, periodFilter].filter(Boolean).length

  /* ── Export CSV ── */
  function exportCsv() {
    const p = new URLSearchParams(buildParams())
    p.delete('page')
    p.delete('size')
    apiGet<Page<CollectionDebtRow>>(`/collection/debts?${p.toString()}&size=9999`).then((rows) => {
      const csv = [
        'Référence,NIF,Contribuable,Impôt,Période,Montant dû,Payé,Reste,Échéance,Statut,Priorité',
        ...rows.content.map(
          (d) =>
            `"${d.reference}",${d.nif},"${d.taxpayerName}",${d.taxTypeCode},${d.period},${d.totalAmount},${d.paidAmount},${d.balance},"${d.dueDate}","${d.collectionStatus}","NORMAL"`
        ),
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `creances_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV terminé')
    })
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  if (isLoading && !data) return <CollectionSkeleton />

  return (
    <div className="space-y-6">
      {/* ── Background decorations ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-violet-500/[0.03] blur-[100px]" />
        <div className="absolute -right-20 top-2/3 h-80 w-80 rounded-full bg-indigo-500/[0.03] blur-[100px]" />
      </div>

      {/* ═══════════════ 1. EN-TÊTE DE PAGE ═══════════════ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Recouvrement
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Suivi des créances fiscales, relances et actions de recouvrement
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['collection-debts'] })}
          >
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
          <Button variant="secondary" size="sm">
            <FileSpreadsheet className="h-4 w-4" /> Rapport
          </Button>
          <button
            onClick={() => openActionWithType('call')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Nouvelle action
          </button>
        </div>
      </div>

      {/* ═══════════════ 11. ALERTES DE RECOUVREMENT ═══════════════ */}
      {hasAnyAlert && (
        <div className="flex flex-wrap gap-3 animate-fade-in">
          {alerts.over30 > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 dark:text-amber-400">
                {alerts.over30} créance{alerts.over30 > 1 ? 's' : ''} dépassent 30 jours de retard
              </span>
            </div>
          )}
          {alerts.highAmount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-300 dark:text-red-400">
                {alerts.highAmount} créance{alerts.highAmount > 1 ? 's' : ''} ≥ 1 000 000 MGA
              </span>
            </div>
          )}
          {alerts.upcoming > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm">
              <CalendarDays className="h-4 w-4 text-sky-400" />
              <span className="text-sky-300 dark:text-sky-400">
                {alerts.upcoming} échéance{alerts.upcoming > 1 ? 's' : ''} dans les 7 prochains jours
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ 3. ONGLETS ═══════════════ */}
      <Card>
        <div className="border-b border-slate-100 dark:border-slate-700/50 px-5 pt-4">
          <div className="flex flex-wrap gap-1">
            {TAB_LIST.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══════════════ 4. FILTRES ═══════════════ */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(0) }}
              placeholder="Rechercher par NIF, nom ou référence…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-700"
            />
          </div>
          <div className="w-48">
            <Select
              value={taxTypeFilter}
              onChange={(e) => { setTaxTypeFilter(e.target.value); setPage(0) }}
            >
              <option value="">Tous les impôts</option>
              {taxTypes?.map((tt) => (
                <option key={tt.code} value={tt.code}>
                  {tt.code} — {tt.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              value={periodFilter}
              onChange={(e) => { setPeriodFilter(e.target.value); setPage(0) }}
            >
              <option value="">Toutes périodes</option>
              {uniquePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
              showAdvanced
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="h-4 w-4" /> Plus de filtres
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Advanced filters panel ── */}
        {showAdvanced && (
          <div className="animate-fade-in border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Centre fiscal">
                <Select>
                  <option value="">Tous les centres</option>
                </Select>
              </Field>
              <Field label="Type de contribuable">
                <Select>
                  <option value="">Tous les types</option>
                  <option value="COMPANY">Entreprise</option>
                  <option value="PERSON">Particulier</option>
                </Select>
              </Field>
              <Field label="Montant minimum (MGA)">
                <Input type="number" placeholder="0" />
              </Field>
              <Field label="Montant maximum (MGA)">
                <Input type="number" placeholder="Illimité" />
              </Field>
              <Field label="Date d'échéance">
                <Input type="date" />
              </Field>
              <Field label="Agent responsable">
                <Select>
                  <option value="">Tous les agents</option>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
              <Button size="sm">Appliquer les filtres</Button>
            </div>
          </div>
        )}

        {/* ── Active filter chips ── */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtres :</span>
            {searchQ && (
              <button
                onClick={() => { setSearchQ(''); setPage(0) }}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Recherche : {searchQ} <X className="h-3 w-3" />
              </button>
            )}
            {taxTypeFilter && (
              <button
                onClick={() => { setTaxTypeFilter(''); setPage(0) }}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Impôt : {taxTypeFilter} <X className="h-3 w-3" />
              </button>
            )}
            {periodFilter && (
              <button
                onClick={() => { setPeriodFilter(''); setPage(0) }}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Période : {periodFilter} <X className="h-3 w-3" />
              </button>
            )}
            {activeTab && (
              <button
                onClick={() => { setActiveTab(''); setPage(0) }}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Onglet : {TAB_LIST.find((t) => t.id === activeTab)?.label} <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={resetFilters}
              className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* ── Results count ── */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalResults > 0 ? (
              <>
                <span className="font-medium text-slate-700 dark:text-slate-300">{totalResults}</span>{' '}
                créance{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
              </>
            ) : (
              'Chargement...'
            )}
          </p>
        </div>

        {/* ═══════════════ 5. TABLEAU DES CRÉANCES ═══════════════ */}
        <div key={`${activeTab}|${taxTypeFilter}|${periodFilter}|${page}`} className="animate-page-in">
          {isLoading ? (
            <Spinner />
          ) : !data || data.content.length === 0 ? (
            /* ═══════════════ 13. ÉTAT VIDE ═══════════════ */
            <div className="py-14">
              <EmptyState
                icon={<Inbox className="h-10 w-10" />}
                title="Aucune créance trouvée"
                subtitle="Aucun dossier ne correspond aux critères sélectionnés."
              />
              {hasFilters && (
                <div className="mt-4 flex justify-center">
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    <X className="h-4 w-4" /> Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                    <tr>
                      <Th>Réf. créance</Th>
                      <Th>NIF</Th>
                      <Th>Contribuable</Th>
                      <Th>Impôt</Th>
                      <Th>Période</Th>
                      <Th>Montant dû</Th>
                      <Th>Payé</Th>
                      <Th>Reste</Th>
                      <Th>Échéance</Th>
                      <Th>Statut</Th>
                      <Th>Priorité</Th>
                      <Th>Dernière action</Th>
                      <Th>Agent</Th>
                      <Th className="w-12"></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                    {data.content.map((d) => {
                      const daysLeft = daysUntil(d.dueDate)
                      const isOverdue =
                        daysLeft !== null && daysLeft < 0 && d.collectionStatus !== 'PAYE'
                      return (
                        <tr
                          key={d.id}
                          className="group cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/40"
                          onClick={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }}
                        >
                          {/* Réf */}
                          <Td>
                            <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">
                              {d.reference}
                            </span>
                          </Td>
                          {/* NIF */}
                          <Td>
                            <span className="font-mono text-xs">{d.nif}</span>
                          </Td>
                          {/* Contribuable */}
                          <Td>
                            <span className="max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200">
                              {d.taxpayerName}
                            </span>
                          </Td>
                          {/* Impôt */}
                          <Td>
                            <span className="text-sm">{d.taxTypeCode}</span>
                          </Td>
                          {/* Période */}
                          <Td>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{d.period}</span>
                          </Td>
                          {/* Montant dû */}
                          <Td>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {fmtMGA(d.totalAmount)}
                            </span>
                          </Td>
                          {/* Payé */}
                          <Td>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {fmtMGA(d.paidAmount)}
                            </span>
                          </Td>
                          {/* Reste */}
                          <Td>
                            <span
                              className={`font-semibold ${
                                isOverdue
                                  ? 'text-red-500 dark:text-red-400'
                                  : d.balance > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {fmtMGA(d.balance)}
                            </span>
                            <div className="mt-1">
                              <PaymentProgress paid={d.paidAmount} total={d.totalAmount} />
                            </div>
                          </Td>
                          {/* Échéance */}
                          <Td>
                            <div>
                              <span
                                className={`text-sm ${
                                  isOverdue
                                    ? 'font-semibold text-red-500 dark:text-red-400'
                                    : daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
                                      ? 'font-medium text-amber-600 dark:text-amber-400'
                                      : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {fmtDate(d.dueDate)}
                              </span>
                              {daysLeft !== null && d.collectionStatus !== 'PAYE' && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {isOverdue
                                    ? `${Math.abs(daysLeft)}j de retard`
                                    : daysLeft === 0
                                      ? "Aujourd'hui"
                                      : `dans ${daysLeft}j`}
                                </p>
                              )}
                            </div>
                          </Td>
                          {/* Statut */}
                          <Td>
                            <StatusBadge status={d.collectionStatus} />
                          </Td>
                          {/* Priorité */}
                          <Td>
                            <PriorityBadge priority="NORMAL" />
                          </Td>
                          {/* Dernière action */}
                          <Td>
                            <span className="max-w-[140px] truncate text-xs text-slate-500 dark:text-slate-400">
                              {d.lastAction || '—'}
                            </span>
                          </Td>
                          {/* Agent */}
                          <Td>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Agent TAX-01</span>
                          </Td>
                          {/* Actions */}
                          <Td>
                            <RowActions
                              debt={d}
                              onView={() => { setDrawerDebtId(d.id); setDrawerOpen(true) }}
                              onPayment={() => { setSelectedDebt(d); setPaymentOpen(true) }}
                              onCallReminder={() => openActionWithType('call', String(d.id))}
                              onSendReminder={() => openActionWithType('reminder', String(d.id))}
                              onSendNotice={() => openActionWithType('notice', String(d.id))}
                              onHistory={() => { setHistoryDebtId(d.id); setHistoryOpen(true) }}
                            />
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              {/* ═══════════════ 12. PAGINATION ═══════════════ */}
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
        </div>
      </Card>

      {/* ═══════════════ MODAL: NOUVELLE ACTION ═══════════════ */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={
          actionType === 'call'
            ? 'Enregistrer un appel'
            : actionType === 'reminder'
              ? 'Envoyer une relance'
              : 'Envoyer une mise en demeure'
        }
        wide
      >
        <form
          onSubmit={(e) => { e.preventDefault(); createAction.mutate() }}
          className="space-y-4"
        >
          {createAction.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
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
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Input
              value={actionForm.description}
              onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              placeholder={
                actionType === 'call'
                  ? 'ex : Relance téléphonique du contribuable'
                  : actionType === 'reminder'
                    ? 'ex : Relance par email'
                    : 'ex : Mise en demeure formelle'
              }
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
            <Button type="button" variant="secondary" onClick={() => setActionOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createAction.isPending || !actionForm.debtId || !actionForm.description}
            >
              {createAction.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════ MODAL: PAIEMENT ═══════════════ */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Enregistrer un paiement">
        {selectedDebt && (
          <form
            onSubmit={(e) => { e.preventDefault(); registerPayment.mutate() }}
            className="space-y-4"
          >
            {registerPayment.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                {apiErrorMessage(registerPayment.error)}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
              Créance : <strong className="font-mono">{selectedDebt.reference}</strong> — Solde restant :{' '}
              <strong className="text-amber-600">{fmtMGA(selectedDebt.balance)}</strong>
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
                <Select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                >
                  <option value="CASH">Espèces</option>
                  <option value="BANK_TRANSFER">Virement</option>
                  <option value="CHECK">Chèque</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={registerPayment.isPending || !payForm.amount}>
                {registerPayment.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════════ MODAL: HISTORIQUE ═══════════════ */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Historique de recouvrement" wide>
        {history ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Actions ({history.actions.length})
              </p>
              {history.actions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Aucune action.</p>
              ) : (
                <ul className="space-y-2">
                  {history.actions.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <UserAvatar
                            userId={a.responsibleUserId}
                            name={a.responsibleName ?? ''}
                            className="shrink-0"
                          />
                          <span className="font-medium">
                            {ACTION_ICONS[a.type]} {ACTION_LABELS[a.type] ?? a.type}
                          </span>
                          {a.responsibleName && (
                            <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                              — {a.responsibleName}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(a.actionDate)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-400">{a.description}</p>
                      {a.outcome && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Résultat : {a.outcome}
                        </p>
                      )}
                      {a.nextAction && (
                        <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400">
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
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Mises en demeure ({history.notices.length})
              </p>
              {history.notices.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Aucune mise en demeure.</p>
              ) : (
                <ul className="space-y-2">
                  {history.notices.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{n.noticeNumber}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(n.noticeDate)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                        {n.content || n.noticeType}
                      </p>
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

      {/* ═══════════════ 10. PANNEAU DÉTAIL ═══════════════ */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerDebtId(null) }}
        debtId={drawerDebtId}
        onPayment={(debt) => { setSelectedDebt(debt); setPaymentOpen(true) }}
        onAction={(debt, type) => {
          openActionWithType(type, String(debt.id))
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════ */

function DetailDrawer({
  open,
  onClose,
  debtId,
  onPayment,
  onAction,
}: {
  open: boolean
  onClose: () => void
  debtId: number | null
  onPayment: (debt: CollectionDebtRow) => void
  onAction: (debt: CollectionDebtRow, type: 'call' | 'reminder' | 'notice') => void
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['collection-detail', debtId],
    queryFn: () => apiGet<CollectionDetail>(`/collection/detail/${debtId}`),
    enabled: open && debtId !== null,
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fixed inset-y-0 right-0 w-full max-w-lg animate-drawer-in border-l border-slate-200/70 bg-white shadow-popover dark:border-slate-700/50 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Détail de la créance
            </h3>
            {detail && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                {detail.reference}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100vh-60px)] overflow-y-auto px-5 py-4">
          {isLoading || !detail ? (
            <Spinner label="Chargement du dossier…" />
          ) : (
            <div className="space-y-6">
              {/* ── Info contribuable ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contribuable
                </h4>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Nom</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{detail.taxpayer.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">NIF</span>
                    <span className="font-mono text-sm font-medium text-brand-700 dark:text-brand-400">{detail.taxpayer.nif}</span>
                  </div>
                  {detail.taxpayer.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Téléphone</span>
                      <span className="text-sm font-medium">{detail.taxpayer.phone}</span>
                    </div>
                  )}
                  {detail.taxpayer.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Email</span>
                      <span className="text-sm font-medium">{detail.taxpayer.email}</span>
                    </div>
                  )}
                  {detail.taxpayer.address && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Adresse</span>
                      <span className="max-w-[200px] truncate text-right text-sm font-medium">{detail.taxpayer.address}</span>
                    </div>
                  )}
                  {detail.taxpayer.taxCenterCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Centre fiscal</span>
                      <span className="text-sm font-medium">{detail.taxpayer.taxCenterCode}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Info créance ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Créance
                </h4>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Référence</span>
                    <span className="font-mono text-sm font-medium">{detail.reference}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Impôt</span>
                    <span className="text-sm font-medium">{detail.taxTypeCode} — {detail.taxTypeName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Période</span>
                    <span className="text-sm font-medium">{detail.period}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Montant principal</span>
                    <span className="text-sm font-medium">{fmtMGA(detail.principalAmount)}</span>
                  </div>
                  {detail.penaltyAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Pénalités</span>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{fmtMGA(detail.penaltyAmount)}</span>
                    </div>
                  )}
                  {detail.interestAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Intérêts</span>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{fmtMGA(detail.interestAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Montant total</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtMGA(detail.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Montant payé</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtMGA(detail.paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Reste à payer</span>
                    <span className={`text-sm font-semibold ${detail.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {fmtMGA(detail.balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Échéance</span>
                    <span className="text-sm font-medium">{fmtDate(detail.dueDate)}</span>
                  </div>
                  {detail.daysOverdue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Jours de retard</span>
                      <span className="text-sm font-semibold text-red-500 dark:text-red-400">{detail.daysOverdue} jours</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Statut</span>
                    <StatusBadge status={detail.collectionStatus} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Priorité</span>
                    <PriorityBadge priority={detail.collectionPriority} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Origine</span>
                    <span className="text-sm font-medium">{detail.origin}</span>
                  </div>
                  <div className="pt-1">
                    <PaymentProgress paid={detail.paidAmount} total={detail.totalAmount} />
                  </div>
                </div>
              </section>

              {/* ── Historique des actions ── */}
              <section>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Historique des actions ({detail.actions.length})
                </h4>
                {detail.actions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucune action enregistrée.</p>
                ) : (
                  <div className="relative ml-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
                    {detail.actions.map((a) => (
                      <div key={a.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-violet-500 dark:border-slate-800" />
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {ACTION_ICONS[a.type]} {ACTION_LABELS[a.type] ?? a.type}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {fmtDate(a.actionDate)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.description}</p>
                          {a.outcome && (
                            <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                              ✓ {a.outcome}
                            </p>
                          )}
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

              {/* ── Actions rapides ── */}
              {detail.collectionStatus !== 'PAYE' && detail.collectionStatus !== 'ANNULE' && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions rapides
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => onPayment({
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
                        debtStatus: detail.debtStatus,
                        collectionStatus: detail.collectionStatus as any,
                        lastAction: null,
                        lastActionDate: null,
                        nextAction: null,
                        nextActionDate: null,
                      })}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Enregistrer un paiement
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction({
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
                      debtStatus: detail.debtStatus,
                      collectionStatus: detail.collectionStatus as any,
                      lastAction: null,
                      lastActionDate: null,
                      nextAction: null,
                      nextActionDate: null,
                    }, 'reminder')}>
                      <Send className="h-3.5 w-3.5" /> Envoyer une relance
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction({
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
                      debtStatus: detail.debtStatus,
                      collectionStatus: detail.collectionStatus as any,
                      lastAction: null,
                      lastActionDate: null,
                      nextAction: null,
                      nextActionDate: null,
                    }, 'notice')}>
                      <Mail className="h-3.5 w-3.5" /> Mise en demeure
                    </Button>
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
