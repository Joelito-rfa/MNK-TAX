import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  Inbox,
  MoreHorizontal,
  Pause,
  Play,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import { fmtMGA } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import type { DebtStats, MarkOverdueResult, Page, TaxDebt, TaxType } from '../types'
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
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

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

/* ── Main Component ── */
export default function Debts() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [taxType, setTaxType] = useState(searchParams.get('taxTypeCode') ?? '')
  const [origin, setOrigin] = useState('')
  const [priority, setPriority] = useState('')
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  /* ── Query params ── */
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (taxType) params.set('taxTypeCode', taxType)
  if (origin) params.set('origin', origin)
  if (priority) params.set('priority', priority)
  if (q) params.set('q', q)

  /* ── Queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ['debts', page, size, status, taxType, origin, priority, q],
    queryFn: () => apiGet<Page<TaxDebt>>(`/debts?${params.toString()}`),
  })

  const { data: stats } = useQuery({
    queryKey: ['debt-stats'],
    queryFn: () => apiGet<DebtStats>('/debts/stats'),
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  /* ── Mutations ── */
  const { mutate: markOverdue, isPending: markOverduePending } = useMutation({
    mutationFn: () => apiPost('/debts/mark-overdue') as Promise<MarkOverdueResult>,
    onSuccess: (result: MarkOverdueResult) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (result.updated > 0) {
        toast.success(`${result.updated} créance(s) mise(s) en retard`)
      } else {
        toast.info('Aucune créance en retard détectée')
      }
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiPatch(`/debts/${id}/suspend`, reason ? { reason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      setActionMenu(null)
      toast.success('Créance suspendue')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: number) => apiPatch(`/debts/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      setActionMenu(null)
      toast.success('Créance réactivée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const closeMutation = useMutation({
    mutationFn: (id: number) => apiPatch(`/debts/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      setActionMenu(null)
      toast.success('Créance clôturée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportCsv = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams(params)
      p.delete('page')
      p.delete('size')
      const rows = await apiGet<Page<TaxDebt>>(`/debts?${p.toString()}&size=9999`)
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
  const hasFilters = !!(q || status || taxType || origin || priority)
  const activeFilterCount = [q, status, taxType, origin, priority].filter(Boolean).length

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
    setOrigin('')
    setPriority('')
    setPage(0)
  }

  function removeFilter(kind: string) {
    switch (kind) {
      case 'q': setQ(''); break
      case 'status': setStatus(''); break
      case 'taxType': setTaxType(''); break
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
    <div className="space-y-6">
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
              onClick={() => markOverdue()}
              disabled={markOverduePending}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <AlertTriangle className="h-4 w-4" /> Détecter les impayés
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
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
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
        ) : (
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
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenu(actionMenu === d.id ? null : d.id)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === d.id && (
                            <>
                              <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                              <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                                <div className="space-y-0.5">
                                <Link
                                  to={`/debts/${d.id}`}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  onClick={() => setActionMenu(null)}
                                >
                                  <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                                </Link>
                                {d.status === 'SUSPENDED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); resumeMutation.mutate(d.id) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                  >
                                    <Play className="h-4 w-4 shrink-0" /> Réactiver
                                  </button>
                                )}
                                {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'SUSPENDED' && d.status !== 'CLOSED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); suspendMutation.mutate({ id: d.id }) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                  >
                                    <Pause className="h-4 w-4 shrink-0" /> Suspendre
                                  </button>
                                )}
                                {d.status !== 'PAID' && d.status !== 'CANCELLED' && d.status !== 'CLOSED' && (
                                  <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm('Clôturer cette créance ?')) closeMutation.mutate(d.id)
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                                    >
                                      <Check className="h-4 w-4 shrink-0" /> Clôturer
                                    </button>
                                  </>
                                )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
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
        )}
      </Card>
    </div>
  )
}
