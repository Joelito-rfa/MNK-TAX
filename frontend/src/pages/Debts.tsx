import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Grid3X3,
  Inbox,
  LayoutList,
  Pause,
  Play,
  Plus,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiErrorMessage } from '../lib/api'
import { fetchDebts, useDebtStats, useDebts, useTaxpayerSearch, useTaxTypesRef } from '../features/debt/api/queries'
import { useCloseDebt, useCreateDebt, useMarkOverdue, useResumeDebt, useSuspendDebt } from '../features/debt/api/mutations'
import { fmtMGA } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import type { TaxpayerSummary } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Input,
  Modal,
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import RowActionPortal from '../components/RowActionPortal'

/* ── Constants ── */
const originLabels: Record<string, string> = {
  ASSESSMENT: 'Imposition',
  DECLARATION: 'Déclaration',
  AUDIT: 'Audit',
  CONTROL: 'Contrôle',
  RECOVERY: 'Recouvrement',
  OTHER: 'Autre',
}

const originIcons: Record<string, React.ReactNode> = {
  ASSESSMENT: <TrendingUp className="h-3.5 w-3.5" />,
  DECLARATION: <FileText className="h-3.5 w-3.5" />,
  AUDIT: <Eye className="h-3.5 w-3.5" />,
  CONTROL: <Shield className="h-3.5 w-3.5" />,
  RECOVERY: <CreditCard className="h-3.5 w-3.5" />,
  OTHER: <Zap className="h-3.5 w-3.5" />,
}

const originTone: Record<string, 'indigo' | 'blue' | 'violet' | 'slate'> = {
  ASSESSMENT: 'indigo',
  DECLARATION: 'blue',
  AUDIT: 'violet',
  CONTROL: 'slate',
  RECOVERY: 'blue',
  OTHER: 'slate',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
}

const priorityTone: Record<string, 'slate' | 'blue' | 'amber' | 'rose'> = {
  LOW: 'slate',
  NORMAL: 'blue',
  HIGH: 'amber',
  URGENT: 'rose',
}

const priorityIcons: Record<string, React.ReactNode> = {
  LOW: <TrendingDown className="h-3.5 w-3.5" />,
  NORMAL: <ArrowUpRight className="h-3.5 w-3.5" />,
  HIGH: <TrendingUp className="h-3.5 w-3.5" />,
  URGENT: <Zap className="h-3.5 w-3.5" />,
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  DUE: 'Échue',
  PARTIALLY_PAID: 'Partielle',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  IN_COLLECTION: 'Recouvrement',
  DISPUTED: 'Contestée',
  SUSPENDED: 'Suspendue',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
}

const priorityNavItems = [
  { key: '', label: 'Toutes', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'URGENT', label: 'Urgente', icon: <Zap className="h-4 w-4" />, color: 'rose' },
  { key: 'HIGH', label: 'Haute', icon: <TrendingUp className="h-4 w-4" />, color: 'amber' },
  { key: 'NORMAL', label: 'Normale', icon: <ArrowUpRight className="h-4 w-4" />, color: 'blue' },
  { key: 'LOW', label: 'Basse', icon: <TrendingDown className="h-4 w-4" />, color: 'slate' },
]

/* ── Create Schema ── */
const createDebtSchema = z.object({
  taxpayerId: z.string().min(1, 'Le contribuable est requis.'),
  taxTypeCode: z.string().optional(),
  period: z.string().optional(),
  principal: z.string().min(1, 'Le montant est requis.').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Le montant doit être positif.'),
  observations: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
})

type CreateDebtForm = z.infer<typeof createDebtSchema>

