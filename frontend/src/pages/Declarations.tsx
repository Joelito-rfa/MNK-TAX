import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Grid3X3,
  Inbox,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import { apiErrorMessage } from '../lib/api'
import { declarationKeys } from '../features/declaration/api/keys'
import {
  fetchDeclarations,
  useDeclarationCalendar,
  useDeclarationDetail,
  useDeclarationHistory,
  useDeclarations,
  useDeclarationStats,
  useTaxpayersRef,
  useTaxTypesRef,
} from '../features/declaration/api/queries'
import {
  useCreateDeclaration,
  useDeclarationAction,
  useUpdateDeclaration,
} from '../features/declaration/api/mutations'
import { fmtDate, fmtDateTime, fmtNumber } from '../lib/format'
import type { CalendarEntry, Declaration, TaxType } from '../types'
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
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import RowActionPortal from '../components/RowActionPortal'

/* ── Constants ── */
const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  UNDER_REVIEW: 'En contrôle',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
  LIQUIDEE: 'Liquidée',
  PAYEE: 'Payée',
  A_CORRIGER: 'À corriger',
}

const statusToneMap: Record<string, string> = {
  DRAFT: 'slate',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'amber',
  VALIDATED: 'green',
  REJECTED: 'rose',
  CANCELLED: 'slate',
  LIQUIDEE: 'violet',
  PAYEE: 'emerald',
  A_CORRIGER: 'amber',
}

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <FileText className="h-4 w-4" />,
  SUBMITTED: <Send className="h-4 w-4" />,
  UNDER_REVIEW: <ShieldCheck className="h-4 w-4" />,
  VALIDATED: <CheckCircle2 className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
  PAYEE: <Check className="h-4 w-4" />,
  LIQUIDEE: <TrendingUp className="h-4 w-4" />,
  A_CORRIGER: <AlertTriangle className="h-4 w-4" />,
  CANCELLED: <Trash2 className="h-4 w-4" />,
}

const statusNavItems = [
  { key: '', label: 'Toutes', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'DRAFT', label: 'Brouillons', icon: <FileText className="h-4 w-4" /> },
  { key: 'SUBMITTED', label: 'Soumises', icon: <Send className="h-4 w-4" /> },
  { key: 'UNDER_REVIEW', label: 'En contrôle', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'VALIDATED', label: 'Validées', icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'PAYEE', label: 'Payées', icon: <Check className="h-4 w-4" /> },
  { key: 'REJECTED', label: 'Rejetées', icon: <XCircle className="h-4 w-4" /> },
  { key: 'A_CORRIGER', label: 'À corriger', icon: <AlertTriangle className="h-4 w-4" /> },
]

