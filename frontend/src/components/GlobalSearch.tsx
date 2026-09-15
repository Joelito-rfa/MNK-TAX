import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Search,
  Users,
  FileText,
  TrendingDown,
  Wallet,
  Receipt,
  FileSearch,
  FileQuestion,
  Banknote,
  Loader2,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  LayoutDashboard,
  CalendarDays,
  Calculator,
  BarChart3,
  Settings,
  ClipboardList,
  MessageSquare,
  ScrollText,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import { useI18n } from '../lib/i18n'
import type { Page } from '../types'

/* ═══════════════════════════ Types ═══════════════════════════ */

interface SearchResult {
  id: number | string
  title: string
  subtitle: string
  route: string
  type?: 'entity' | 'page'
}

interface SearchCategory {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

interface GroupedResults {
  key: string
  results: SearchResult[]
}

/* ═══════════════════════════ Categories ═══════════════════════════ */

const CATEGORIES: Record<string, SearchCategory> = {
  pages: { key: 'pages', label: 'Pages', icon: <LayoutDashboard className="h-4 w-4" />, color: 'text-brand-600 dark:text-brand-400', bgColor: 'bg-brand-50 dark:bg-brand-900/30' },
  taxpayers: { key: 'taxpayers', label: 'Contribuables', icon: <Users className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  declarations: { key: 'declarations', label: 'Déclarations', icon: <FileText className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  debts: { key: 'debts', label: 'Créances', icon: <TrendingDown className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/30' },
  collection: { key: 'collection', label: 'Recouvrement', icon: <ScrollText className="h-4 w-4" />, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  payments: { key: 'payments', label: 'Paiements', icon: <Wallet className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/30' },
  receipts: { key: 'receipts', label: 'Quittances', icon: <Receipt className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  controls: { key: 'controls', label: 'Contrôles fiscaux', icon: <FileSearch className="h-4 w-4" />, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30' },
  complaints: { key: 'complaints', label: 'Réclamations', icon: <FileQuestion className="h-4 w-4" />, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  refunds: { key: 'refunds', label: 'Remboursements', icon: <Banknote className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/30' },
  messages: { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" />, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/30' },
  deadlines: { key: 'deadlines', label: 'Calendrier fiscal', icon: <CalendarDays className="h-4 w-4" />, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
  'tax-rules': { key: 'tax-rules', label: 'Règles fiscales', icon: <Calculator className="h-4 w-4" />, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/30' },
  users: { key: 'users', label: 'Utilisateurs', icon: <Users className="h-4 w-4" />, color: 'text-slate-600 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-700' },
}

/* ── Pages navigables (toujours disponibles) ── */
const PAGE_RESULTS: SearchResult[] = [
  { id: 'page-dashboard', title: 'Tableau de bord', subtitle: "Vue d'ensemble de l'activité", route: '/', type: 'page' },
  { id: 'page-taxpayers', title: 'Contribuables', subtitle: 'Gestion des contribuables', route: '/taxpayers', type: 'page' },
  { id: 'page-declarations', title: 'Déclarations', subtitle: 'Déclarations fiscales', route: '/declarations', type: 'page' },
  { id: 'page-debts', title: 'Créances', subtitle: 'Créances et dettes fiscales', route: '/debts', type: 'page' },
  { id: 'page-collection', title: 'Recouvrement', subtitle: 'Actions de recouvrement', route: '/collection', type: 'page' },
  { id: 'page-payments', title: 'Paiements', subtitle: 'Historique des paiements', route: '/payments', type: 'page' },
  { id: 'page-receipts', title: 'Quittances', subtitle: 'Quittances et reçus', route: '/receipts', type: 'page' },
  { id: 'page-controls', title: 'Contrôles fiscaux', subtitle: 'Contrôles et vérifications', route: '/controls', type: 'page' },
  { id: 'page-complaints', title: 'Réclamations', subtitle: 'Réclamations contribuables', route: '/complaints', type: 'page' },
  { id: 'page-refunds', title: 'Remboursements', subtitle: 'Demandes de remboursement', route: '/refunds', type: 'page' },
  { id: 'page-messages', title: 'Messages', subtitle: 'Messagerie interne', route: '/messages', type: 'page' },
  { id: 'page-deadlines', title: 'Calendrier fiscal', subtitle: 'Échéances et obligations', route: '/deadlines', type: 'page' },
  { id: 'page-tax-rules', title: 'Règles fiscales', subtitle: 'Règles de calcul des impôts', route: '/tax-rules', type: 'page' },
  { id: 'page-reports', title: 'Rapports', subtitle: 'Rapports et analyses', route: '/reports', type: 'page' },
  { id: 'page-users', title: 'Utilisateurs', subtitle: 'Gestion des utilisateurs', route: '/users', type: 'page' },
  { id: 'page-roles', title: 'Rôles et permissions', subtitle: 'Gestion des accès', route: '/roles', type: 'page' },
  { id: 'page-audit', title: "Journal d'audit", subtitle: 'Historique des actions', route: '/audit', type: 'page' },
  { id: 'page-parameters', title: 'Paramètres système', subtitle: 'Configuration du système', route: '/parameters', type: 'page' },
]

/* ── Liens rapides pour l'état vide ── */
const QUICK_LINKS = [
  { label: 'Contribuables', route: '/taxpayers', icon: <Users className="h-4 w-4 text-blue-500" /> },
  { label: 'Déclarations', route: '/declarations', icon: <FileText className="h-4 w-4 text-emerald-500" /> },
  { label: 'Créances', route: '/debts', icon: <TrendingDown className="h-4 w-4 text-rose-500" /> },
  { label: 'Recouvrement', route: '/collection', icon: <ScrollText className="h-4 w-4 text-orange-500" /> },
  { label: 'Paiements', route: '/payments', icon: <Wallet className="h-4 w-4 text-violet-500" /> },
  { label: 'Quittances', route: '/receipts', icon: <Receipt className="h-4 w-4 text-amber-500" /> },
  { label: 'Contrôles', route: '/controls', icon: <FileSearch className="h-4 w-4 text-cyan-500" /> },
  { label: 'Réclamations', route: '/complaints', icon: <FileQuestion className="h-4 w-4 text-orange-500" /> },
  { label: 'Remboursements', route: '/refunds', icon: <Banknote className="h-4 w-4 text-teal-500" /> },
  { label: 'Messages', route: '/messages', icon: <MessageSquare className="h-4 w-4 text-sky-500" /> },
  { label: 'Calendrier fiscal', route: '/deadlines', icon: <CalendarDays className="h-4 w-4 text-indigo-500" /> },
  { label: 'Règles fiscales', route: '/tax-rules', icon: <Calculator className="h-4 w-4 text-pink-500" /> },
  { label: 'Rapports', route: '/reports', icon: <BarChart3 className="h-4 w-4 text-brand-500" /> },
  { label: 'Utilisateurs', route: '/users', icon: <Users className="h-4 w-4 text-slate-500" /> },
  { label: 'Journal d\u2019audit', route: '/audit', icon: <ClipboardList className="h-4 w-4 text-slate-500" /> },
  { label: 'Paramètres', route: '/parameters', icon: <Settings className="h-4 w-4 text-slate-500" /> },
]

/* ═══════════════════════════ Mappers ═══════════════════════════ */

function mapTaxpayers(items: any[]): SearchResult[] {
  return items.map((t) => ({
    id: t.id,
    title: t.name || t.businessName || t.tradeName || `Contribuable #${t.id}`,
    subtitle: `NIF ${t.nif ?? '—'} · ${t.type === 'COMPANY' ? 'Entreprise' : 'Personne physique'}${t.activity ? ` · ${t.activity}` : ''}`,
    route: `/taxpayers/${t.id}`,
  }))
}

function mapDeclarations(items: any[]): SearchResult[] {
  return items.map((d) => ({
    id: d.id,
    title: d.reference || `Déclaration #${d.id}`,
    subtitle: `${d.taxpayerName || ''} · ${d.taxTypeName || d.taxTypeCode || ''} · ${d.period || d.exercice || ''}${d.status ? ` · ${d.status}` : ''}`,
    route: `/declarations/${d.id}`,
  }))
}

function mapDebts(items: any[]): SearchResult[] {
  return items.map((d) => ({
    id: d.id,
    title: d.reference || `Créance #${d.id}`,
    subtitle: `${d.taxpayerName || ''} · ${(d.totalAmount ?? d.remainingAmount)?.toLocaleString('fr-FR') ?? ''} MGA · ${d.status || ''}`,
    route: `/debts/${d.id}`,
  }))
}

function mapPayments(items: any[]): SearchResult[] {
  return items.map((p) => ({
    id: p.id,
    title: p.reference || `Paiement #${p.id}`,
    subtitle: `${p.taxpayerName || ''} · ${(p.amount)?.toLocaleString('fr-FR') ?? ''} MGA · ${p.method || p.paymentMethod || ''}`,
    route: '/payments',
  }))
}

function mapReceipts(items: any[]): SearchResult[] {
  return items.map((r) => ({
    id: r.id,
    title: r.reference || r.number || `Quittance #${r.id}`,
    subtitle: `${r.taxpayerName || ''} · ${(r.amount)?.toLocaleString('fr-FR') ?? ''} MGA`,
    route: '/receipts',
  }))
}

function mapControls(items: any[]): SearchResult[] {
  return items.map((c) => ({
    id: c.id,
    title: c.reference || `Contrôle #${c.id}`,
    subtitle: `${c.taxpayerName || ''} · ${c.type || c.controlType || ''} · ${c.status || ''}`,
    route: '/controls',
  }))
}

function mapComplaints(items: any[]): SearchResult[] {
  return items.map((c) => ({
    id: c.id,
    title: c.reference || `Réclamation #${c.id}`,
    subtitle: `${c.taxpayerName || ''} · ${c.subject || ''} · ${c.status || ''}`,
    route: '/complaints',
  }))
}

function mapRefunds(items: any[]): SearchResult[] {
  return items.map((r) => ({
    id: r.id,
    title: r.reference || `Remboursement #${r.id}`,
    subtitle: `${r.taxpayerName || ''} · ${(r.amount)?.toLocaleString('fr-FR') ?? ''} MGA · ${r.status || ''}`,
    route: '/refunds',
  }))
}

function mapMessages(items: any[]): SearchResult[] {
  return items.map((m) => ({
    id: m.id,
    title: m.subject || `Message #${m.id}`,
    subtitle: `${m.senderName || m.sender?.fullName || ''} · ${(m.content || '').slice(0, 60)}`,
    route: '/messages',
  }))
}

function mapCollection(items: any[]): SearchResult[] {
  return items.map((c) => ({
    id: c.debtId ?? c.id,
    title: c.reference || c.taxpayerName || `Dossier #${c.debtId ?? c.id}`,
    subtitle: `${c.taxpayerName || ''} · ${c.taxTypeName || c.taxTypeCode || ''} · ${(c.remainingAmount)?.toLocaleString('fr-FR') ?? ''} MGA`,
    route: '/collection',
  }))
}

function mapUsers(items: any[]): SearchResult[] {
  return items.map((u) => ({
    id: u.id,
    title: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
    subtitle: `@${u.username}${u.roles?.length ? ` · ${u.roles.join(', ')}` : ''}`,
    route: '/users',
  }))
}

function mapDeadlines(items: any[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return items
    .filter((d) =>
      !lower ||
      `${d.taxTypeName} ${d.taxTypeCode} ${d.period}`.toLowerCase().includes(lower)
    )
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      title: `${d.taxTypeName || d.taxTypeCode} — ${d.period}`,
      subtitle: `Déclaration : ${fmtShort(d.declarationDeadline)} · Paiement : ${fmtShort(d.paymentDeadline)}`,
      route: '/deadlines',
    }))
}

function mapTaxRules(items: any[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return items
    .filter((r) =>
      !lower ||
      `${r.code} ${r.name} ${r.taxTypeCode} ${r.description ?? ''}`.toLowerCase().includes(lower)
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: `${r.code || `Règle #${r.id}`} — ${r.name || ''}`,
      subtitle: `${r.taxTypeName || r.taxTypeCode || ''} · ${r.calculationMethod || r.method || ''}`,
      route: '/tax-rules',
    }))
}

function fmtShort(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• Component â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function GlobalSearch() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.trim()
  const enabled = open && q.length >= 1

  /* Debounce de la requête (200 ms) */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200)
    return () => clearTimeout(t)
  }, [q])

  /* Ctrl+K → focus sur la barre */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Clic à l'extérieur → fermeture */
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  /* ── Requêtes API en parallèle (modules avec recherche serveur) ── */
  const taxpayers = useQuery({ queryKey: ['gs', 'taxpayers', debouncedQ], queryFn: () => apiGet<Page<any>>(`/taxpayers?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const declarations = useQuery({ queryKey: ['gs', 'declarations', debouncedQ], queryFn: () => apiGet<Page<any>>(`/declarations?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const debts = useQuery({ queryKey: ['gs', 'debts', debouncedQ], queryFn: () => apiGet<Page<any>>(`/debts?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const payments = useQuery({ queryKey: ['gs', 'payments', debouncedQ], queryFn: () => apiGet<Page<any>>(`/payments?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const receipts = useQuery({ queryKey: ['gs', 'receipts', debouncedQ], queryFn: () => apiGet<Page<any>>(`/receipts?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const controls = useQuery({ queryKey: ['gs', 'controls', debouncedQ], queryFn: () => apiGet<Page<any>>(`/tax-controls?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const complaints = useQuery({ queryKey: ['gs', 'complaints', debouncedQ], queryFn: () => apiGet<Page<any>>(`/complaints?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const refunds = useQuery({ queryKey: ['gs', 'refunds', debouncedQ], queryFn: () => apiGet<Page<any>>(`/refunds?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const messages = useQuery({ queryKey: ['gs', 'messages', debouncedQ], queryFn: () => apiGet<Page<any>>(`/messages?search=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const collection = useQuery({ queryKey: ['gs', 'collection', debouncedQ], queryFn: () => apiGet<Page<any>>(`/collection/debts?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })
  const users = useQuery({ queryKey: ['gs', 'users', debouncedQ], queryFn: () => apiGet<Page<any>>(`/users?q=${encodeURIComponent(debouncedQ)}&size=5`), enabled, staleTime: 30_000, retry: false, placeholderData: keepPreviousData })

  /* ── Listes complètes pour modules sans recherche serveur ── */
  const deadlines = useQuery({ queryKey: ['gs', 'deadlines'], queryFn: () => apiGet<any[]>('/deadlines'), enabled: open, staleTime: 60_000, retry: false })
  const taxRules = useQuery({ queryKey: ['gs', 'tax-rules'], queryFn: () => apiGet<any[]>('/tax-rules'), enabled: open, staleTime: 60_000, retry: false })

  const isLoading =
    taxpayers.isFetching || declarations.isFetching || debts.isFetching || payments.isFetching ||
    receipts.isFetching || controls.isFetching || complaints.isFetching || refunds.isFetching ||
    messages.isFetching || collection.isFetching || users.isFetching || deadlines.isFetching || taxRules.isFetching

  /* ── Regroupement des résultats ── */
  const grouped: GroupedResults[] = useMemo(() => {
    const pick = (res: { data?: unknown } | undefined, mapper: (items: any[], query?: string) => SearchResult[]): SearchResult[] => {
      if (!res?.data) return []
      const d = res.data as any
      const items = Array.isArray(d) ? d : d.content ?? []
      return items.length ? mapper(items, debouncedQ) : []
    }

    const lower = debouncedQ.toLowerCase()
    const groups: GroupedResults[] = [
      { key: 'pages', results: PAGE_RESULTS.filter((p) => !lower || `${p.title} ${p.subtitle}`.toLowerCase().includes(lower)) },
      { key: 'taxpayers', results: pick(taxpayers, mapTaxpayers) },
      { key: 'declarations', results: pick(declarations, mapDeclarations) },
      { key: 'debts', results: pick(debts, mapDebts) },
      { key: 'collection', results: pick(collection, mapCollection) },
      { key: 'payments', results: pick(payments, mapPayments) },
      { key: 'receipts', results: pick(receipts, mapReceipts) },
      { key: 'controls', results: pick(controls, mapControls) },
      { key: 'complaints', results: pick(complaints, mapComplaints) },
      { key: 'refunds', results: pick(refunds, mapRefunds) },
      { key: 'messages', results: pick(messages, mapMessages) },
      { key: 'deadlines', results: deadlines.data ? mapDeadlines(deadlines.data, debouncedQ) : [] },
      { key: 'tax-rules', results: taxRules.data ? mapTaxRules(taxRules.data, debouncedQ) : [] },
      { key: 'users', results: pick(users, mapUsers) },
    ]
    return groups.filter((g) => g.results.length > 0)
  }, [debouncedQ, taxpayers.data, declarations.data, debts.data, payments.data, receipts.data, controls.data, complaints.data, refunds.data, messages.data, collection.data, users.data, deadlines.data, taxRules.data])

  /* ── Liste plate pour la navigation clavier ── */
  const flatList = useMemo(() => {
    const out: { result: SearchResult; catKey: string }[] = []
    for (const g of grouped) for (const r of g.results) out.push({ result: r, catKey: g.key })
    return out
  }, [grouped])

  useEffect(() => setSelectedIdx(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const go = useCallback((route: string) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(route)
  }, [navigate])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatList[selectedIdx]
      if (item) go(item.result.route)
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 sm:max-w-[520px]">
      {/* ── Barre de recherche (toujours visible, style Google) ── */}
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
          open
            ? 'border-brand-400 bg-white shadow-sm ring-2 ring-brand-100 dark:border-brand-500 dark:bg-slate-800 dark:ring-brand-900/40'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500'
        }`}
      >
        <Search className={`h-4 w-4 shrink-0 transition-colors ${open ? 'text-brand-500' : 'text-slate-400'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("search.globalPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />}
        {query ? (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={t("a11y.clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* ── Panneau de résultats (dropdown, pas de cadre plein écran) ── */}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 origin-top animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-popover dark:border-slate-700 dark:bg-slate-900">
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {q.length < 1 ? (
              <EmptyState onPick={go} />
            ) : flatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <Search className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Aucun résultat pour « {q} »</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Essayez un NIF, un nom, une référence…</p>
              </div>
            ) : (
              grouped.map((g) => {
                const cat = CATEGORIES[g.key]
                return (
                  <div key={g.key}>
                    <div className={`sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 ${cat.bgColor} backdrop-blur-sm`}>
                      <span className={cat.color}>{cat.icon}</span>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                      <span className="ml-auto text-[11px] text-slate-400">{g.results.length}</span>
                    </div>
                    {g.results.map((r) => {
                      const idx = flatList.findIndex((f) => f.result === r)
                      const active = idx === selectedIdx
                      return (
                        <button
                          key={`${g.key}-${r.id}`}
                          data-idx={idx}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          onClick={() => go(r.route)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cat.bgColor} ${cat.color}`}>
                            {r.type === 'page' ? <ArrowRight className="h-4 w-4" /> : cat.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-slate-100'}`}>{highlight(r.title, debouncedQ)}</span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{r.subtitle}</span>
                          </span>
                          {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer raccourcis */}
          {q.length >= 1 && flatList.length > 0 && (
            <div className="flex items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><kbd className="inline-flex items-center rounded border border-slate-300 bg-white px-1 dark:border-slate-600 dark:bg-slate-800"><ArrowUp className="h-2.5 w-2.5" /><ArrowDown className="h-2.5 w-2.5" /></kbd> naviguer</span>
              <span className="inline-flex items-center gap-1"><kbd className="rounded border border-slate-300 bg-white px-1 dark:border-slate-600 dark:bg-slate-800">↵</kbd> ouvrir</span>
              <span className="ml-auto hidden sm:inline">{flatList.length} résultat{flatList.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

function EmptyState({ onPick }: { onPick: (route: string) => void }) {
  return (
    <div className="py-5 animate-fade-in">
      <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Accès rapide</p>
      <div className="grid grid-cols-2 gap-1 px-3 sm:grid-cols-3">
        {QUICK_LINKS.map((l) => (
          <button
            key={l.route}
            onClick={() => onPick(l.route)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {l.icon}
            <span className="truncate">{l.label}</span>
          </button>
        ))}
      </div>
      <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggestions</p>
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {['TVA', 'IR', 'AIB', 'patente'].map((s) => (
          <SuggestionChip key={s} label={s} />
        ))}
      </div>
    </div>
  )
}

function SuggestionChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {label}
    </span>
  )
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-brand-100 px-0.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