/* ── Main Component ── */
export default function Debts() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [taxType, setTaxType] = useState(searchParams.get('taxTypeCode') ?? '')
  const [period, setPeriod] = useState(searchParams.get('period') ?? '')
  const [origin, setOrigin] = useState('')
  const [priority, setPriority] = useState('')
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [taxpayerSearch, setTaxpayerSearch] = useState('')
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<TaxpayerSummary | null>(null)
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CreateDebtForm>({
    resolver: zodResolver(createDebtSchema),
    defaultValues: { priority: 'NORMAL' },
  })
  const watchedPrincipal = watch('principal')
  const watchedPriority = watch('priority')
  const watchedTaxType = watch('taxTypeCode')
  const watchedPeriod = watch('period')
  const watchedObs = watch('observations')

  /* ── Query params ── */
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (taxType) params.set('taxTypeCode', taxType)
  if (period) params.set('period', period)
  if (origin) params.set('origin', origin)
  if (priority) params.set('priority', priority)
  if (q) params.set('q', q)

  /* ── Queries ── */
  const { data, isLoading } = useDebts(params.toString())
  const { data: stats } = useDebtStats()
  const { data: taxTypes } = useTaxTypesRef()
  const { data: taxpayerResults } = useTaxpayerSearch(taxpayerSearch)

  /* ── Mutations ── */
  const createMutation = useCreateDebt()
  const { mutate: markOverdue, isPending: markOverduePending } = useMarkOverdue()
  const suspendMutation = useSuspendDebt()
  const resumeMutation = useResumeDebt()
  const closeMutation = useCloseDebt()

  const exportCsv = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams(params)
      p.delete('page')
      p.delete('size')
      const rows = await fetchDebts(`${p.toString()}&size=9999`)
      downloadCsv(
        `creances_${new Date().toISOString().slice(0, 10)}.csv`,
        ['Référence', 'NIF', 'Contribuable', 'Impôt', 'Période', 'Origine', 'Priorité', 'Total', 'Payé', 'Solde', 'Jours retard', 'Statut'],
        rows.content.map((d) => [
          d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period,
          originLabels[d.origin] ?? d.origin, priorityLabels[d.collectionPriority] ?? d.collectionPriority,
          d.totalAmount, d.paidAmount, d.balance, d.daysOverdue, d.status,
        ]),
      )
    },
    onSuccess: () => toast.success('Export terminé'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  /* ── Derived ── */
  const hasFilters = !!(q || status || taxType || period || origin || priority)
  const activeFilterCount = [q, status, taxType, period, origin, priority].filter(Boolean).length

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (stats) {
      stats.byPriority?.forEach((p) => { counts[p.priority] = p.count })
    }
    return counts
  }, [stats])

  /* ── Handlers ── */
  function resetFilters() {
    setQ('')
    setStatus('')
    setTaxType('')
    setPeriod('')
    setOrigin('')
    setPriority('')
    setPage(0)
  }

  function removeFilter(kind: string) {
    switch (kind) {
      case 'q': setQ(''); break
      case 'status': setStatus(''); break
      case 'taxType': setTaxType(''); break
      case 'period': setPeriod(''); break
      case 'origin': setOrigin(''); break
      case 'priority': setPriority(''); break
    }
    setPage(0)
  }

  /* ── Skeleton ── */
  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-80 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="fx-page space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Créances fiscales"
        subtitle="Suivi des impayés, retards et actions de recouvrement."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button
              variant="secondary"
              onClick={() => markOverdue({ taxTypeCode: taxType, period, q })}
              disabled={markOverduePending}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <AlertTriangle className="h-4 w-4" /> Détecter les impayés
            </Button>
            <Button
              onClick={() => { reset(); setSelectedTaxpayer(null); setTaxpayerSearch(''); setCreateStep(0); setCreateOpen(true) }}
              className="bg-brand-600 text-white shadow-lg shadow-violet-500/25 hover:bg-brand-500 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Ajouter une créance
            </Button>
          </div>
        }
      />

      {/* ── Priority Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {priorityNavItems.map((item) => {
          const isActive = priority === item.key
          const count = item.key ? (priorityCounts[item.key] ?? 0) : (stats?.totalDebts ?? 0)
          return (
            <button
              key={item.key}
              onClick={() => { setPriority(item.key); setPage(0) }}
              className={`group flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-violet-500/50 dark:hover:text-violet-400'
              }`}
            >
              <span className={`transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-400'}`}>
                {item.icon}
              </span>
              {item.label}
              {count > 0 && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search & Filters ── */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); setPage(0) }}
            placeholder="Rechercher par référence, NIF ou nom du contribuable..."
            className="min-w-56 flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-violet-600 dark:text-violet-400' : ''}
          >
            <Filter className="h-4 w-4" /> Filtres
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="animate-fade-in border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Type d'impôt">
                <Select value={taxType} onChange={(e) => { setTaxType(e.target.value); setPage(0) }}>
                  <option value="">Tous les impôts</option>
                  {taxTypes?.map((tt) => (
                    <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Période">
                <Select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0) }}>
                  <option value="">Toutes les périodes</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                </Select>
              </Field>
              <Field label="Statut">
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                  <option value="">Tous les statuts</option>
                  <option value="ISSUED">Émise</option>
                  <option value="DUE">Échue</option>
                  <option value="PARTIALLY_PAID">Partiellement payée</option>
                  <option value="OVERDUE">En retard</option>
                  <option value="IN_COLLECTION">Recouvrement</option>
                  <option value="DISPUTED">Contestée</option>
                  <option value="SUSPENDED">Suspendue</option>
                  <option value="CLOSED">Clôturée</option>
                  <option value="PAID">Payée</option>
                  <option value="CANCELLED">Annulée</option>
                </Select>
              </Field>
              <Field label="Origine">
                <Select value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(0) }}>
                  <option value="">Toutes les origines</option>
                  <option value="ASSESSMENT">Imposition</option>
                  <option value="DECLARATION">Déclaration</option>
                  <option value="AUDIT">Audit</option>
                  <option value="CONTROL">Contrôle</option>
                  <option value="RECOVERY">Recouvrement</option>
                  <option value="OTHER">Autre</option>
                </Select>
              </Field>
            </div>
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Active filter chips ── */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtres actifs :</span>
            {q && (
              <button onClick={() => removeFilter('q')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Recherche : {q} <X className="h-3 w-3" />
              </button>
            )}
            {status && (
              <button onClick={() => removeFilter('status')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Statut : {statusLabels[status] ?? status} <X className="h-3 w-3" />
              </button>
            )}
            {taxType && (
              <button onClick={() => removeFilter('taxType')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Impôt : {taxType} <X className="h-3 w-3" />
              </button>
            )}
            {period && (
              <button onClick={() => removeFilter('period')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Période : {period} <X className="h-3 w-3" />
              </button>
            )}
            {origin && (
              <button onClick={() => removeFilter('origin')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Origine : {originLabels[origin] ?? origin} <X className="h-3 w-3" />
              </button>
            )}
            {priority && (
              <button onClick={() => removeFilter('priority')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Priorité : {priorityLabels[priority] ?? priority} <X className="h-3 w-3" />
              </button>
            )}
            <button onClick={resetFilters} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Tout effacer
            </button>
          </div>
        )}

        {/* ── Results count ── */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.totalElements != null ? (
              <>
                <span className="font-medium text-slate-700 dark:text-slate-300">{data.totalElements}</span>{' '}
                créance{data.totalElements > 1 ? 's' : ''} trouvée{data.totalElements > 1 ? 's' : ''}
              </>
            ) : (
              'Chargement...'
            )}
          </p>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700/50">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-600 dark:text-violet-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              aria-label="Vue liste"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-600 dark:text-violet-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              aria-label="Vue cartes"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {!data || data.content.length === 0 ? (
          <div className="py-14">
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Aucune créance trouvée"
              subtitle="Aucune créance ne correspond aux critères de recherche sélectionnés."
            />
            <div className="mt-4 flex justify-center gap-3">
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Réinitialiser les filtres
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Impôt</Th>
                  <Th>Origine</Th>
                  <Th>Priorité</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Payé</Th>
                  <Th className="text-right">Solde</Th>
                  <Th>Retard</Th>
                  <Th>Statut</Th>
                  <Th className="w-12"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {data.content.map((d) => {
                  const payProgress = d.totalAmount && Number(d.totalAmount) > 0
                    ? Math.min((Number(d.paidAmount) / Number(d.totalAmount)) * 100, 100)
                    : 0
                  const isOverdue = d.daysOverdue > 0

                  return (
                    <tr
                      key={d.id}
                      className="group cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-700/40"
                    >
                      {/* Référence */}
                      <Td>
                        <Link to={`/debts/${d.id}`} className="font-mono text-sm font-semibold text-violet-700 hover:underline dark:text-violet-400">
                          {d.reference}
                        </Link>
                      </Td>

                      {/* Contribuable */}
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-slate-100">{d.taxpayerName}</p>
                            <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{d.nif}</p>
                          </div>
                        </div>
                      </Td>

                      {/* Impôt */}
                      <Td>
                        <Badge tone="blue">{d.taxTypeCode}</Badge>
                      </Td>

                      {/* Origine */}
                      <Td>
                        <Badge tone={originTone[d.origin] ?? 'slate'}>
                          {originIcons[d.origin]}
                          {originLabels[d.origin] ?? d.origin}
                        </Badge>
                      </Td>

                      {/* Priorité */}
                      <Td>
                        <Badge tone={priorityTone[d.collectionPriority] ?? 'slate'}>
                          {priorityIcons[d.collectionPriority]}
                          {priorityLabels[d.collectionPriority] ?? d.collectionPriority}
                        </Badge>
                      </Td>

                      {/* Total */}
                      <Td className="text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(d.totalAmount)}</span>
                      </Td>

                      {/* Payé */}
                      <Td className="text-right">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{fmtMGA(d.paidAmount)}</span>
                      </Td>

                      {/* Solde */}
                      <Td className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-sm font-semibold ${Number(d.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {fmtMGA(d.balance)}
                          </span>
                          {d.totalAmount && Number(d.totalAmount) > 0 && (
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  payProgress >= 100
                                    ? 'bg-emerald-500'
                                    : payProgress > 50
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                                }`}
                                style={{ width: `${payProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </Td>

                      {/* Jours retard */}
                      <Td>
                        {isOverdue ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className={`h-3.5 w-3.5 ${d.daysOverdue > 90 ? 'text-rose-500' : d.daysOverdue > 30 ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-sm font-semibold ${d.daysOverdue > 90 ? 'text-rose-600 dark:text-rose-400' : d.daysOverdue > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {d.daysOverdue}j
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </Td>

                      {/* Statut */}
                      <Td>
                        <StatusBadge value={d.status} />
                      </Td>

                      {/* Actions */}
                      <Td>
                        <RowActionPortal>
                          <Link
                            to={`/debts/${d.id}`}
                            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                          </Link>
                          {d.status === 'SUSPENDED' && (
                            <button
                              onClick={() => resumeMutation.mutate(d.id)}
                              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            >
                              <Play className="h-4 w-4 shrink-0" /> Réactiver
                            </button>
                          )}
                          {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'SUSPENDED' && d.status !== 'CLOSED' && (
                            <button
                              onClick={() => suspendMutation.mutate({ id: d.id })}
                              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            >
                              <Pause className="h-4 w-4 shrink-0" /> Suspendre
                            </button>
                          )}
                          {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'CLOSED' && (
                            <>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                              <button
                                onClick={() => {
                                  if (confirm('Clôturer cette créance ?')) closeMutation.mutate(d.id)
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                              >
                                <Check className="h-4 w-4 shrink-0" /> Clôturer
                              </button>
                            </>
                          )}
                        </RowActionPortal>
                      </Td>
                    </tr>
                  )
                })}
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
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-4">
            {data.content.map((d) => {
              const payProgress = d.totalAmount && Number(d.totalAmount) > 0
                ? Math.min((Number(d.paidAmount) / Number(d.totalAmount)) * 100, 100)
                : 0
              const isOverdue = d.daysOverdue > 0
              return (
                <div key={d.id} className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 hover:border-violet-200 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:border-violet-500/30 dark:hover:shadow-violet-900/20" onClick={() => window.location.href = `/debts/${d.id}`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-400">{d.reference}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{d.nif}</p>
                        </div>
                      </div>
                      <StatusBadge value={d.status} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{d.taxpayerName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge tone="blue">{d.taxTypeCode}</Badge>
                          <Badge tone={originTone[d.origin] ?? 'slate'}>
                            {originIcons[d.origin]}
                            {originLabels[d.origin] ?? d.origin}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Total:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(d.totalAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Payé:</span>
                        <span className="text-slate-900 dark:text-slate-100">{fmtMGA(d.paidAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Solde:</span>
                        <span className={`font-semibold ${Number(d.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMGA(d.balance)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Progression:</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 flex-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              payProgress >= 100
                                ? 'bg-emerald-500'
                                : payProgress > 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                            }`}
                            style={{ width: `${payProgress}%` }}
                          />
                        </div>
                      </div>
                      {isOverdue && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className={`h-3.5 w-3.5 ${d.daysOverdue > 90 ? 'text-rose-500' : d.daysOverdue > 30 ? 'text-amber-500' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${d.daysOverdue > 90 ? 'text-rose-600 dark:text-rose-400' : d.daysOverdue > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {d.daysOverdue}j retard
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end">
                      <RowActionPortal>
                        <Link
                          to={`/debts/${d.id}`}
                          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                        </Link>
                        {d.status === 'SUSPENDED' && (
                          <button
                            onClick={() => resumeMutation.mutate(d.id)}
                            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          >
                            <Play className="h-4 w-4 shrink-0" /> Réactiver
                          </button>
                        )}
                        {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'SUSPENDED' && d.status !== 'CLOSED' && (
                          <button
                            onClick={() => suspendMutation.mutate({ id: d.id })}
                            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          >
                            <Pause className="h-4 w-4 shrink-0" /> Suspendre
                          </button>
                        )}
                        {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'CLOSED' && (
                          <>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                            <button
                              onClick={() => {
                                if (confirm('Clôturer cette créance ?')) closeMutation.mutate(d.id)
                              }}
                              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                            >
                              <Check className="h-4 w-4 shrink-0" /> Clôturer
                            </button>
                          </>
                        )}
                      </RowActionPortal>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Create Modal : wizard 3 étapes ── */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateStep(0); setTaxpayerSearch(''); setSelectedTaxpayer(null) }}
        title={`Étape ${createStep + 1}/3 — Ajouter une créance`}
        subtitle={createStep === 0 ? 'Sélection du contribuable' : createStep === 1 ? 'Détails fiscaux et montant' : 'Vérification et validation'}
        size="full"
      >
        <form
          onSubmit={handleSubmit((v) =>
            createMutation.mutate(v, {
              onSuccess: () => {
                setCreateOpen(false)
                setCreateStep(0)
                reset()
                setTaxpayerSearch('')
                setSelectedTaxpayer(null)
              },
            }),
          )}
          className="space-y-4"
          noValidate
        >
          {createMutation.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              {apiErrorMessage(createMutation.error)}
            </div>
          )}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= createStep ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-medium uppercase tracking-wide">
            {['Contribuable', 'Montant', 'Récapitulatif'].map((label, i) => (
              <span key={label} className={i <= createStep ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>{label}</span>
            ))}
          </div>

          {createStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <Field label="Contribuable (NIF ou nom)">
                <input
                  type="text"
                  placeholder="Rechercher par NIF ou nom... (min 2 caractères)"
                  value={taxpayerSearch}
                  onChange={(e) => setTaxpayerSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {taxpayerResults && taxpayerResults.content.length > 0 && !selectedTaxpayer && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {taxpayerResults.content.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setValue('taxpayerId', String(t.id), { shouldValidate: true })
                          setSelectedTaxpayer(t)
                          setTaxpayerSearch(`${t.nif} — ${t.name}`)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                          <p className="font-mono text-xs text-violet-600 dark:text-violet-400">{t.nif}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" {...register('taxpayerId')} />
                {errors.taxpayerId && <p className="mt-1 text-xs text-rose-600">{errors.taxpayerId.message}</p>}
              </Field>
              {selectedTaxpayer && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800/50 dark:bg-violet-900/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{selectedTaxpayer.name}</p>
                      <p className="font-mono text-xs text-violet-600 dark:text-violet-400">NIF : {selectedTaxpayer.nif}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setSelectedTaxpayer(null); setValue('taxpayerId', ''); setTaxpayerSearch('') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Type d'impôt">
                  <Select {...register('taxTypeCode')}>
                    <option value="">— Sélectionner —</option>
                    {taxTypes?.map((tt) => (
                      <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Période">
                  <Input placeholder="ex : 2024" {...register('period')} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Montant principal (MGA)">
                  <Input type="number" step="0.01" placeholder="0.00" {...register('principal')} />
                  {errors.principal && <p className="mt-1 text-xs text-rose-600">{errors.principal.message}</p>}
                  {watchedPrincipal && Number(watchedPrincipal) > 0 && (
                    <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400">{fmtMGA(Number(watchedPrincipal))}</p>
                  )}
                </Field>
                <Field label="Priorité">
                  <Select {...register('priority')}>
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="URGENT">Urgente</option>
                  </Select>
                </Field>
              </div>
              <Field label="Observations (facultatif)">
                <Input placeholder="Notes ou observations..." {...register('observations')} />
              </Field>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Récapitulatif</h4>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex justify-between"><span className="text-slate-500">Contribuable</span><span className="font-medium text-slate-900 dark:text-slate-100">{selectedTaxpayer ? `${selectedTaxpayer.name} (${selectedTaxpayer.nif})` : taxpayerSearch || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Impôt</span><span className="font-medium text-slate-900 dark:text-slate-100">{watchedTaxType || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Période</span><span className="font-medium text-slate-900 dark:text-slate-100">{watchedPeriod || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Montant</span><strong className="text-violet-600 dark:text-violet-400">{watchedPrincipal ? fmtMGA(Number(watchedPrincipal)) : '—'}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Priorité</span><span className="font-medium text-slate-900 dark:text-slate-100">{(watchedPriority && priorityLabels[watchedPriority]) || watchedPriority || '—'}</span></div>
                {watchedObs && <div className="flex justify-between gap-4"><span className="text-slate-500">Observations</span><span className="text-right font-medium text-slate-900 dark:text-slate-100">{watchedObs}</span></div>}
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <div>
              {createStep > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateStep(createStep - 1)}>← Précédent</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => { setCreateOpen(false); setCreateStep(0); setTaxpayerSearch(''); setSelectedTaxpayer(null) }}>
                Annuler
              </Button>
              {createStep < 2 ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-brand-600 text-white"
                  onClick={async () => {
                    if (createStep === 0) {
                      const ok = await trigger('taxpayerId')
                      if (ok) setCreateStep(1)
                    } else {
                      const ok = await trigger('principal')
                      if (ok) setCreateStep(2)
                    }
                  }}
                >
                  Suivant →
                </Button>
              ) : (
                <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-brand-600 text-white shadow-lg shadow-violet-500/25">
                  {createMutation.isPending ? 'Création...' : 'Créer la créance'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
