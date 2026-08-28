import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  File,
  Grid3X3,
  Hash,
  Inbox,
  LayoutList,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  User,
  X,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiErrorMessage, apiGet, apiPost, apiPatch } from '../lib/api'
import { fmtDate, timeAgo } from '../lib/format'
import type { Page, TaxCenter, TaxRegime, TaxpayerSummary, TaxpayerDetail } from '../types'
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

/* ── Schemas ── */
const createSchema = z.object({
  nif: z.string().regex(/^\d{10}$/, 'Le NIF doit contenir exactement 10 chiffres.'),
  type: z.enum(['PERSON', 'COMPANY'], { message: 'Type invalide.' }),
  name: z.string().min(2, 'Le nom est requis.'),
  businessName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  registrationDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide.').optional().or(z.literal('')),
  address: z.string().optional(),
  taxCenterId: z.string().optional(),
  taxRegimeId: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

const SORT_COLUMNS: { key: string; label: string; sort: string }[] = [
  { key: 'nif', label: 'NIF', sort: 'nif' },
  { key: 'name', label: 'Contribuable', sort: 'name' },
  { key: 'type', label: 'Type', sort: 'type' },
  { key: 'taxCenter', label: 'Centre fiscal', sort: 'taxCenter.name' },
  { key: 'taxRegime', label: 'Régime', sort: 'taxRegime.name' },
  { key: 'status', label: 'Statut', sort: 'status' },
]

/* ── Helpers ── */
function copyToClipboard(text: string, toast: ReturnType<typeof useToast>) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copié !'))
}

function typeIcon(type: string) {
  return type === 'COMPANY'
    ? <Building2 className="h-4 w-4" />
    : <User className="h-4 w-4" />
}

function typeBadgeTone(type: string): 'indigo' | 'slate' {
  return type === 'COMPANY' ? 'indigo' : 'slate'
}

function statusTone(s: string): 'green' | 'amber' | 'red' | 'slate' {
  if (s === 'ACTIVE') return 'green'
  if (s === 'SUSPENDED' || s === 'CLOSED') return 'red'
  if (s === 'INACTIVE') return 'amber'
  return 'slate'
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
    SUSPENDED: 'Suspendu',
    CLOSED: 'Clôturé',
  }
  return m[s] ?? s
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/* ── Main component ── */
export default function Taxpayers() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [taxCenterFilter, setTaxCenterFilter] = useState('')
  const [taxRegimeFilter, setTaxRegimeFilter] = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const q = searchParams.get('q') ?? ''

  /* ── Query params ── */
  const sortColumn = SORT_COLUMNS.find((c) => c.key === sortKey)

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (q) params.set('q', q)
  if (status) params.set('status', status)
  if (type) params.set('type', type)
  if (taxCenterFilter) params.set('taxCenterId', taxCenterFilter)
  if (taxRegimeFilter) params.set('taxRegimeId', taxRegimeFilter)
  if (sortColumn) params.set('sort', `${sortColumn.sort},${sortDir}`)

  /* ── Queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayers', page, size, q, type, status, taxCenterFilter, taxRegimeFilter, sortKey, sortDir],
    queryFn: () => apiGet<Page<TaxpayerSummary>>(`/taxpayers?${params.toString()}`),
  })

  const { data: taxCenters } = useQuery({
    queryKey: ['tax-centers'],
    queryFn: () => apiGet<TaxCenter[]>('/tax-centers'),
  })

  const { data: taxRegimes } = useQuery({
    queryKey: ['tax-regimes'],
    queryFn: () => apiGet<TaxRegime[]>('/tax-regimes'),
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['taxpayer-detail', selectedTaxpayer],
    queryFn: () => apiGet<TaxpayerDetail>(`/taxpayers/${selectedTaxpayer}`),
    enabled: selectedTaxpayer !== null,
  })

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: (payload: CreateForm) => {
      const body: Record<string, unknown> = {
        nif: payload.nif,
        type: payload.type,
        name: payload.name,
      }
      if (payload.businessName) body.businessName = payload.businessName
      if (payload.firstName) body.firstName = payload.firstName
      if (payload.lastName) body.lastName = payload.lastName
      if (payload.birthDate) body.birthDate = payload.birthDate
      if (payload.legalRepresentative) body.legalRepresentative = payload.legalRepresentative
      if (payload.registrationDate) body.registrationDate = payload.registrationDate
      if (payload.phone) body.phone = payload.phone
      if (payload.email) body.email = payload.email
      if (payload.address) body.address = payload.address
      if (payload.taxCenterId) body.taxCenterId = Number(payload.taxCenterId)
      if (payload.taxRegimeId) body.taxRegimeId = Number(payload.taxRegimeId)
      return apiPost('/taxpayers', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      queryClient.invalidateQueries({ queryKey: ['taxpayer-stats'] })
      setCreateOpen(false)
      setCreateStep(0)
      toast.success('Contribuable créé avec succès')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiPatch(`/taxpayers/${id}/status?status=${status}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      queryClient.invalidateQueries({ queryKey: ['taxpayer-stats'] })
      toast.success('Statut mis à jour')
    },
  })

  /* ── Form ── */
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { type: 'COMPANY' } })

  const taxpayerType = watch('type')

  /* ── Derived ── */
  const hasFilters = !!(q || status || type || taxCenterFilter || taxRegimeFilter)
  const activeFilterCount = [q, status, type, taxCenterFilter, taxRegimeFilter].filter(Boolean).length

  /* ── Handlers ── */
  const onSearch = useCallback(
    (value: string) => {
      setPage(0)
      if (value) setSearchParams({ q: value })
      else setSearchParams({})
    },
    [setSearchParams]
  )

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function resetFilters() {
    setStatus('')
    setType('')
    setTaxCenterFilter('')
    setTaxRegimeFilter('')
    setSortKey('')
    setSortDir('asc')
    setSearchParams({})
    setPage(0)
  }

  function removeFilter(kind: string) {
    switch (kind) {
      case 'q':
        setSearchParams((p) => { p.delete('q'); return p })
        break
      case 'status':
        setStatus('')
        break
      case 'type':
        setType('')
        break
      case 'center':
        setTaxCenterFilter('')
        break
      case 'regime':
        setTaxRegimeFilter('')
        break
    }
    setPage(0)
  }

  function exportCsv() {
    const p = new URLSearchParams(params)
    p.delete('page')
    p.delete('size')
    p.delete('sort')
    apiGet<Page<TaxpayerSummary>>(`/taxpayers?${p.toString()}&size=9999`).then((rows) => {
      const csv = [
        'NIF,Nom,Type,Contact,Email,Statut,Centre fiscal,Régime',
        ...rows.content.map(
          (t) =>
            `${t.nif},"${t.name}",${t.type === 'COMPANY' ? 'Entreprise' : 'Particulier'},"${t.phone || ''}","${t.email || ''}",${t.status},${t.taxCenterCode ?? ''},${t.taxRegimeCode ?? ''}`
        ),
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contribuables_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV terminé')
    })
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
          <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Contribuables"
        subtitle="Registre central des contribuables et entreprises assujettis."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['taxpayers'] })}
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button variant="ghost" size="sm">
              <File className="h-4 w-4" /> Importer
            </Button>
            <Button
              onClick={() => {
                reset()
                setCreateStep(0)
                setCreateOpen(true)
              }}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Ajouter un contribuable
            </Button>
          </div>
        }
      />

      {/* ── Search & Filters ── */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <SearchInput
            value={q}
            onChange={onSearch}
            placeholder="Rechercher par NIF, nom, raison sociale, téléphone ou email..."
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
              <Field label="Type">
                <Select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Tous les types</option>
                  <option value="COMPANY">Entreprise</option>
                  <option value="PERSON">Particulier</option>
                </Select>
              </Field>
              <Field label="Statut">
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="CLOSED">Clôturé</option>
                </Select>
              </Field>
              <Field label="Centre fiscal">
                <Select
                  value={taxCenterFilter}
                  onChange={(e) => {
                    setTaxCenterFilter(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Tous les centres</option>
                  {taxCenters?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Régime fiscal">
                <Select
                  value={taxRegimeFilter}
                  onChange={(e) => {
                    setTaxRegimeFilter(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Tous les régimes</option>
                  {taxRegimes?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
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
              <button
                onClick={() => removeFilter('q')}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
              >
                Recherche : {q} <X className="h-3 w-3" />
              </button>
            )}
            {type && (
              <button
                onClick={() => removeFilter('type')}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Type : {type === 'COMPANY' ? 'Entreprise' : 'Particulier'} <X className="h-3 w-3" />
              </button>
            )}
            {status && (
              <button
                onClick={() => removeFilter('status')}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Statut : {statusLabel(status)} <X className="h-3 w-3" />
              </button>
            )}
            {taxCenterFilter && (
              <button
                onClick={() => removeFilter('center')}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Centre fiscal <X className="h-3 w-3" />
              </button>
            )}
            {taxRegimeFilter && (
              <button
                onClick={() => removeFilter('regime')}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              >
                Régime fiscal <X className="h-3 w-3" />
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

        {/* ── View toggle & results count ── */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.totalElements != null ? (
              <>
                <span className="font-medium text-slate-700 dark:text-slate-300">{data.totalElements}</span>{' '}
                contribuable{data.totalElements > 1 ? 's' : ''} trouvé{data.totalElements > 1 ? 's' : ''}
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
              title="Aucun contribuable trouvé"
              subtitle="Aucun contribuable ne correspond aux critères de recherche sélectionnés."
            />
            <div className="mt-4 flex justify-center gap-3">
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Réinitialiser les filtres
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  reset()
                  setCreateStep(0)
                  setCreateOpen(true)
                }}
              >
                <Plus className="h-4 w-4" /> Ajouter un contribuable
              </Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* ── Table View ── */
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  {SORT_COLUMNS.map((col) => (
                    <Th
                      key={col.key}
                      onClick={() => toggleSort(col.sort)}
                      className="cursor-pointer select-none hover:text-violet-600 transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.sort &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </span>
                    </Th>
                  ))}
                  <Th>Contact</Th>
                  <Th className="w-12"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {data.content.map((t) => (
                  <tr
                    key={t.id}
                    className="group cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-700/40"
                    onClick={() => setSelectedTaxpayer(t.id)}
                  >
                    {/* NIF */}
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-400">
                          {t.nif}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(t.nif, toast)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          aria-label="Copier le NIF"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>

                    {/* Contribuable */}
                    <Td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            t.type === 'COMPANY'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {typeIcon(t.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {t.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                          </p>
                        </div>
                      </div>
                    </Td>

                    {/* Type */}
                    <Td>
                      <Badge tone={typeBadgeTone(t.type)}>
                        {t.type === 'COMPANY' ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {t.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                      </Badge>
                    </Td>

                    {/* Centre fiscal */}
                    <Td>
                      {t.taxCenterCode ? (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t.taxCenterCode}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </Td>

                    {/* Régime */}
                    <Td>
                      {t.taxRegimeCode ? (
                        <Badge tone="blue">{t.taxRegimeCode}</Badge>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </Td>

                    {/* Statut */}
                    <Td>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${statusTone(t.status) === 'green' ? 'text-emerald-600 dark:text-emerald-400' : statusTone(t.status) === 'red' ? 'text-rose-600 dark:text-rose-400' : statusTone(t.status) === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${statusTone(t.status) === 'green' ? 'bg-emerald-500' : statusTone(t.status) === 'red' ? 'bg-rose-500' : statusTone(t.status) === 'amber' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {statusLabel(t.status)}
                      </div>
                    </Td>

                    {/* Contact */}
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        {t.email && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{t.email}</span>
                          </span>
                        )}
                        {t.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="h-3 w-3 shrink-0" />
                            {t.phone}
                          </span>
                        )}
                        {!t.email && !t.phone && <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </div>
                    </Td>

                    {/* Actions */}
                    <Td>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === t.id ? null : t.id)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen === t.id && (
                          <>
                            <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
                              <div className="space-y-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTaxpayer(t.id)
                                    setMenuOpen(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le profil
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.location.href = `/taxpayers/${t.id}`
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(t.nif, toast)
                                    setMenuOpen(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Copy className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Copier le NIF
                                </button>
                                {t.status === 'ACTIVE' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (confirm('Suspendre ce contribuable ?')) {
                                        statusMutation.mutate({ id: t.id, status: 'SUSPENDED' })
                                      }
                                      setMenuOpen(null)
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                  >
                                    <Shield className="h-4 w-4 shrink-0" /> Suspendre
                                  </button>
                                )}
                                {t.status === 'SUSPENDED' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      statusMutation.mutate({ id: t.id, status: 'ACTIVE' })
                                      setMenuOpen(null)
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                  >
                                    <Check className="h-4 w-4 shrink-0" /> Réactiver
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
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
              onPageSizeChange={(n) => {
                setSize(n)
                setPage(0)
              }}
              onChange={setPage}
            />
          </>
        ) : (
          /* ── Cards View ── */
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaxpayer(t.id)}
                  className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 hover:border-violet-200 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:border-violet-500/30 dark:hover:shadow-violet-900/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          t.type === 'COMPANY'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {t.type === 'COMPANY' ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                        <p className="font-mono text-xs text-violet-600 dark:text-violet-400">{t.nif}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${statusTone(t.status) === 'green' ? 'text-emerald-600 dark:text-emerald-400' : statusTone(t.status) === 'red' ? 'text-rose-600 dark:text-rose-400' : statusTone(t.status) === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${statusTone(t.status) === 'green' ? 'bg-emerald-500' : statusTone(t.status) === 'red' ? 'bg-rose-500' : statusTone(t.status) === 'amber' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      {statusLabel(t.status)}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={typeBadgeTone(t.type)}>{t.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}</Badge>
                      {t.taxCenterCode && <Badge tone="blue">{t.taxCenterCode}</Badge>}
                      {t.taxRegimeCode && <Badge tone="slate">{t.taxRegimeCode}</Badge>}
                    </div>
                    {(t.email || t.phone) && (
                      <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> {t.email}
                          </span>
                        )}
                        {t.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {t.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700/50">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t.createdAt ? timeAgo(t.createdAt) : ''}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-violet-500 dark:text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={data.number}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                pageSize={size}
                onPageSizeChange={(n) => {
                  setSize(n)
                  setPage(0)
                }}
                onChange={setPage}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Create Modal ── */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setCreateStep(0)
        }}
        title="Ajouter un contribuable"
        subtitle={createStep === 0 ? 'Étape 1/3 — Identification' : createStep === 1 ? 'Étape 2/3 — Coordonnées' : 'Étape 3/3 — Informations fiscales'}
        wide
      >
        <form
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
          noValidate
        >
          {createMutation.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              {apiErrorMessage(createMutation.error)}
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition ${
                  s <= createStep
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Step 0: Identification */}
          {createStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <Field label="Type de contribuable">
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                      taxpayerType === 'COMPANY'
                        ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <input type="radio" value="COMPANY" {...register('type')} className="sr-only" />
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        taxpayerType === 'COMPANY'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">Entreprise</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Société ou organisation</p>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                      taxpayerType === 'PERSON'
                        ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <input type="radio" value="PERSON" {...register('type')} className="sr-only" />
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        taxpayerType === 'PERSON'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                      }`}
                    >
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">Particulier</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Personne physique</p>
                    </div>
                  </label>
                </div>
              </Field>

              <Field label="NIF (10 chiffres)">
                <Input placeholder="0000409001" {...register('nif')} />
                {errors.nif && <p className="mt-1 text-xs text-rose-600">{errors.nif.message}</p>}
              </Field>

              <Field label={taxpayerType === 'COMPANY' ? 'Raison sociale' : 'Nom complet'}>
                <Input
                  placeholder={taxpayerType === 'COMPANY' ? 'ex : SARL MADIAK' : 'ex : RAKOTO Jean'}
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </Field>

              {taxpayerType === 'COMPANY' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nom commercial (facultatif)">
                    <Input {...register('businessName')} />
                  </Field>
                  <Field label="Représentant légal (facultatif)">
                    <Input placeholder="ex : RAKOTO Jean" {...register('legalRepresentative')} />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Prénom (facultatif)">
                    <Input {...register('firstName')} />
                  </Field>
                  <Field label="Nom de famille (facultatif)">
                    <Input {...register('lastName')} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Coordonnées */}
          {createStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {taxpayerType === 'PERSON' && (
                <Field label="Date de naissance (facultatif)">
                  <Input type="date" {...register('birthDate')} />
                </Field>
              )}
              <Field label="Date d'immatriculation (facultatif)">
                <Input type="date" {...register('registrationDate')} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Téléphone">
                  <Input placeholder="034 00 000 00" {...register('phone')} />
                </Field>
                <Field label="Email">
                  <Input type="email" placeholder="contact@example.mg" {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
                </Field>
              </div>
              <Field label="Adresse">
                <Input placeholder="Adresse complète" {...register('address')} />
              </Field>
            </div>
          )}

          {/* Step 2: Informations fiscales */}
          {createStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Field label="Centre fiscal">
                <Select {...register('taxCenterId')}>
                  <option value="">— Non assigné —</option>
                  {taxCenters?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Régime fiscal">
                <Select {...register('taxRegimeId')}>
                  <option value="">— Non assigné —</option>
                  {taxRegimes?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Résumé
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Type</span>
                    <Badge tone={typeBadgeTone(watch('type'))}>
                      {watch('type') === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">NIF</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {watch('nif') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Nom</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {watch('name') || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <div>
              {createStep > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateStep(createStep - 1)}>
                  <ChevronRight className="h-4 w-4 rotate-180" /> Précédent
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreateOpen(false)
                  setCreateStep(0)
                }}
              >
                Annuler
              </Button>
              {createStep < 2 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCreateStep(createStep + 1)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                >
                  <Check className="h-4 w-4" /> Créer le contribuable
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Taxpayer Profile Drawer ── */}
      {selectedTaxpayer !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setSelectedTaxpayer(null)}
        >
          <div
            className="fixed inset-y-0 right-0 w-full max-w-xl animate-drawer-in bg-white border-l border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner label="Chargement du profil..." />
              </div>
            ) : detail ? (
              <div className="flex h-full flex-col overflow-hidden">
                {/* Profile header */}
                <div className="border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold ${
                          detail.type === 'COMPANY'
                            ? 'bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-400'
                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 dark:from-slate-700 dark:to-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {detail.type === 'COMPANY' ? (
                          <Building2 className="h-7 w-7" />
                        ) : (
                          <span>{getInitials(detail.name)}</span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{detail.name}</h2>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-sm text-violet-600 dark:text-violet-400">
                            NIF : {detail.nif}
                          </span>
                          <button
                            onClick={() => copyToClipboard(detail.nif, toast)}
                            className="rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label="Copier le NIF"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge tone={typeBadgeTone(detail.type)}>
                            {detail.type === 'COMPANY' ? (
                              <><Building2 className="h-3 w-3" /> Entreprise</>
                            ) : (
                              <><User className="h-3 w-3" /> Particulier</>
                            )}
                          </Badge>
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${statusTone(detail.status) === 'green' ? 'text-emerald-600 dark:text-emerald-400' : statusTone(detail.status) === 'red' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${statusTone(detail.status) === 'green' ? 'bg-emerald-500' : statusTone(detail.status) === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                            {statusLabel(detail.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTaxpayer(null)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      aria-label="Fermer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`/taxpayers/${detail.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" /> Voir la fiche complète
                    </Link>
                    {detail.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          if (confirm('Suspendre ce contribuable ?')) {
                            statusMutation.mutate({ id: detail.id, status: 'SUSPENDED' })
                            setSelectedTaxpayer(null)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        <Shield className="h-3.5 w-3.5" /> Suspendre
                      </button>
                    )}
                    {detail.status === 'SUSPENDED' && (
                      <button
                        onClick={() => {
                          statusMutation.mutate({ id: detail.id, status: 'ACTIVE' })
                          setSelectedTaxpayer(null)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5" /> Réactiver
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Informations générales */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Informations générales
                    </h3>
                    <div className="space-y-3">
                      {detail.businessName && (
                        <InfoRow label="Raison sociale" value={detail.businessName} />
                      )}
                      {detail.firstName && (
                        <InfoRow label="Prénom" value={detail.firstName} />
                      )}
                      {detail.lastName && (
                        <InfoRow label="Nom" value={detail.lastName} />
                      )}
                      {detail.birthDate && (
                        <InfoRow label="Date de naissance" value={fmtDate(detail.birthDate)} />
                      )}
                      {detail.legalRepresentative && (
                        <InfoRow label="Représentant légal" value={detail.legalRepresentative} />
                      )}
                      {detail.registrationDate && (
                        <InfoRow label="Date d'immatriculation" value={fmtDate(detail.registrationDate)} />
                      )}
                    </div>
                  </div>

                  {/* Coordonnées */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Coordonnées
                    </h3>
                    <div className="space-y-3">
                      {detail.email && (
                        <InfoRow
                          label="Email"
                          value={
                            <a href={`mailto:${detail.email}`} className="text-violet-600 hover:underline dark:text-violet-400">
                              {detail.email}
                            </a>
                          }
                        />
                      )}
                      {detail.phone && (
                        <InfoRow
                          label="Téléphone"
                          value={
                            <a href={`tel:${detail.phone}`} className="text-violet-600 hover:underline dark:text-violet-400">
                              {detail.phone}
                            </a>
                          }
                        />
                      )}
                      {detail.address && <InfoRow label="Adresse" value={detail.address} />}
                    </div>
                  </div>

                  {/* Situation fiscale */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Situation fiscale
                    </h3>
                    <div className="space-y-3">
                      {detail.taxCenterName && (
                        <InfoRow
                          label="Centre fiscal"
                          value={
                            <span>
                              {detail.taxCenterCode} — {detail.taxCenterName}
                            </span>
                          }
                        />
                      )}
                      {detail.taxRegimeName && (
                        <InfoRow
                          label="Régime fiscal"
                          value={
                            <Badge tone="blue">
                              {detail.taxRegimeCode} — {detail.taxRegimeName}
                            </Badge>
                          }
                        />
                      )}
                      <InfoRow
                        label="Obligations"
                        value={<span>{detail.obligationsCount} obligation{detail.obligationsCount > 1 ? 's' : ''}</span>}
                      />
                    </div>
                  </div>

                  {/* Adresses */}
                  {detail.addresses && detail.addresses.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Adresses
                      </h3>
                      <div className="space-y-2">
                        {detail.addresses.map((a) => (
                          <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="font-medium uppercase">{a.type}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                              {a.addressLine1}
                              {a.addressLine2 && `, ${a.addressLine2}`}
                              {a.city && `, ${a.city}`}
                              {a.region && `, ${a.region}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activités */}
                  {detail.activities && detail.activities.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Activités
                      </h3>
                      <div className="space-y-2">
                        {detail.activities.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700/50 dark:bg-slate-800/50">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                              <Hash className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{a.code}</p>
                            </div>
                            {a.primary && (
                              <Badge tone="green" className="ml-auto">Principale</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-500">Impossible de charger le profil.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helper components ── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/50 px-3 py-2 dark:bg-slate-800/30">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}
