import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import type { AuditLog, Page } from '../types'
import { Button, Card, EmptyState } from '../components/ui'
import { UserAvatar } from '../components/UserAvatar'
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  FileText,
  FileClock,
  Filter,
  LogIn,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  Wallet,
  X,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react'

/* ═══════════════════════════ Constantes ═══════════════════════════ */

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CREATE: { label: 'Creation', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: <Check className="h-3 w-3" /> },
  UPDATE: { label: 'Modification', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Check className="h-3 w-3" /> },
  DELETE: { label: 'Suppression', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: <Trash2 className="h-3 w-3" /> },
  VALIDATE: { label: 'Validation', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECT: { label: 'Rejet', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', icon: <AlertTriangle className="h-3 w-3" /> },
  LOGIN: { label: 'Connexion', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', icon: <LogIn className="h-3 w-3" /> },
  LOGIN_FAILED: { label: 'Echec connexion', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: <LogOut className="h-3 w-3" /> },
  PAYMENT: { label: 'Paiement', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: <CreditCard className="h-3 w-3" /> },
  SUBMIT: { label: 'Soumission', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', icon: <Upload className="h-3 w-3" /> },
  ADJUSTMENT: { label: 'Ajustement', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Check className="h-3 w-3" /> },
  MARK_OVERDUE: { label: 'Marquage retard', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', icon: <Clock className="h-3 w-3" /> },
  RULE_CHANGE: { label: 'Modification regle', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: <Check className="h-3 w-3" /> },
  PASSWORD_CHANGE: { label: 'Changement mot de passe', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: <Check className="h-3 w-3" /> },
  ENABLE: { label: 'Activation', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  DISABLE: { label: 'Desactivation', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: <AlertTriangle className="h-3 w-3" /> },
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  DECLARATION: <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
  RECEIPT: <Wallet className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
  DEBT: <CreditCard className="h-4 w-4 text-rose-500 dark:text-rose-400" />,
  PAYMENT: <CreditCard className="h-4 w-4 text-violet-500 dark:text-violet-400" />,
  TAXPAYER: <Shield className="h-4 w-4 text-sky-500 dark:text-sky-400" />,
  ROLE: <ShieldCheck className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
  USER: <Shield className="h-4 w-4 text-violet-500 dark:text-violet-400" />,
  AVATAR: <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
  PROFILE: <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
  CONTROL: <FileClock className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />,
  COLLECTION: <Activity className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
  MESSAGE: <FileText className="h-4 w-4 text-sky-500 dark:text-sky-400" />,
  RULE: <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
  SYSTEM: <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
}

const ENTITY_COLORS: Record<string, string> = {
  DECLARATION: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  RECEIPT: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  DEBT: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
  PAYMENT: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  TAXPAYER: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400',
  ROLE: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  USER: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  AVATAR: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  PROFILE: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  CONTROL: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  COLLECTION: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  MESSAGE: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400',
  RULE: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  SYSTEM: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
}

const ENTITY_LABELS: Record<string, string> = {
  DECLARATION: 'Declaration',
  RECEIPT: 'Quittance',
  DEBT: 'Creance',
  PAYMENT: 'Paiement',
  TAXPAYER: 'Contribuable',
  ROLE: 'Role',
  USER: 'Utilisateur',
  AVATAR: 'Avatar',
  PROFILE: 'Profil',
  CONTROL: 'Controle',
  COLLECTION: 'Recouvrement',
  MESSAGE: 'Message',
  RULE: 'Regle',
  SYSTEM: 'Systeme',
  ASSESSMENT: 'Imposition',
}

const DATE_OPTIONS = [
  { id: 'all', label: 'Toutes les dates' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: '7d', label: '7 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
]

const PAGE_SIZES = [10, 25, 50, 100]

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label: action,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-700',
    icon: <Activity className="h-3 w-3" />,
  }
}

function getEntityIcon(entityType: string) {
  return ENTITY_ICONS[entityType] ?? <FileText className="h-4 w-4 text-slate-400" />
}

function getEntityColor(entityType: string) {
  return ENTITY_COLORS[entityType] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
}

function getEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? entityType
}

function getDateRange(dateOption: string): { from?: string; to?: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (dateOption) {
    case 'today':
      return { from: today.toISOString() }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: yesterday.toISOString(), to: today.toISOString() }
    }
    case '7d': {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      return { from: d.toISOString() }
    }
    case '30d': {
      const d = new Date(today)
      d.setDate(d.getDate() - 30)
      return { from: d.toISOString() }
    }
    default:
      return {}
  }
}



function formatDateShort(iso: string): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatUserAgent(ua: string | null): string {
  if (!ua) return '--'
  if (ua.length > 60) return ua.substring(0, 60) + '...'
  return ua
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function AuditLogs() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortField, setSortField] = useState<'date' | 'user' | 'action' | 'entity'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtersRef = useRef<HTMLDivElement>(null)

  /* -- Fermer filtres au clic exterieur -- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        // Ne pas fermer si on clique sur le bouton filtres
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* -- Construction des params API -- */
  const dateRange = useMemo(() => getDateRange(filterDate), [filterDate])

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(pageSize) })
    if (search.trim()) p.set('username', search.trim())
    if (filterAction) p.set('action', filterAction)
    if (filterEntity) p.set('entityType', filterEntity)
    if (dateRange.from) p.set('from', dateRange.from)
    if (dateRange.to) p.set('to', dateRange.to)
    return p.toString()
  }, [page, pageSize, search, filterAction, filterEntity, dateRange])

  /* -- Query -- */
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => apiGet<Page<AuditLog>>(`/audit-logs?${params}`),
  })

  /* -- Tri cote client -- */
  const sortedLogs = useMemo(() => {
    if (!data) return []
    const logs = [...data.content]
    logs.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
        case 'user': cmp = (a.username ?? '').localeCompare(b.username ?? ''); break
        case 'action': cmp = a.action.localeCompare(b.action); break
        case 'entity': cmp = a.entityType.localeCompare(b.entityType); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return logs
  }, [data, sortField, sortDir])

  /* -- Filtres actifs -- */
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []
    if (search.trim()) filters.push({ key: 'search', label: `Recherche: "${search}"`, value: search })
    if (filterAction) filters.push({ key: 'action', label: `Action: ${ACTION_CONFIG[filterAction]?.label ?? filterAction}`, value: filterAction })
    if (filterEntity) filters.push({ key: 'entity', label: `Entite: ${getEntityLabel(filterEntity)}`, value: filterEntity })
    if (filterDate !== 'all') filters.push({ key: 'date', label: `Date: ${DATE_OPTIONS.find((d) => d.id === filterDate)?.label}`, value: filterDate })
    return filters
  }, [search, filterAction, filterEntity, filterDate])

  const removeFilter = useCallback((key: string) => {
    switch (key) {
      case 'search': setSearch(''); break
      case 'action': setFilterAction(''); break
      case 'entity': setFilterEntity(''); break
      case 'date': setFilterDate('all'); break
    }
    setPage(0)
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setFilterAction('')
    setFilterEntity('')
    setFilterDate('all')
    setPage(0)
  }, [])

  /* -- Selection -- */
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!data) return
    if (selectedIds.size === data.content.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.content.map((l) => l.id)))
    }
  }, [data, selectedIds.size])

  /* -- Sort -- */
  const toggleSort = useCallback((field: 'date' | 'user' | 'action' | 'entity') => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-violet-500" /> : <ArrowDown className="h-3 w-3 text-violet-500" />
  }

  /* -- Loading -- */
  if (isLoading) return <AuditSkeleton />

  /* -- Error -- */
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
              Journal d'audit
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Traçabilite des actions sensibles et des connexions
            </p>
          </div>
        </div>
        <Card className="py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Impossible de charger le journal d'audit</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Verifiez votre connexion puis reessayez.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Reessayer
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const logs = data?.content ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="fx-simple space-y-5">
      {/* === 1. HEADER === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
              Journal d'audit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              <ShieldCheck className="h-3 w-3" />
              Securise
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Traçabilite des actions sensibles et des connexions
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {
            if (!data) return
            const csv = ['Date,Utilisateur,Action,Entite,IP'].concat(
              data.content.map((l) => `"${l.createdAt}","${l.username}","${l.action}","${l.entityType} #${l.entityId}","${l.ipAddress || ''}"`),
            ).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </div>
      </div>

      {/* === 2. CONTEXT LINE === */}
      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <FileClock className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-600 dark:text-slate-300">{totalElements}</span> evenement{totalElements !== 1 ? 's' : ''} enregistre{totalElements !== 1 ? 's' : ''}
        </span>
        {activeFilters.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
            <Filter className="h-3 w-3" />
            {activeFilters.length} filtre{activeFilters.length > 1 ? 's' : ''} actif{activeFilters.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* === 3. SEARCH AND FILTERS === */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Rechercher un utilisateur, une action, une entite ou une reference..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(0) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              showFilters || activeFilters.length > 0
                ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres
            {activeFilters.length > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                {activeFilters.length}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Reset */}
          {activeFilters.length > 0 && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 transition">
              <X className="h-3.5 w-3.5" />
              Reinitialiser
            </button>
          )}

          <div className="flex-1" />

          {/* Page size */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-xs">Afficher</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs">par page</span>
          </div>
        </div>

        {/* === 4. FILTER PANEL === */}
        {showFilters && (
          <div ref={filtersRef} className="border-b border-slate-200/70 bg-slate-50/50 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Action */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Action</label>
                <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-violet-400">
                  <option value="">Toutes les actions</option>
                  {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              {/* Entity */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Entite</label>
                <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(0) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-violet-400">
                  <option value="">Toutes les entites</option>
                  {Object.keys(ENTITY_LABELS).map((key) => (
                    <option key={key} value={key}>{ENTITY_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Periode</label>
                <select value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(0) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-violet-400">
                  {DATE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <div className="flex items-end">
                <button onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                  <X className="h-4 w-4" />
                  Reinitialiser tout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === 5. ACTIVE FILTER CHIPS === */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
            {activeFilters.map((f) => (
              <span key={f.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition dark:bg-violet-900/30 dark:text-violet-400">
                <Tag className="h-3 w-3" />
                {f.label}
                <button onClick={() => removeFilter(f.key)} className="ml-0.5 rounded-full p-0.5 hover:bg-violet-100 dark:hover:bg-violet-800/50">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition">
              Tout effacer
            </button>
          </div>
        )}

        {/* === 6. SELECTION BAR === */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-violet-200 bg-violet-50 px-5 py-2.5 dark:border-violet-800 dark:bg-violet-900/20">
            <p className="text-sm font-medium text-violet-700 dark:text-violet-400">
              {selectedIds.size} evenement{selectedIds.size > 1 ? 's' : ''} selectionne{selectedIds.size > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => {
                const logsToCopy = data?.content.filter((l) => selectedIds.has(l.id)) ?? []
                const text = logsToCopy.map((l) => `${l.createdAt} | ${l.username} | ${l.action} | ${l.entityType} #${l.entityId} | ${l.ipAddress || '--'}`).join('\n')
                copyToClipboard(text)
              }}>
                <Copy className="h-3.5 w-3.5" /> Copier
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-800/50">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* === 7. TABLE === */}
        {logs.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<FileClock className="h-10 w-10" />} title="Aucun evenement trouve"
              subtitle={activeFilters.length > 0 ? "Aucun evenement ne correspond aux criteres selectionnes." : "Le journal d'audit est vide."} />
            {activeFilters.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Reinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  {/* Checkbox */}
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.size === logs.length && logs.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-violet-600" />
                  </th>
                  {/* Date */}
                  <th className="cursor-pointer select-none whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    onClick={() => toggleSort('date')}>
                    <span className="inline-flex items-center gap-1.5">
                      Date <SortIcon field="date" />
                    </span>
                  </th>
                  {/* User */}
                  <th className="cursor-pointer select-none whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    onClick={() => toggleSort('user')}>
                    <span className="inline-flex items-center gap-1.5">
                      Utilisateur <SortIcon field="user" />
                    </span>
                  </th>
                  {/* Action */}
                  <th className="cursor-pointer select-none whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    onClick={() => toggleSort('action')}>
                    <span className="inline-flex items-center gap-1.5">
                      Action <SortIcon field="action" />
                    </span>
                  </th>
                  {/* Entity */}
                  <th className="cursor-pointer select-none whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    onClick={() => toggleSort('entity')}>
                    <span className="inline-flex items-center gap-1.5">
                      Entite <SortIcon field="entity" />
                    </span>
                  </th>
                  {/* IP */}
                  <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">IP</th>
                  {/* Actions */}
                  <th className="w-10 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {sortedLogs.map((log) => {
                  const actionCfg = getActionConfig(log.action)
                  const isSelected = selectedIds.has(log.id)
                  return (
                    <tr key={log.id}
                      onClick={() => setSelected(log)}
                      className={`group cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-violet-50/80 dark:bg-violet-900/10'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'
                      }`}>
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(log.id)}
                          className="h-4 w-4 rounded accent-violet-600" />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatDateShort(log.createdAt)}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {log.userId ? (
                            <UserAvatar userId={log.userId} name={log.username ?? ''} size="sm" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              <Activity className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                              {log.username || 'system'}
                            </p>
                            <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                              {log.userId ? 'Utilisateur' : 'Systeme'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionCfg.bg} ${actionCfg.color}`}>
                          {actionCfg.icon}
                          {actionCfg.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${getEntityColor(log.entityType)}`}>
                            {getEntityIcon(log.entityType)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                              {getEntityLabel(log.entityType)}
                            </p>
                            <p className="truncate text-[11px] font-mono text-slate-400 dark:text-slate-500">
                              #{log.entityId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {log.ipAddress || '--'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelected(log)}
                          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all duration-150 hover:bg-slate-100 hover:text-violet-600 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
                          aria-label="Voir les details">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* === 8. PAGINATION === */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} sur{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">{totalElements}</span> evenements
            </p>
            <div className="flex items-center gap-1">
              <PaginationBtn disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronDown className="h-4 w-4 rotate-90" />
              </PaginationBtn>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                const p = start + i
                if (p >= totalPages) return null
                return (
                  <PaginationBtn key={p} active={p === page} onClick={() => setPage(p)}>
                    {p + 1}
                  </PaginationBtn>
                )
              })}
              {totalPages > 5 && <span className="px-1 text-sm text-slate-400">...</span>}
              <PaginationBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </PaginationBtn>
            </div>
          </div>
        )}
      </Card>

      {/* === 9. DETAIL DRAWER === */}
      {selected && <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} onFilterUser={(u) => { setSelected(null); setSearch(u); setPage(0) }} />}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

function PaginationBtn({ children, active = false, disabled = false, onClick }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition ${
        active
          ? 'bg-violet-600 font-semibold text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
      }`}>
      {children}
    </button>
  )
}

/* -- Audit Detail Drawer -- */
function AuditDetailDrawer({ log, onClose, onFilterUser }: { log: AuditLog; onClose: () => void; onFilterUser: (u: string) => void }) {
  const actionCfg = getActionConfig(log.action)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full max-w-md animate-drawer-in overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Journal d'audit</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Details de l'evenement</h3>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionCfg.bg} ${actionCfg.color}`}>
              {actionCfg.icon}
              {actionCfg.label}
            </span>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"
            aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Informations generales */}
          <Section title="Informations generales">
            <InfoRow label="ID" value={`#${log.id}`} mono />
            <InfoRow label="Date" value={
              <div className="flex flex-col">
                <span>{formatDateShort(log.createdAt)}</span>
                <span className="font-mono text-[11px]">{formatTime(log.createdAt)}</span>
              </div>
            } />
            <InfoRow label="Utilisateur" value={
              <div className="flex items-center gap-2">
                {log.userId ? (
                  <UserAvatar userId={log.userId} name={log.username ?? ''} size="sm" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    <Activity className="h-3 w-3" />
                  </div>
                )}
                <div>
                  <span className="font-medium">{log.username || 'system'}</span>
                  <span className="ml-1 text-[11px] text-slate-400">{log.userId ? 'Utilisateur' : 'Systeme'}</span>
                </div>
              </div>
            } />
            <InfoRow label="Action" value={log.action} mono />
            <InfoRow label="Entite" value={
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${getEntityColor(log.entityType)}`}>
                  {getEntityIcon(log.entityType)}
                </span>
                <span>{getEntityLabel(log.entityType)} <span className="font-mono text-[11px]">#{log.entityId}</span></span>
              </div>
            } />
            <InfoRow label="Adresse IP" value={log.ipAddress || '--'} mono />
          </Section>

          {/* Contexte */}
          {(log.oldValue || log.newValue || log.userAgent) && (
            <Section title="Contexte">
              {log.userAgent && (
                <InfoRow label="Navigateur" value={<span className="break-all">{formatUserAgent(log.userAgent)}</span>} />
              )}
              {log.oldValue && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Valeur precedente</p>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 break-all max-h-32 overflow-y-auto">
                    {log.oldValue}
                  </div>
                </div>
              )}
              {log.newValue && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nouvelle valeur</p>
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-mono text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 break-all max-h-32 overflow-y-auto">
                    {log.newValue}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Donnees techniques */}
          <Section title="Donnees techniques">
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/30">
              <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all">
                {JSON.stringify({
                  id: log.id,
                  userId: log.userId,
                  username: log.username,
                  action: log.action,
                  entityType: log.entityType,
                  entityId: log.entityId,
                  ipAddress: log.ipAddress,
                  userAgent: log.userAgent,
                  createdAt: log.createdAt,
                }, null, 2)}
              </pre>
            </div>
          </Section>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-slate-200/70 px-6 py-4 dark:border-slate-700/50">
          <Button variant="secondary" size="sm" onClick={() => {
            const text = `Date: ${log.createdAt}\nUtilisateur: ${log.username}\nAction: ${log.action}\nEntite: ${log.entityType} #${log.entityId}\nIP: ${log.ipAddress || '--'}\nUser-Agent: ${log.userAgent || '--'}`
            copyToClipboard(text)
          }}>
            <Copy className="h-3.5 w-3.5" /> Copier les details
          </Button>
          {log.username && log.username !== 'system' && (
            <Button variant="secondary" size="sm" onClick={() => onFilterUser(log.username)}>
              <Filter className="h-3.5 w-3.5" /> Filtrer sur cet utilisateur
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">{label}</span>
      <span className={`text-right text-sm text-slate-700 dark:text-slate-300 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

/* -- Settings icon (used in ENTITY_ICONS) -- */
function Settings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/* -- Skeleton -- */
function AuditSkeleton() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-80 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-4 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-5 px-5 py-4">
              <div className="h-4 w-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
