import { useState, useMemo } from 'react'
import { useDropdownList } from '../lib/useDropdown'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  Clock,
  Copy,
  DollarSign,
  Edit3,
  FileText,
  Filter,
  Hash,
  History,
  Info,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Tag,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Settings,
  RotateCcw,
  Eye,
  Upload,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost, apiPut } from '../lib/api'
import type { TaxRule, TaxRuleVersion } from '../types'
import { Button, Card, EmptyState } from '../components/ui'
import { useToast } from '../components/Toast'

/* ═══════════════════════════ Constantes ═══════════════════════════ */

const METHOD_LABELS: Record<string, string> = {
  FLAT_RATE: 'Taux fixe',
  PERCENTAGE_OF_BASE: 'Pourcentage de base',
  PROGRESSIVE: 'Progressif',
  PER_UNIT: 'Par unite',
  PERCENTAGE_OF_TURNOVER: 'Pourcentage du CA',
}



const TAX_TYPE_OPTIONS = [
  { id: 'all', label: 'Tous les types' },
  { id: 'TVA', label: 'TVA' },
  { id: 'IRSA', label: 'IRSA' },
  { id: 'IR', label: 'IR' },
  { id: 'IS', label: 'IS' },
  { id: 'IFT', label: 'IFT' },
  { id: ' autres', label: 'Autres' },
]

const STATUS_OPTIONS = [
  { id: 'all', label: 'Tous les statuts' },
  { id: 'active', label: 'Actif' },
  { id: 'inactive', label: 'Inactif' },
  { id: 'demo', label: 'Demonstration' },
]

const METHOD_OPTIONS = [
  { id: 'all', label: 'Toutes les methodes' },
  { id: 'FLAT_RATE', label: 'Taux fixe' },
  { id: 'PERCENTAGE_OF_BASE', label: 'Pourcentage de base' },
  { id: 'PROGRESSIVE', label: 'Progressif' },
  { id: 'PER_UNIT', label: 'Par unite' },
  { id: 'PERCENTAGE_OF_TURNOVER', label: 'Pourcentage du CA' },
]

const emptyForm = {
  code: '',
  name: '',
  taxTypeCode: '',
  taxpayerType: '',
  regimeCode: '',
  calculationMethod: 'PERCENTAGE_OF_BASE',
  rate: '',
  minimum: '0',
  maximum: '0',
  deduction: '0',
  exemption: '0',
  legalReference: '',
  brackets: '',
  demo: false,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
}

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '--'
  }
}

function fmtMGA(v: number): string {
  return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(v) + ' MGA'
}