/* ── Main Component ── */
export default function Declarations() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [exerciceFilter, setExerciceFilter] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [createOpen, setCreateOpen] = useState(false)
  const [presetTaxTypeCode, setPresetTaxTypeCode] = useState('')
  const [presetPeriod, setPresetPeriod] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirmModal, setConfirmModal] = useState<{ type: string; id: number } | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [correctionMotif, setCorrectionMotif] = useState('')
  const [validateComment, setValidateComment] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'calendar'>('list')

  /* ── Ouverture pré-remplie depuis le calendrier (?new=1&taxType&period) ── */
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setPresetTaxTypeCode(searchParams.get('taxType') ?? '')
    setPresetPeriod(searchParams.get('period') ?? '')
    setCreateOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  /* ── Query params ── */
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (statusFilter) params.set('status', statusFilter)
  if (taxTypeFilter) params.set('taxTypeCode', taxTypeFilter)
  if (periodFilter) params.set('period', periodFilter)
  if (exerciceFilter) params.set('exercice', exerciceFilter)
  params.set('page', String(page))
  params.set('size', String(size))
  params.set('sort', `${sortField},${sortDir}`)

  /* ── Queries ── */
  const { data, isLoading } = useDeclarations(params.toString())
  const { data: stats } = useDeclarationStats()
  const { data: taxTypes } = useTaxTypesRef()

  /* ── Mutations ── */
  const doAction = useDeclarationAction()

  const exportMutation = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams(params)
      p.delete('page')
      p.delete('size')
      const rows = await fetchDeclarations(`${p.toString()}&size=9999`)
      const csv = [
        'Référence,NIF,Contribuable,Impôt,Période,Assiette,Déclaré,Calculé,Statut',
        ...rows.content.map(
          (d) =>
            `${d.reference},${d.nif},"${d.taxpayerName}",${d.taxTypeCode},${d.period},${d.taxBase},${d.declaredAmount},${d.calculatedTax ?? ''},${statusLabels[d.status] ?? d.status}`
        ),
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `declarations_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Export terminé'),
  })

  /* ── Derived ── */
  const hasFilters = !!(q || statusFilter || taxTypeFilter || periodFilter || exerciceFilter)
  const activeFilterCount = [q, statusFilter, taxTypeFilter, periodFilter, exerciceFilter].filter(Boolean).length

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (stats) {
      counts['DRAFT'] = stats.brouillons
      counts['SUBMITTED'] = stats.enAttente
      counts['UNDER_REVIEW'] = stats.enControle
      counts['VALIDATED'] = stats.validees
      counts['PAYEE'] = stats.payees
      counts['REJECTED'] = stats.rejetees
      counts['A_CORRIGER'] = stats.aCorriger
    }
    return counts
  }, [stats])

  /* ── Handlers ── */
  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }

  function resetFilters() {
    setQ('')
    setStatusFilter('')
    setTaxTypeFilter('')
    setPeriodFilter('')
    setExerciceFilter('')
    setPage(0)
  }

  function removeFilter(kind: string) {
    switch (kind) {
      case 'q': setQ(''); break
      case 'status': setStatusFilter(''); break
      case 'taxType': setTaxTypeFilter(''); break
      case 'period': setPeriodFilter(''); break
      case 'exercice': setExerciceFilter(''); break
    }
    setPage(0)
  }

  function getActions(d: Declaration) {
    const actions: { label: string; icon: React.ReactNode; action: () => void; danger?: boolean }[] = []
    actions.push({ label: 'Voir les détails', icon: <Eye className="h-4 w-4" />, action: () => navigate(`/declarations/${d.id}`) })
    if (d.status === 'DRAFT') {
      actions.push({ label: 'Modifier', icon: <Pencil className="h-4 w-4" />, action: () => navigate(`/declarations/${d.id}`) })
      actions.push({ label: 'Soumettre', icon: <Send className="h-4 w-4" />, action: () => doAction.mutate({ id: d.id, op: 'submit' }) })
      actions.push({ label: 'Supprimer', icon: <Trash2 className="h-4 w-4" />, action: () => setConfirmModal({ type: 'cancel', id: d.id }), danger: true })
    }
    if (d.status === 'SUBMITTED') {
      actions.push({ label: 'Contrôler', icon: <ShieldCheck className="h-4 w-4" />, action: () => doAction.mutate({ id: d.id, op: 'review' }) })
      actions.push({ label: 'Rejeter', icon: <XCircle className="h-4 w-4" />, action: () => setConfirmModal({ type: 'reject', id: d.id }), danger: true })
    }
    if (d.status === 'UNDER_REVIEW') {
      actions.push({ label: 'Valider', icon: <CheckCircle2 className="h-4 w-4" />, action: () => setConfirmModal({ type: 'validate', id: d.id }) })
      actions.push({ label: 'Rejeter', icon: <XCircle className="h-4 w-4" />, action: () => setConfirmModal({ type: 'reject', id: d.id }), danger: true })
      actions.push({ label: 'Demander correction', icon: <AlertTriangle className="h-4 w-4" />, action: () => setConfirmModal({ type: 'correction', id: d.id }) })
    }
    if (['VALIDATED', 'LIQUIDEE', 'PAYEE'].includes(d.status)) {
      actions.push({ label: 'Rectificative', icon: <Copy className="h-4 w-4" />, action: () => setConfirmModal({ type: 'rectificative', id: d.id }) })
    }
    if (d.status === 'A_CORRIGER') {
      actions.push({ label: 'Modifier', icon: <Pencil className="h-4 w-4" />, action: () => navigate(`/declarations/${d.id}`) })
    }
    return actions
  }

  /* ── Route: Detail page ── */
  if (routeId) {
    return <DetailPage id={Number(routeId)} onBack={() => navigate('/declarations')} />
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
        title="Déclarations"
        subtitle="Suivi, contrôle et validation des déclarations fiscales."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: declarationKeys.all })}>
              <RefreshCw className="h-4 w-4" /> Actualiser
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-brand-600 text-white shadow-lg shadow-violet-500/25 hover:bg-brand-500 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Nouvelle déclaration
            </Button>
          </div>
        }
      />

      {/* ── Status Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {statusNavItems.map((item) => {
          const isActive = statusFilter === item.key
          return (
            <button
              key={item.key}
              onClick={() => { setStatusFilter(item.key); setPage(0) }}
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
              {(item.key ? (statusCounts[item.key] ?? 0) : (stats?.total ?? 0)) > 0 && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {item.key ? (statusCounts[item.key] ?? 0) : (stats?.total ?? 0)}
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
            placeholder="Rechercher par référence, NIF, nom du contribuable..."
            className="min-w-56 flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-violet-600 dark:text-violet-400' : ''}
          >
            <Calendar className="h-4 w-4" /> Filtres
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
                <Select value={taxTypeFilter} onChange={(e) => { setTaxTypeFilter(e.target.value); setPage(0) }}>
                  <option value="">Tous les types</option>
                  {taxTypes?.map((t) => (
                    <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Période">
                <Input placeholder="2026-01" value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPage(0) }} />
              </Field>
              <Field label="Exercice">
                <Input placeholder="2026" value={exerciceFilter} onChange={(e) => { setExerciceFilter(e.target.value); setPage(0) }} />
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
            {statusFilter && (
              <button onClick={() => removeFilter('status')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Statut : {statusLabels[statusFilter] ?? statusFilter} <X className="h-3 w-3" />
              </button>
            )}
            {taxTypeFilter && (
              <button onClick={() => removeFilter('taxType')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Impôt : {taxTypeFilter} <X className="h-3 w-3" />
              </button>
            )}
            {periodFilter && (
              <button onClick={() => removeFilter('period')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Période : {periodFilter} <X className="h-3 w-3" />
              </button>
            )}
            {exerciceFilter && (
              <button onClick={() => removeFilter('exercice')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                Exercice : {exerciceFilter} <X className="h-3 w-3" />
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
                déclaration{data.totalElements > 1 ? 's' : ''} trouvée{data.totalElements > 1 ? 's' : ''}
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
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-600 dark:text-violet-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              aria-label="Vue calendrier"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {!data || data.content.length === 0 ? (
          <div className="py-14">
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Aucune déclaration trouvée"
              subtitle="Aucune déclaration ne correspond aux critères de recherche sélectionnés."
            />
            <div className="mt-4 flex justify-center gap-3">
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Réinitialiser les filtres
                </Button>
              )}
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Nouvelle déclaration
              </Button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <DeclarationsCalendar />
        ) : viewMode === 'list' ? (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  {[
                    { key: 'reference', label: 'Référence' },
                    { key: 'nif', label: 'NIF' },
                    { key: 'taxpayerName', label: 'Contribuable' },
                    { key: 'taxTypeCode', label: 'Impôt' },
                    { key: 'period', label: 'Période' },
                    { key: 'taxBase', label: 'Assiette' },
                    { key: 'declaredAmount', label: 'Déclaré' },
                    { key: 'totalAPayer', label: 'Total' },
                    { key: 'status', label: 'Statut' },
                  ].map((col) => (
                    <Th
                      key={col.key}
                      className="cursor-pointer select-none hover:text-violet-600 transition-colors"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    </Th>
                  ))}
                  <Th className="w-12"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {data.content.map((d) => (
                  <tr
                    key={d.id}
                    className="group cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-700/40"
                    onClick={() => navigate(`/declarations/${d.id}`)}
                  >
                    {/* Référence */}
                    <Td>
                      <span className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-400">
                        {d.reference}
                      </span>
                    </Td>

                    {/* NIF */}
                    <Td>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{d.nif}</span>
                    </Td>

                    {/* Contribuable */}
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{d.taxpayerName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{d.taxTypeCode}</p>
                        </div>
                      </div>
                    </Td>

                    {/* Impôt */}
                    <Td>
                      <Badge tone="blue">{d.taxTypeCode}</Badge>
                    </Td>

                    {/* Période */}
                    <Td>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{d.period}</span>
                    </Td>

                    {/* Assiette */}
                    <Td className="text-right">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{fmtNumber(d.taxBase)}</span>
                    </Td>

                    {/* Déclaré */}
                    <Td className="text-right">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{fmtNumber(d.declaredAmount)}</span>
                    </Td>

                    {/* Total */}
                    <Td className="text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {d.totalAPayer ? fmtNumber(d.totalAPayer) : '—'}
                      </span>
                    </Td>

                    {/* Statut */}
                    <Td>
                      <Badge tone={statusToneMap[d.status] as any}>
                        {statusIcons[d.status]}
                        {statusLabels[d.status] ?? d.status}
                      </Badge>
                    </Td>

                    {/* Actions */}
                    <Td>
                      <RowActionPortal>
                        {getActions(d).map((a, i) => (
                          <button
                            key={i}
                            onClick={() => a.action()}
                            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                              a.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span className="shrink-0">{a.icon}</span> {a.label}
                          </button>
                        ))}
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
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-4">
            {data.content.map((d) => (
              <Card className="group cursor-pointer transition hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800" onClick={() => navigate(`/declarations/${d.id}`)}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-400">{d.reference}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{d.nif}</p>
                      </div>
                    </div>
                    <Badge tone={statusToneMap[d.status] as any}>
                      {statusIcons[d.status]}
                      {statusLabels[d.status] ?? d.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{d.taxpayerName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{d.taxTypeCode}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{d.period}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Assiette:</span>
                      <span className="font-mono">{fmtNumber(d.taxBase)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Déclaré:</span>
                      <span className="font-mono">{fmtNumber(d.declaredAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Total:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{d.totalAPayer ? fmtNumber(d.totalAPayer) : '—'}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end">
                    <RowActionPortal>
                      {getActions(d).map((a, i) => (
                        <button
                          key={i}
                          onClick={() => a.action()}
                          className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                            a.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span className="shrink-0">{a.icon}</span> {a.label}
                        </button>
                      ))}
                    </RowActionPortal>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* ── Create Modal ── */}
      {createOpen && (
        <CreateDeclarationModal
          onClose={() => setCreateOpen(false)}
          taxTypes={taxTypes ?? []}
          presetTaxTypeCode={presetTaxTypeCode}
          presetPeriod={presetPeriod}
        />
      )}

      {/* ── Confirm modals ── */}
      {confirmModal && (
        <ConfirmActionModal
          type={confirmModal.type}
          onConfirm={() => {
            const done = { onSuccess: () => setConfirmModal(null) }
            if (confirmModal.type === 'validate') {
              doAction.mutate({ id: confirmModal.id, op: 'validate', body: { comment: validateComment } }, done)
            } else if (confirmModal.type === 'reject') {
              doAction.mutate({ id: confirmModal.id, op: 'reject', body: { motif: rejectMotif } }, done)
            } else if (confirmModal.type === 'correction') {
              doAction.mutate({ id: confirmModal.id, op: 'correction', body: { motif: correctionMotif } }, done)
            } else if (confirmModal.type === 'cancel') {
              doAction.mutate({ id: confirmModal.id, op: 'cancel' }, done)
            } else if (confirmModal.type === 'rectificative') {
              doAction.mutate({ id: confirmModal.id, op: 'rectificative', body: {} }, done)
            }
          }}
          onClose={() => setConfirmModal(null)}
          motif={confirmModal.type === 'reject' ? rejectMotif : correctionMotif}
          setMotif={confirmModal.type === 'reject' ? setRejectMotif : setCorrectionMotif}
          comment={validateComment}
          setComment={setValidateComment}
        />
      )}
    </div>
  )
}



/* ════════════════════════════════════════════════════════════ */
/* ───────────────────── Detail Page ────────────────────────── */
/* ════════════════════════════════════════════════════════════ */

function DetailPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: detail, isLoading } = useDeclarationDetail(id)
  const { data: history } = useDeclarationHistory(id)
  const [tab, setTab] = useState<'info' | 'calcul' | 'annexes' | 'historique'>('info')
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }
  if (!detail) return <Card className="p-8"><EmptyState title="Déclaration introuvable" /></Card>

  const remaining = Boolean(detail.resteAPayer) && Number(detail.resteAPayer) > 0
  const paid = detail.status === 'PAYEE'

  return (
    <div className="space-y-6">
      {/* ── Back + header ── */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Retour
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{detail.reference}</h1>
            <Badge tone={statusToneMap[detail.status] as any}>
              {statusIcons[detail.status]}
              {statusLabels[detail.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {detail.taxTypeName} — NIF {detail.nif} — {detail.taxpayerName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(detail.status === 'DRAFT' || detail.status === 'A_CORRIGER') && (
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Button>
          )}
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assiette</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{fmtNumber(detail.taxBase)}</p>
          <p className="text-xs text-slate-400">MGA</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Impôt calculé</p>
          <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">{detail.calculatedTax ? fmtNumber(detail.calculatedTax) : '—'}</p>
          <p className="text-xs text-slate-400">MGA</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total à payer</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{detail.totalAPayer ? fmtNumber(detail.totalAPayer) : '—'}</p>
          <p className="text-xs text-slate-400">MGA</p>
        </div>
        <div className={`rounded-2xl border p-4 ${remaining ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : paid ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reste à payer</p>
          <p className={`mt-1 text-lg font-bold ${remaining ? 'text-amber-600 dark:text-amber-400' : paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {detail.resteAPayer ? fmtNumber(detail.resteAPayer) : '0'}
          </p>
          <p className="text-xs text-slate-400">MGA</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['info', 'calcul', 'annexes', 'historique'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-violet-600 text-slate-900 dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t === 'info' ? 'Informations' : t === 'calcul' ? 'Calcul fiscal' : t === 'annexes' ? `Annexes (${detail.annexes.length})` : `Historique (${detail.historyCount})`}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Informations générales</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Référence" value={detail.reference} />
              <Row label="NIF" value={detail.nif} />
              <Row label="Contribuable" value={detail.taxpayerName} />
              <Row label="Impôt" value={`${detail.taxTypeCode} — ${detail.taxTypeName}`} />
              <Row label="Période" value={detail.period} />
              <Row label="Exercice" value={detail.exercice ?? '—'} />
              <Row label="Régime" value={detail.regime ?? '—'} />
              <Row label="Centre fiscal" value={detail.taxCenterName ?? '—'} />
              {detail.rectificative && <Row label="Rectificative" value={`Oui (origine: ${detail.declarationOrigineId})`} />}
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Situation financière</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Assiette" value={`${fmtNumber(detail.taxBase)} MGA`} />
              <Row label="Montant déclaré" value={`${fmtNumber(detail.declaredAmount)} MGA`} />
              <Row label="Taux" value={detail.taux ? `${detail.taux}%` : '—'} />
              <Row label="Impôt calculé" value={detail.calculatedTax ? `${fmtNumber(detail.calculatedTax)} MGA` : '—'} />
              <Row label="Pénalités" value={detail.penalites ? `${fmtNumber(detail.penalites)} MGA` : '0 MGA'} />
              <Row label="Total à payer" value={detail.totalAPayer ? `${fmtNumber(detail.totalAPayer)} MGA` : '—'} />
              <Row label="Montant payé" value={detail.montantPaye ? `${fmtNumber(detail.montantPaye)} MGA` : '0 MGA'} />
              <Row label="Reste à payer" value={detail.resteAPayer ? `${fmtNumber(detail.resteAPayer)} MGA` : '—'} />
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Dates</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Créée le" value={fmtDateTime(detail.createdAt)} />
              <Row label="Soumise le" value={detail.submissionDate ? fmtDate(detail.submissionDate) : '—'} />
              <Row label="Validée le" value={detail.validatedAt ? fmtDateTime(detail.validatedAt) : '—'} />
              <Row label="Échéance" value={detail.dateEcheance ? fmtDate(detail.dateEcheance) : '—'} />
              {detail.motifCorrection && <Row label="Motif correction" value={detail.motifCorrection} />}
            </dl>
          </Card>
          {detail.lines.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Lignes</h3>
              <Table>
                <thead><tr><Th>#</Th><Th>Libellé</Th><Th className="text-right">Montant</Th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {detail.lines.map((l) => (
                    <tr key={l.id}><Td>{l.lineNumber}</Td><Td>{l.label}</Td><Td className="text-right">{fmtNumber(l.amount)}</Td></tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {tab === 'calcul' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Calcul fiscal</h3>
          <div className="space-y-3">
            <CalcRow label="Base imposable" value={`${fmtNumber(detail.taxBase)} MGA`} />
            <CalcRow label="Taux appliqué" value={detail.taux ? `${detail.taux}%` : '—'} />
            <CalcRow label="Impôt calculé" value={detail.calculatedTax ? `${fmtNumber(detail.calculatedTax)} MGA` : '—'} highlight />
            <CalcRow label="Pénalités" value={detail.penalites ? `${fmtNumber(detail.penalites)} MGA` : '0 MGA'} />
            <CalcRow label="Total à payer" value={detail.totalAPayer ? `${fmtNumber(detail.totalAPayer)} MGA` : '—'} highlight />
            <CalcRow label="Montant payé" value={detail.montantPaye ? `${fmtNumber(detail.montantPaye)} MGA` : '0 MGA'} />
            <CalcRow label="Reste à payer" value={detail.resteAPayer ? `${fmtNumber(detail.resteAPayer)} MGA` : '—'} warn={remaining} />
          </div>
        </Card>
      )}

      {tab === 'annexes' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Pièces et annexes</h3>
          {detail.annexes.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8" />} title="Aucune annexe" subtitle="Aucune pièce n'a été jointe à cette déclaration." />
          ) : (
            <Table>
              <thead><tr><Th>Nom</Th><Th>Type</Th><Th>Taille</Th><Th>Ajouté par</Th><Th>Date</Th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {detail.annexes.map((a) => (
                  <tr key={a.id}>
                    <Td>{a.nom}</Td><Td>{a.typeMime}</Td><Td>{a.taille ? `${(a.taille / 1024).toFixed(1)} KB` : '—'}</Td><Td>{a.uploadedBy}</Td><Td>{fmtDate(a.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'historique' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Historique</h3>
          {!history || history.length === 0 ? (
            <EmptyState icon={<Clock className="h-8 w-8" />} title="Aucun historique" subtitle="Aucune action n'a été enregistrée pour cette déclaration." />
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      <span className="font-medium">{h.action}</span>
                      {h.ancienStatut && h.nouveauStatut && (
                        <span className="text-slate-400 dark:text-slate-500">
                          {' — '}{statusLabels[h.ancienStatut] ?? h.ancienStatut} → {statusLabels[h.nouveauStatut] ?? h.nouveauStatut}
                        </span>
                      )}
                    </p>
                    {h.commentaire && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{h.commentaire}</p>}
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {h.username ?? '—'} • {fmtDateTime(h.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {editOpen && <EditDeclarationModal declaration={detail} onClose={() => setEditOpen(false)} />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* ───────────────────── Edit Modal ─────────────────────────── */
/* ════════════════════════════════════════════════════════════ */

function EditDeclarationModal({ declaration, onClose }: { declaration: Declaration; onClose: () => void }) {
  const isCorrection = declaration.status === 'A_CORRIGER'
  const [exercice, setExercice] = useState(declaration.exercice ?? '')
  const [regime, setRegime] = useState(declaration.regime ?? '')
  const [taxBase, setTaxBase] = useState(String(declaration.taxBase ?? ''))
  const [declaredAmount, setDeclaredAmount] = useState(declaration.declaredAmount != null ? String(declaration.declaredAmount) : '')
  const [taux, setTaux] = useState(declaration.taux != null ? String(declaration.taux) : '')
  const [dateEcheance, setDateEcheance] = useState(declaration.dateEcheance ?? '')
  const [lines, setLines] = useState<{ label: string; amount: string }[]>(
    declaration.lines.length > 0
      ? declaration.lines.map((l) => ({ label: l.label, amount: String(l.amount) }))
      : [{ label: '', amount: '' }],
  )

  const editMutation = useUpdateDeclaration()

  return (
    <Modal open onClose={onClose} title={isCorrection ? 'Corriger la déclaration' : 'Modifier la déclaration'} subtitle={`${declaration.reference} — ${declaration.taxTypeCode} · ${declaration.period}`} wide>
      <div className="space-y-4">
        {editMutation.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            {apiErrorMessage(editMutation.error)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exercice"><Input value={exercice} onChange={(e) => setExercice(e.target.value)} placeholder="2026" /></Field>
          <Field label="Régime"><Input value={regime} onChange={(e) => setRegime(e.target.value)} placeholder="ex : RNE" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base imposable (MGA) *"><Input type="number" min="0" value={taxBase} onChange={(e) => setTaxBase(e.target.value)} /></Field>
          <Field label="Taux (%)"><Input type="number" min="0" step="0.01" value={taux} onChange={(e) => setTaux(e.target.value)} /></Field>
        </div>
        <Field label="Montant déclaré (MGA)"><Input type="number" min="0" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} /></Field>
        <Field label="Date d'échéance"><Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} /></Field>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Lignes de détail</p>
          {lines.map((l, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input placeholder="Libellé" value={l.label} onChange={(e) => { const n = [...lines]; n[i].label = e.target.value; setLines(n) }} className="flex-1" />
              <Input type="number" min="0" placeholder="Montant" value={l.amount} onChange={(e) => { const n = [...lines]; n[i].amount = e.target.value; setLines(n) }} className="w-32" />
              {lines.length > 1 && <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-rose-600"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          <Button variant="ghost" size="sm" type="button" onClick={() => setLines([...lines, { label: '', amount: '' }])}>+ Ajouter une ligne</Button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
          <Button
            type="button"
            onClick={() =>
              editMutation.mutate(
                {
                  id: declaration.id,
                  isCorrection,
                  body: {
                    taxBase: Number(taxBase),
                    declaredAmount: declaredAmount ? Number(declaredAmount) : undefined,
                    taux: taux ? Number(taux) : undefined,
                    exercice: exercice || undefined,
                    regime: regime || undefined,
                    dateEcheance: dateEcheance || undefined,
                    lines: lines
                      .filter((l) => l.label)
                      .map((l, i) => ({ lineNumber: i + 1, label: l.label, amount: Number(l.amount) || 0 })),
                  },
                },
                { onSuccess: onClose },
              )
            }
            disabled={editMutation.isPending || !taxBase}
          >
            {editMutation.isPending ? 'Enregistrement…' : isCorrection ? 'Appliquer la correction' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* ───────────────────── Create Modal ───────────────────────── */
/* ════════════════════════════════════════════════════════════ */

function CreateDeclarationModal({ onClose, taxTypes, presetTaxTypeCode = '', presetPeriod = '' }: {
  onClose: () => void
  taxTypes: TaxType[]
  presetTaxTypeCode?: string
  presetPeriod?: string
}) {
  const [step, setStep] = useState(1)
  const [taxpayerId, setTaxpayerId] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState(presetTaxTypeCode)
  const [period, setPeriod] = useState(presetPeriod)
  const [exercice, setExercice] = useState(new Date().getFullYear().toString())
  const [regime, setRegime] = useState('')
  const [taxBase, setTaxBase] = useState('')
  const [declaredAmount, setDeclaredAmount] = useState('')
  const [taux, setTaux] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [lines, setLines] = useState<{ label: string; amount: string }[]>([{ label: '', amount: '' }])

  const { data: taxpayers, isLoading: loadingTaxpayers } = useTaxpayersRef()

  const selectedTaxpayer = taxpayers?.content.find((t) => String(t.id) === taxpayerId) ?? null

  const createMutation = useCreateDeclaration()

  return (
    <Modal open onClose={onClose} title={`Étape ${step}/4 — Nouvelle déclaration`} wide>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <Field label="Contribuable">
            <Select value={taxpayerId} onChange={(e) => { setTaxpayerId(e.target.value); setStep(2) }}>
              <option value="">— Sélectionner un contribuable —</option>
              {loadingTaxpayers
                ? null
                : taxpayers?.content.map((t) => (
                    <option key={t.id} value={t.id}>{t.nif} — {t.name}</option>
                  ))}
            </Select>
          </Field>
        </div>
      )}
      {step === 2 && selectedTaxpayer && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="font-medium text-slate-900 dark:text-slate-100">{selectedTaxpayer.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">NIF: {selectedTaxpayer.nif} — Type: {selectedTaxpayer.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}</p>
          </div>
          <Field label="Type d'impôt">
            <Select value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)}>
              <option value="">Sélectionner</option>
              {taxTypes.filter((t) => t.active).map((t) => (
                <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Période (ex: 2026-01)"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-01" /></Field>
            <Field label="Exercice"><Input value={exercice} onChange={(e) => setExercice(e.target.value)} placeholder="2026" /></Field>
          </div>
          <Field label="Régime (optionnel)"><Input value={regime} onChange={(e) => setRegime(e.target.value)} placeholder="ex: RNE" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
            <Button onClick={() => { if (taxTypeCode && period) setStep(3) }} disabled={!taxTypeCode || !period}>Suivant</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base imposable (MGA)"><Input type="number" min="0" value={taxBase} onChange={(e) => setTaxBase(e.target.value)} /></Field>
            <Field label="Taux (%)"><Input type="number" min="0" step="0.01" value={taux} onChange={(e) => setTaux(e.target.value)} /></Field>
          </div>
          <Field label="Montant déclaré (MGA)"><Input type="number" min="0" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} /></Field>
          <Field label="Date d'échéance"><Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} /></Field>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">Lignes de détail</p>
            {lines.map((l, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Input placeholder="Libellé" value={l.label} onChange={(e) => { const n = [...lines]; n[i].label = e.target.value; setLines(n) }} className="flex-1" />
                <Input type="number" min="0" placeholder="Montant" value={l.amount} onChange={(e) => { const n = [...lines]; n[i].amount = e.target.value; setLines(n) }} className="w-32" />
                {lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-rose-600"><X className="h-4 w-4" /></button>}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setLines([...lines, { label: '', amount: '' }])}>+ Ajouter une ligne</Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>Retour</Button>
            <Button onClick={() => setStep(4)}>Suivant</Button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Récapitulatif</h4>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2 dark:border-slate-700 dark:bg-slate-800/50">
            <RecapRow label="Contribuable" value={`${selectedTaxpayer?.name} (${selectedTaxpayer?.nif})`} />
            <RecapRow label="Impôt" value={taxTypeCode} />
            <RecapRow label="Période" value={period} />
            <RecapRow label="Exercice" value={exercice} />
            <RecapRow label="Base imposable" value={`${fmtNumber(Number(taxBase))} MGA`} />
            {taux && <RecapRow label="Taux" value={`${taux}%`} />}
            {declaredAmount && <RecapRow label="Déclaré" value={`${fmtNumber(Number(declaredAmount))} MGA`} />}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(3)}>Retour</Button>
            <Button
              onClick={() =>
                createMutation.mutate(
                  {
                    taxpayerId: Number(taxpayerId),
                    taxTypeCode,
                    period,
                    exercice,
                    regime: regime || undefined,
                    taxBase: Number(taxBase),
                    declaredAmount: declaredAmount ? Number(declaredAmount) : undefined,
                    taux: taux ? Number(taux) : undefined,
                    dateEcheance: dateEcheance || undefined,
                    lines: lines
                      .filter((l) => l.label)
                      .map((l, i) => ({ lineNumber: i + 1, label: l.label, amount: Number(l.amount) || 0 })),
                  },
                  { onSuccess: onClose },
                )
              }
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Création…' : 'Créer la déclaration'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* ─────────────────── Confirm Modal ────────────────────────── */
/* ════════════════════════════════════════════════════════════ */

function ConfirmActionModal({ type, onConfirm, onClose, motif, setMotif, comment, setComment }: {
  type: string; onConfirm: () => void; onClose: () => void;
  motif: string; setMotif: (v: string) => void;
  comment: string; setComment: (v: string) => void;
}) {
  const titles: Record<string, string> = {
    validate: 'Valider la déclaration', reject: 'Rejeter la déclaration',
    correction: 'Demander une correction', cancel: 'Annuler la déclaration',
    rectificative: 'Créer une déclaration rectificative',
  }
  return (
    <Modal open onClose={onClose} title={titles[type] ?? type}>
      <div className="space-y-4">
        {type === 'validate' && (
          <Field label="Commentaire (optionnel)"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire de validation" /></Field>
        )}
        {(type === 'reject' || type === 'correction') && (
          <Field label="Motif *"><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif obligatoire" /></Field>
        )}
        {type === 'cancel' && <p className="text-sm text-slate-500 dark:text-slate-400">Êtes-vous sûr de vouloir annuler cette déclaration ? Cette action est irréversible.</p>}
        {type === 'rectificative' && <p className="text-sm text-slate-500 dark:text-slate-400">Une nouvelle déclaration rectificative sera créée basée sur cette déclaration.</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            onClick={onConfirm}
            disabled={(type === 'reject' || type === 'correction') && !motif}
            variant={type === 'reject' || type === 'cancel' ? 'danger' : 'primary'}
          >
            Confirmer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* ──────────────────── Shared Helpers ──────────────────────── */
/* ════════════════════════════════════════════════════════════ */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/50 px-3 py-2 dark:bg-slate-800/30">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-right text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}

function CalcRow({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
      highlight
        ? 'border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-900/20'
        : warn
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
    }`}>
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${
        highlight
          ? 'text-violet-600 dark:text-violet-400'
          : warn
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-900 dark:text-slate-100'
      }`}>{value}</span>
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}

/* ──────────────────────── Calendrier des déclarations ──────────────────────── */

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const CLOSED_DECLARATION_STATUSES = ['VALIDATED', 'LIQUIDEE', 'PAYEE', 'CANCELLED']

/** Vue calendrier annuelle alimentée par `GET /declarations/calendar?year=`. */
function DeclarationsCalendar() {
  const navigate = useNavigate()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data, isLoading } = useDeclarationCalendar(year)

  const entries = useMemo(() => data ?? [], [data])
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = (e: CalendarEntry) =>
    !!e.dateEcheance && e.dateEcheance < today && !CLOSED_DECLARATION_STATUSES.includes(e.status)

  const buckets = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>()
    for (let m = 0; m < 12; m += 1) map.set(m, [])
    entries.forEach((e) => {
      if (!e.dateEcheance) return
      const month = new Date(e.dateEcheance).getMonth()
      if (month >= 0 && month < 12) map.get(month)!.push(e)
    })
    map.forEach((list) => list.sort((a, b) => (a.dateEcheance ?? '').localeCompare(b.dateEcheance ?? '')))
    return map
  }, [entries])

  const overdueCount = entries.filter(isOverdue).length

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setYear((y) => y - 1)} aria-label="Année précédente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-16 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{year}</span>
          <Button variant="ghost" size="sm" onClick={() => setYear((y) => y + 1)} aria-label="Année suivante">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="slate">
            {entries.length} échéance{entries.length > 1 ? 's' : ''}
          </Badge>
          {overdueCount > 0 && (
            <Badge tone="red">
              {overdueCount} en retard
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title={`Aucune échéance en ${year}`}
          subtitle="Aucune déclaration avec échéance sur cette année."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from(buckets.entries()).map(([month, list]) =>
            list.length === 0 ? null : (
              <div key={month} className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{MONTH_NAMES[month]}</p>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{list.length}</span>
                </div>
                <ul className="divide-y divide-slate-50 dark:divide-slate-700/40">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => navigate(`/declarations/${e.id}`)}
                        className="w-full px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-medium text-violet-700 dark:text-violet-400">{e.reference}</span>
                          <span
                            className={`text-xs tabular-nums ${
                              isOverdue(e) ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {e.dateEcheance ? fmtDate(e.dateEcheance) : '—'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">{e.taxpayerName}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone={statusToneMap[e.status] as any}>
                            {statusIcons[e.status]}
                            {statusLabels[e.status] ?? e.status}
                          </Badge>
                          <Badge tone="slate">{e.taxTypeCode}</Badge>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{e.period}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
