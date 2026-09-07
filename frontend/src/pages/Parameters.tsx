import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Clock,
  FileText,
  Filter,
  Key,
  MoreHorizontal,
  Pencil,
  Percent,
  Save,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPut } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import type { SystemParameter } from '../types'
import { Button, Card, EmptyState, Field, Input, Modal } from '../components/ui'
import { useToast } from '../components/Toast'

/* ── Category definitions ── */
interface CategoryDef {
  key: string
  label: string
  subtitle: string
  icon: React.ReactNode
  color: string
  bgGrad: string
  iconBg: string
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'Général', subtitle: 'Paramètres généraux', icon: <SlidersHorizontal className="h-5 w-5" />, color: 'text-violet-600', bgGrad: 'bg-gradient-to-br from-[#5B3FD6] to-[#7C5CE0] text-white shadow-lg shadow-violet-500/25', iconBg: 'bg-white/20' },
  { key: 'FISCAL', label: 'Fiscal', subtitle: 'Paramètres fiscaux', icon: <FileText className="h-5 w-5" />, color: 'text-blue-600', bgGrad: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25', iconBg: 'bg-white/20' },
  { key: 'INSTITUTION', label: 'Institution', subtitle: 'Informations institutionnelles', icon: <Building2 className="h-5 w-5" />, color: 'text-emerald-600', bgGrad: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25', iconBg: 'bg-white/20' },
  { key: 'QUITTANCE', label: 'Taux & pénalités', subtitle: 'Taxes et pénalités', icon: <Percent className="h-5 w-5" />, color: 'text-amber-600', bgGrad: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25', iconBg: 'bg-white/20' },
  { key: 'NOTIFICATION', label: 'Notifications', subtitle: 'Préférences des notifications', icon: <Shield className="h-5 w-5" />, color: 'text-rose-600', bgGrad: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25', iconBg: 'bg-white/20' },
]

/* ── Icon map per category for parameter rows ── */
const CATEGORY_ICON_MAP: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  FISCAL: { icon: <FileText className="h-4 w-4" />, bg: 'bg-blue-50', color: 'text-blue-600' },
  INSTITUTION: { icon: <Building2 className="h-4 w-4" />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  QUITTANCE: { icon: <Percent className="h-4 w-4" />, bg: 'bg-amber-50', color: 'text-amber-600' },
  NOTIFICATION: { icon: <Shield className="h-4 w-4" />, bg: 'bg-rose-50', color: 'text-rose-600' },
  Système: { icon: <Settings className="h-4 w-4" />, bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-400' },
}

const DEFAULT_ICON = { icon: <Key className="h-4 w-4" />, bg: 'bg-violet-50', color: 'text-violet-600' }

function getIconForParam(p: SystemParameter) {
  return CATEGORY_ICON_MAP[p.category ?? ''] ?? DEFAULT_ICON
}

function friendlyValue(p: SystemParameter): string {
  if (p.key === 'CURRENCY') return `${p.value} (Ariary)`
  if (p.key.includes('RATE')) return `${p.value} %`
  if (p.key === 'INSTITUTION_EMAIL') return p.value
  return p.value
}

export default function Parameters() {
  const [selected, setSelected] = useState<SystemParameter | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['parameters'],
    queryFn: () => apiGet<SystemParameter[]>('/parameters'),
  })

  const save = useMutation({
    mutationFn: () =>
      apiPut('/parameters', {
        key: selected!.key,
        value: editValue,
        description: editDescription || undefined,
        category: selected!.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parameters'] })
      setSelected(null)
      toast.success('Paramètre enregistré avec succès')
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err))
    },
  })

  const openEdit = (p: SystemParameter) => {
    setSelected(p)
    setEditValue(p.value)
    setEditDescription(p.description)
  }

  /* ── Derived data ── */
  const allParams = data ?? []
  const categories = useMemo(() => {
    const cats = new Set(allParams.map((p) => p.category).filter(Boolean))
    return ['FISCAL', 'INSTITUTION', 'QUITTANCE', 'NOTIFICATION'].filter((c) => cats.has(c))
  }, [allParams])

  const filtered = useMemo(() => {
    let result = allParams
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.key.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.value.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      )
    }
    return result
  }, [allParams, activeCategory, search])

  const lastUpdated = useMemo(() => {
    if (!allParams.length) return null
    return allParams.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b))
  }, [allParams])

  const nextReview = useMemo(() => {
    const now = new Date()
    const year = now.getMonth() >= 11 ? now.getFullYear() + 1 : now.getFullYear()
    return `${String(year + 1).padStart(2, '0')}/01/01`
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            Paramètres système
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configuration globale de l'application et des paramètres fiscaux.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          loading={save.isPending}
          onClick={() => {
            if (selected) save.mutate()
          }}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          Sauvegarder les modifications
        </Button>
      </div>

      {/* ── Info cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={<SlidersHorizontal className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="PARAMÈTRES DÉFINIS"
          value={allParams.length}
          sub="Clés de configuration"
        />
        <InfoCard
          icon={<Settings className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="CATÉGORIES"
          value={categories.length}
          sub="Catégories configurées"
        />
        <InfoCard
          icon={<Shield className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="DERNIÈRE MISE À JOUR"
          value={lastUpdated ? formatDate(lastUpdated.updatedAt) : '—'}
          sub={lastUpdated ? 'Par Admin Fiscal' : 'Aucune donnée'}
        />
        <InfoCard
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="PROCHAINE RÉVISION"
          value={nextReview}
          sub="Exercice fiscal suivant"
        />
      </div>

      {/* ── Category navigation ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Catégories de paramètres
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-200 ${
                  isActive
                    ? cat.bgGrad
                    : 'bg-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    isActive ? cat.iconBg : cat.iconBg + ' ' + cat.color
                  }`}
                >
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isActive ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {cat.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Configuration zone ── */}
      <Card className="overflow-hidden">
        {/* Header bar */}
        <div className="border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Configuration {activeCategory === 'all' ? 'générale' : CATEGORIES.find((c) => c.key === activeCategory)?.label ?? ''}
            </h2>
            <div className="flex-1" />
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un paramètre…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:text-slate-500 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Category filter dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                >
                  <option value="all">Toutes catégories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIES.find((cat) => cat.key === c)?.label ?? c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Show inactive toggle */}
            <label className="flex cursor-pointer items-center gap-2.5 select-none text-sm text-slate-600 dark:text-slate-400">
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  showInactive ? 'bg-violet-500' : 'bg-slate-300'
                }`}
                onClick={() => setShowInactive(!showInactive)}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    showInactive ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                Paramètres inactifs
              </span>
            </label>
          </div>
        </div>

        {/* Parameter list */}
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun paramètre trouvé"
              subtitle={search ? `Aucun résultat pour « ${search} »` : 'Aucun paramètre dans cette catégorie'}
            />
          ) : (
            filtered.map((p) => {
              const iconInfo = getIconForParam(p)
              const isEditing = selected?.id === p.id
              return (
                <div
                  key={p.id}
                  className={`group px-5 py-4 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 ${
                    isEditing ? 'bg-violet-50/50 ring-1 ring-inset ring-violet-200' : ''
                  }`}
                >
                  {/* Desktop layout */}
                  <div className="hidden sm:flex sm:items-center sm:gap-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconInfo.bg} ${iconInfo.color}`}
                    >
                      {iconInfo.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {p.key}
                        </code>
                        {p.category && (
                          <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                        {p.description || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                        {friendlyValue(p)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600">Actif</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenu(actionMenu === p.id ? null : p.id)
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      {actionMenu === p.id && (
                        <>
                          <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-full z-40 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                            <div className="space-y-0.5">
                              <button
                                onClick={() => { openEdit(p); setActionMenu(null) }}
                                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconInfo.bg} ${iconInfo.color}`}
                      >
                        {iconInfo.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <code className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {p.key}
                          </code>
                          {p.category && (
                            <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {p.description || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-12">
                      <span className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                        {friendlyValue(p)}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-medium text-emerald-600">Actif</span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenu(actionMenu === p.id ? null : p.id)
                            }}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                          {actionMenu === p.id && (
                            <>
                              <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                              <div className="absolute right-0 top-full z-40 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                                <div className="space-y-0.5">
                                  <button
                                    onClick={() => { openEdit(p); setActionMenu(null) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-700/50 px-5 py-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} paramètre{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
              {search && ` pour « ${search} »`}
            </p>
          </div>
        )}
      </Card>

      {/* ── Edit modal ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Modifier : ${selected?.key ?? ''}`}
        subtitle={selected?.description}
        wide
      >
        {selected && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
            className="space-y-5"
          >
            {save.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiErrorMessage(save.error)}
              </div>
            )}

            {/* Key display */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getIconForParam(selected).bg} ${getIconForParam(selected).color}`}>
                {getIconForParam(selected).icon}
              </span>
              <div className="min-w-0">
                <code className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">{selected.key}</code>
                {selected.category && (
                  <span className="ml-2 rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {selected.category}
                  </span>
                )}
              </div>
            </div>

            <Field label="Valeur" hint={selected.key.includes('RATE') ? 'Valeur numérique en pourcentage' : undefined}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Entrez la valeur…"
                className="font-mono"
              />
            </Field>

            <Field label="Description">
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description du paramètre…"
              />
            </Field>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Dernière modification : {fmtDateTime(selected.updatedAt)}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)} className="flex-1 sm:flex-none">
                  Annuler
                </Button>
                <Button type="submit" variant="primary" loading={save.isPending} disabled={!editValue} className="flex-1 sm:flex-none">
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

/* ── Info Card sub-component ── */
function InfoCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: React.ReactNode
  sub: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  )
}

/* ── Helpers ── */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return '—'
  }
}