function getStatusInfo(rule: TaxRule): { label: string; color: string; bg: string } {
  if (!rule.active) return { label: 'Desactive', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' }
  if (rule.effectiveTo && new Date(rule.effectiveTo) < new Date()) {
    return { label: 'Expire', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' }
  }
  if (rule.currentVersion > 1) return { label: 'Actif', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
  return { label: 'Nouveau', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' }
}

function parseBrackets(json: string | null): { upTo: number | null; rate: number }[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

function calculateTax(rule: TaxRule, taxableAmount: number, deduction: number): {
  baseImposable: number; tauxApplique: number; deductions: number; montantImpot: number
} {
  const base = Math.max(0, taxableAmount - deduction)
  let taux = rule.rate

  if (rule.calculationMethod === 'PROGRESSIVE') {
    const brackets = parseBrackets(rule.brackets)
    let remaining = base
    let totalTax = 0
    for (const bracket of brackets) {
      const upper = bracket.upTo ?? Infinity
      const taxable = Math.min(remaining, upper)
      totalTax += taxable * (bracket.rate / 100)
      remaining -= taxable
      if (remaining <= 0) break
    }
    return { baseImposable: base, tauxApplique: 0, deductions: deduction, montantImpot: Math.round(totalTax) }
  }

  const tax = base * (taux / 100)
  return { baseImposable: base, tauxApplique: taux, deductions: deduction, montantImpot: Math.round(tax) }
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function TaxRules() {
  const toast = useToast()
  const queryClient = useQueryClient()

  /* -- State -- */
  const [selected, setSelected] = useState<TaxRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TaxRule | null>(null)
  const [versionsRule, setVersionsRule] = useState<TaxRule | null>(null)
  const [testRule, setTestRule] = useState<TaxRule | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [pageSize, setPageSize] = useState(25)
  const { openId: showMenuId, close: closeMenu, getTriggerProps, getDropdownProps } = useDropdownList()
  const [deleteConfirm, setDeleteConfirm] = useState<TaxRule | null>(null)
  const [form, setForm] = useState(emptyForm)

  /* -- Queries -- */
  const { data: rules, isLoading } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => apiGet<TaxRule[]>('/tax-rules'),
  })

  const { data: versions } = useQuery({
    queryKey: ['tax-rules', 'versions', versionsRule?.id],
    queryFn: () => apiGet<TaxRuleVersion[]>(`/tax-rules/${versionsRule!.id}/versions`),
    enabled: !!versionsRule,
  })


  /* -- Stats -- */
  const stats = useMemo(() => {
    if (!rules) return { active: 0, total: 0, recentlyModified: 0, toReview: 0 }
    const now = new Date()
    return {
      active: rules.filter((r) => r.active).length,
      total: new Set(rules.map((r) => r.taxTypeCode)).size,
      recentlyModified: rules.filter((r) => r.currentVersion > 1).length,
      toReview: rules.filter((r) => {
        if (!r.effectiveTo) return false
        const end = new Date(r.effectiveTo)
        return end < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) && r.active
      }).length,
    }
  }, [rules])

  /* -- Categories with counts -- */
  const categories = useMemo(() => {
    if (!rules) return []
    const counts: Record<string, number> = { all: rules.length }
    rules.forEach((r) => {
      const code = r.taxTypeCode.toUpperCase()
      if (TAX_TYPE_OPTIONS.find((t) => t.id === code && t.id !== 'all' && t.id !== ' autres')) {
        counts[code] = (counts[code] ?? 0) + 1
      } else {
        counts[' autres'] = (counts[' autres'] ?? 0) + 1
      }
    })
    return TAX_TYPE_OPTIONS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }))
  }, [rules])

  /* -- Filtered rules -- */
  const filteredRules = useMemo(() => {
    if (!rules) return []
    let result = rules

    if (activeCategory !== 'all') {
      if (activeCategory === ' autres') {
        const known = TAX_TYPE_OPTIONS.filter((t) => t.id !== 'all' && t.id !== ' autres').map((t) => t.id.toUpperCase())
        result = result.filter((r) => !known.includes(r.taxTypeCode.toUpperCase()))
      } else {
        result = result.filter((r) => r.taxTypeCode.toUpperCase() === activeCategory.toUpperCase())
      }
    }

    if (filterType !== 'all') {
      result = result.filter((r) => r.taxTypeCode.toUpperCase() === filterType.toUpperCase())
    }

    if (filterMethod !== 'all') {
      result = result.filter((r) => r.calculationMethod === filterMethod)
    }

    if (filterStatus === 'active') result = result.filter((r) => r.active)
    else if (filterStatus === 'inactive') result = result.filter((r) => !r.active)
    else if (filterStatus === 'demo') result = result.filter((r) => r.demo)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) => r.code.toLowerCase().includes(q)
          || r.name.toLowerCase().includes(q)
          || r.taxTypeCode.toLowerCase().includes(q)
          || r.legalReference?.toLowerCase().includes(q),
      )
    }

    return result
  }, [rules, activeCategory, filterType, filterMethod, filterStatus, search])

  const pagedRules = useMemo(() => {
    return filteredRules.slice(0, pageSize)
  }, [filteredRules, pageSize])

  /* -- Mutations -- */
  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code,
        name: form.name,
        taxTypeCode: form.taxTypeCode,
        taxpayerType: form.taxpayerType || undefined,
        regimeCode: form.regimeCode || undefined,
        calculationMethod: form.calculationMethod,
        rate: Number(form.rate),
        minimum: Number(form.minimum),
        maximum: Number(form.maximum),
        deduction: Number(form.deduction),
        exemption: Number(form.exemption),
        legalReference: form.legalReference || undefined,
        brackets: form.brackets || undefined,
        demo: form.demo,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || undefined,
      }
      if (editing) {
        return apiPut(`/tax-rules/${editing.id}`, body, { params: { reason: 'Mise a jour depuis l\'interface' } })
      }
      return apiPost('/tax-rules', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] })
      setCreateOpen(false)
      setEditing(null)
      setForm(emptyForm)
      toast.success(editing ? 'Regle mise a jour' : 'Regle creee')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const toggleActive = useMutation({
    mutationFn: (r: TaxRule) =>
      apiPatch(`/tax-rules/${r.id}/active`, undefined, {
        params: { active: !r.active, reason: 'Changement de statut depuis l\'interface' },
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] })
      toast.success(vars.active ? 'Regle desactivee' : 'Regle activee')
    },
  })

  const deleteRule = useMutation({
    mutationFn: (r: TaxRule) => apiPatch(`/tax-rules/${r.id}/active`, undefined, { params: { active: false, reason: 'Suppression depuis l\'interface' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] })
      setDeleteConfirm(null)
      toast.success('Regle supprimee')
    },
  })

  /* -- Handlers -- */
  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setCreateOpen(true)
  }

  function openEdit(r: TaxRule) {
    setEditing(r)
    setForm({
      code: r.code,
      name: r.name,
      taxTypeCode: r.taxTypeCode,
      taxpayerType: r.taxpayerType ?? '',
      regimeCode: r.regimeCode ?? '',
      calculationMethod: r.calculationMethod,
      rate: String(r.rate),
      minimum: String(r.minimum),
      maximum: String(r.maximum),
      deduction: String(r.deduction),
      exemption: String(r.exemption),
      legalReference: r.legalReference ?? '',
      brackets: r.brackets ?? '',
      demo: r.demo,
      effectiveFrom: r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
      effectiveTo: r.effectiveTo ? r.effectiveTo.slice(0, 10) : '',
    })
    setCreateOpen(true)
  }

  function handleDuplicate(r: TaxRule) {
    setEditing(null)
    setForm({
      code: r.code + '-COPY',
      name: r.name + ' (copie)',
      taxTypeCode: r.taxTypeCode,
      taxpayerType: r.taxpayerType ?? '',
      regimeCode: r.regimeCode ?? '',
      calculationMethod: r.calculationMethod,
      rate: String(r.rate),
      minimum: String(r.minimum),
      maximum: String(r.maximum),
      deduction: String(r.deduction),
      exemption: String(r.exemption),
      legalReference: r.legalReference ?? '',
      brackets: r.brackets ?? '',
      demo: r.demo,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
    })
    setCreateOpen(true)
  }

  function resetFilters() {
    setSearch('')
    setActiveCategory('all')
    setFilterType('all')
    setFilterMethod('all')
    setFilterStatus('all')
  }

  const hasActiveFilters = search || activeCategory !== 'all' || filterType !== 'all' || filterMethod !== 'all' || filterStatus !== 'all'

  /* -- Loading skeleton -- */
  if (isLoading) return <TaxRulesSkeleton />

  return (
    <div className="space-y-6">
      {/* === 1. HEADER === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Regles fiscales
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configurez les baremes, taux et methodes de calcul applicables aux obligations fiscales.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => toast.info('Historique des versions')}>
            <History className="h-4 w-4" />
            Historique
          </Button>
          <Button variant="secondary" size="md" onClick={() => toast.info('Importer des regles')}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <button
            onClick={openCreate}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Plus className="relative h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span className="relative">Nouvelle regle</span>
          </button>
        </div>
      </div>

      {/* === 2. KPI STATS === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="REGLES ACTIVES"
          value={stats.active}
          sub={`sur ${rules?.length ?? 0} regles`}
          delta={`${stats.active > 0 ? Math.round((stats.active / (rules?.length ?? 1)) * 100) : 0}% du total`}
          deltaTone="up"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="IMPOTS CONFIGURES"
          value={stats.total}
          sub="Types d'impots"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="MODIFIEES RECENTEMENT"
          value={stats.recentlyModified}
          sub="Avec versions"
          delta="+ ce mois"
          deltaTone="up"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="A REVISER"
          value={stats.toReview}
          sub="Proches expiration"
          delta={stats.toReview > 0 ? 'Attention' : 'Aucune'}
          deltaTone={stats.toReview > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* === 3. CATEGORIES === */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Categories d'impots
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-900/30 dark:text-violet-400'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
              }`}
            >
              {cat.label}
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeCategory === cat.id
                  ? 'bg-violet-200 text-violet-800 dark:bg-violet-800/40 dark:text-violet-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* === 4. SEARCH AND FILTERS === */}
      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une regle, un code ou un impot..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
              {METHOD_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
            <Shield className="h-4 w-4 text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
              {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">
              <RotateCcw className="h-3.5 w-3.5" />
              Reinitialiser
            </button>
          )}

          <div className="flex-1" />

          {/* Page size */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-xs">Afficher</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs">regles</span>
          </div>
        </div>

        {/* === 5. RULES LIST === */}
        {pagedRules.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Calculator className="h-10 w-10" />}
              title="Aucune regle fiscale trouvee"
              subtitle={search ? `Aucun resultat pour "${search}"` : "Commencez par creer une regle de calcul pour configurer les obligations fiscales."}
            />
            <div className="mt-4 flex justify-center">
              <Button variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Creer une regle
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pagedRules.map((rule) => {
              const status = getStatusInfo(rule)
              return (
                <div key={rule.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  {/* Code + Nom */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:bg-slate-700 dark:text-violet-400">
                        {rule.code}
                      </code>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.bg} ${status.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${rule.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">{rule.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {rule.taxTypeCode}
                      </span>
                      <span>·</span>
                      <span>{METHOD_LABELS[rule.calculationMethod] ?? rule.calculationMethod}</span>
                      <span>·</span>
                      <span>{rule.rate}%</span>
                      {rule.legalReference && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{rule.legalReference}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rate + limits */}
                  <div className="hidden lg:block text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rule.rate}%</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Min: {fmtMGA(rule.minimum)} · Max: {fmtMGA(rule.maximum)}
                    </p>
                    {rule.deduction > 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Deduction: {fmtMGA(rule.deduction)}
                      </p>
                    )}
                  </div>

                  {/* Version */}
                  <div className="hidden md:block">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      v{rule.currentVersion}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setSelected(rule)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
                      title="Voir les details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button {...getTriggerProps(rule.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {showMenuId === rule.id && (
                        <div {...getDropdownProps()} className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                          <div className="space-y-0.5">
                            <MenuItem icon={<Eye className="h-4 w-4" />} label="Voir les details" onClick={() => { setSelected(rule); closeMenu() }} />
                            <MenuItem icon={<Edit3 className="h-4 w-4" />} label="Modifier" onClick={() => { openEdit(rule); closeMenu() }} />
                            <MenuItem icon={<Copy className="h-4 w-4" />} label="Dupliquer" onClick={() => { handleDuplicate(rule); closeMenu() }} />
                            <MenuItem icon={<History className="h-4 w-4" />} label="Historique des versions" onClick={() => { setVersionsRule(rule); closeMenu() }} />
                            <MenuItem icon={<Calculator className="h-4 w-4" />} label="Tester le calcul" onClick={() => { setTestRule(rule); closeMenu() }} />
                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                            <MenuItem
                              icon={rule.active ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              label={rule.active ? 'Desactiver' : 'Activer'}
                              onClick={() => { toggleActive.mutate(rule); closeMenu() }}
                              danger={rule.active}
                            />
                            <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Supprimer" onClick={() => { setDeleteConfirm(rule); closeMenu() }} danger />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {pagedRules.length > 0 && (
          <div className="border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {filteredRules.length} regle{filteredRules.length > 1 ? 's' : ''} affichee{filteredRules.length > 1 ? 's' : ''}
              {search && ` pour "${search}"`}
            </p>
          </div>
        )}
      </Card>

      {/* === 6. DETAIL MODAL === */}
      <DetailModal rule={selected} onClose={() => setSelected(null)} onEdit={(r) => { setSelected(null); openEdit(r) }} onTest={(r) => { setSelected(null); setTestRule(r) }} />

      {/* === 7. VERSION HISTORY MODAL === */}
      <VersionHistoryModal rule={versionsRule} versions={versions} onClose={() => setVersionsRule(null)} />

      {/* === 8. CREATE/EDIT MODAL === */}
      <CreateEditModal
        open={createOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={save.isPending}
        error={save.isError ? apiErrorMessage(save.error) : null}
        onClose={() => { setCreateOpen(false); setEditing(null) }}
        onSubmit={() => save.mutate()}
      />

      {/* === 9. TEST CALCULATOR MODAL === */}
      <TestCalculatorModal rule={testRule} onClose={() => setTestRule(null)} />

      {/* === DELETE CONFIRM === */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Supprimer la regle</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Etes-vous sur de vouloir supprimer la regle <strong>{deleteConfirm.code}</strong> ? Cette action est irreversibe.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
              <Button variant="danger" onClick={() => deleteRule.mutate(deleteConfirm)} loading={deleteRule.isPending}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

/* -- KPI Card -- */
function StatCard({ icon, iconBg, iconColor, label, value, sub, delta, deltaTone = 'neutral' }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: React.ReactNode; sub: string; delta?: string; deltaTone?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card hover className="group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}>{icon}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
            deltaTone === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : deltaTone === 'down' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {deltaTone === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {deltaTone === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500">{sub}</span>
      </div>
    </Card>
  )
}

/* -- Menu Item -- */
function MenuItem({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <span className={`shrink-0 ${danger ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{icon}</span>
      {label}
    </button>
  )
}

/* -- Detail Modal -- */
function DetailModal({ rule, onClose, onEdit, onTest }: {
  rule: TaxRule | null; onClose: () => void; onEdit: (r: TaxRule) => void; onTest: (r: TaxRule) => void
}) {
  if (!rule) return null
  const status = getStatusInfo(rule)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-violet-100 px-2 py-0.5 font-mono text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{rule.code}</code>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.bg} ${status.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${rule.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                {status.label}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{rule.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Tag className="h-4 w-4" />} label="Impot" value={rule.taxTypeCode} />
            <InfoRow icon={<Settings className="h-4 w-4" />} label="Methode" value={METHOD_LABELS[rule.calculationMethod] ?? rule.calculationMethod} />
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Taux" value={`${rule.rate}%`} />
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Deduction" value={fmtMGA(rule.deduction)} />
            <InfoRow icon={<Hash className="h-4 w-4" />} label="Seuil min / max" value={`${fmtMGA(rule.minimum)} / ${fmtMGA(rule.maximum)}`} />
            <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Ref. legale" value={rule.legalReference || '--'} />
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Applicable du" value={fmtDate(rule.effectiveFrom)} />
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Jusqu'au" value={fmtDate(rule.effectiveTo)} />
            <InfoRow icon={<History className="h-4 w-4" />} label="Version" value={`v${rule.currentVersion}`} />
            <InfoRow icon={<Info className="h-4 w-4" />} label="Type contribuable" value={rule.taxpayerType || 'Tous'} />
          </div>

          {/* Brackets preview */}
          {rule.calculationMethod === 'PROGRESSIVE' && rule.brackets && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Barème progressif</h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">De</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">A</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {parseBrackets(rule.brackets).map((b, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{i === 0 ? '0' : fmtMGA(parseBrackets(rule.brackets)[i - 1]?.upTo ?? 0)}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{b.upTo ? fmtMGA(b.upTo) : 'Illimite'}</td>
                        <td className="px-4 py-2 font-medium text-violet-600 dark:text-violet-400">{b.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button variant="primary" size="sm" onClick={() => { onEdit(rule) }}>
              <Edit3 className="h-3.5 w-3.5" /> Modifier
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { onTest(rule) }}>
              <Calculator className="h-3.5 w-3.5" /> Tester le calcul
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  )
}

/* -- Version History Modal -- */
function VersionHistoryModal({ rule, versions, onClose }: {
  rule: TaxRule | null; versions: TaxRuleVersion[] | undefined; onClose: () => void
}) {
  if (!rule) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Historique des versions</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{rule.code} -- {rule.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          {!versions ? (
            <div className="py-8 text-center"><div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Aucune version enregistree.</p>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              {versions.map((v, i) => (
                <div key={v.id} className="relative flex gap-4">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    <span className="text-xs font-bold">v{v.versionNumber}</span>
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Version {v.versionNumber}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(v.effectiveFrom)}</span>
                    </div>
                    {v.reason && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{v.reason}</p>}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Par {v.changedBy || '--'}</p>
                    {i === 0 && (
                      <button className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">
                        <RotateCcw className="h-3 w-3" /> Restaurer cette version
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -- Create/Edit Modal -- */
function CreateEditModal({ open, editing, form, setForm, saving, error, onClose, onSubmit }: {
  open: boolean; editing: TaxRule | null; form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void; saving: boolean; error: string | null
  onClose: () => void; onSubmit: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {editing ? `Modifier : ${editing.code}` : 'Nouvelle regle de calcul'}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {editing ? 'Modifiez les parametres de la regle' : 'Configurez une nouvelle regle fiscale'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Code de la regle" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="ex: R-TVA-20" />
            <FieldInput label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="ex: TVA taux normal" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldSelect label="Impot concerne" value={form.taxTypeCode} onChange={(v) => setForm({ ...form, taxTypeCode: v })} options={[
              { value: '', label: 'Selectionner...' },
              { value: 'TVA', label: 'TVA' },
              { value: 'IRSA', label: 'IRSA' },
              { value: 'IR', label: 'IR' },
              { value: 'IS', label: 'IS' },
              { value: 'IFT', label: 'IFT' },
            ]} />
            <FieldSelect label="Methode de calcul" value={form.calculationMethod} onChange={(v) => setForm({ ...form, calculationMethod: v })} options={
              Object.entries(METHOD_LABELS).map(([k, v]) => ({ value: k, label: v }))
            } />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FieldInput label="Taux (%)" type="number" value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} step="0.0001" />
            <FieldInput label="Seuil minimum (MGA)" type="number" value={form.minimum} onChange={(v) => setForm({ ...form, minimum: v })} />
            <FieldInput label="Seuil maximum (MGA)" type="number" value={form.maximum} onChange={(v) => setForm({ ...form, maximum: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Deduction (MGA)" type="number" value={form.deduction} onChange={(v) => setForm({ ...form, deduction: v })} />
            <FieldInput label="Exoneration (MGA)" type="number" value={form.exemption} onChange={(v) => setForm({ ...form, exemption: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldSelect label="Type de contribuable" value={form.taxpayerType} onChange={(v) => setForm({ ...form, taxpayerType: v })} options={[
              { value: '', label: 'Tous' },
              { value: 'COMPANY', label: 'Entreprise' },
              { value: 'PERSON', label: 'Particulier' },
            ]} />
            <FieldInput label="Reference legale" value={form.legalReference} onChange={(v) => setForm({ ...form, legalReference: v })} placeholder="ex: CGI Art. 01" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Applicable a partir du" type="date" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} />
            <FieldInput label="Date de fin" type="date" value={form.effectiveTo} onChange={(v) => setForm({ ...form, effectiveTo: v })} />
          </div>

          {form.calculationMethod === 'PROGRESSIVE' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tranches progressives (JSON)</label>
              <textarea
                value={form.brackets}
                onChange={(e) => setForm({ ...form, brackets: e.target.value })}
                placeholder='[{"upTo":500000,"rate":5},{"upTo":1000000,"rate":10},{"upTo":null,"rate":20}]'
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">JSON : chaque tranche a "upTo" (null = pas de plafond) et "rate" (taux en %)</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="demo-toggle" checked={form.demo} onChange={(e) => setForm({ ...form, demo: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <label htmlFor="demo-toggle" className="text-sm text-slate-600 dark:text-slate-400">Regle de demonstration</label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving || !form.code || !form.name || !form.taxTypeCode || !form.rate} loading={saving}>
              {editing ? 'Enregistrer' : 'Creer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldInput({ label, value, onChange, type = 'text', placeholder, step }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; step?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} step={step}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400"
      />
    </label>
  )
}

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/* -- Test Calculator Modal -- */
function TestCalculatorModal({ rule, onClose }: { rule: TaxRule | null; onClose: () => void }) {
  const [taxableAmount, setTaxableAmount] = useState('')
  const [deduction, setDeduction] = useState('')
  const [result, setResult] = useState<ReturnType<typeof calculateTax> | null>(null)

  if (!rule) return null

  function handleCalculate() {
    const amount = Number(taxableAmount) || 0
    const ded = Number(deduction) || 0
    setResult(calculateTax(rule as TaxRule, amount, ded))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <Calculator className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Tester le calcul</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rule.code} -- {rule.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Rule info */}
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Taux: <strong className="text-slate-800 dark:text-slate-200">{rule.rate}%</strong></span>
              <span className="text-slate-500 dark:text-slate-400">Methode: <strong className="text-slate-800 dark:text-slate-200">{METHOD_LABELS[rule.calculationMethod]}</strong></span>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Montant imposable (MGA)" type="number" value={taxableAmount} onChange={setTaxableAmount} placeholder="ex: 1000000" />
            <FieldInput label="Deduction (MGA)" type="number" value={deduction} onChange={setDeduction} placeholder="ex: 50000" />
          </div>

          <button
            onClick={handleCalculate}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          >
            Calculer
          </button>

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-900/20">
              <h4 className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-3">Resultat estime</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Base imposable</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fmtMGA(result.baseImposable)}</span>
                </div>
                {result.tauxApplique > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Taux applique</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{result.tauxApplique}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Deductions</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fmtMGA(result.deductions)}</span>
                </div>
                <div className="border-t border-violet-200 dark:border-violet-800 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">Montant de l'impot</span>
                    <span className="text-xl font-bold text-violet-700 dark:text-violet-400">{fmtMGA(result.montantImpot)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════ Skeleton ═══════════════════════════ */
function TaxRulesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600" />
          <div className="h-4 w-80 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
    </div>
  )
}
