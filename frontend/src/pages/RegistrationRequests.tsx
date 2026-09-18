import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { apiGet, apiPost, apiErrorMessage } from '../lib/api'
import { useToast } from '../components/Toast'
import { useDropdown } from '../lib/useDropdown'
import {
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  Spinner,
  Textarea,
} from '../components/ui'

/* ── Types ── */

interface RegistrationRequest {
  id: number
  reference: string
  requestType: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  nif: string | null
  address: string | null
  organization: string
  position: string | null
  role: string
  taxCenter: string | null
  message: string | null
  status: string
  rejectionReason: string | null
  assignedTo: string | null
  assignedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string | null
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

interface Stats {
  total: number
  PENDING: number
  UNDER_REVIEW: number
  APPROVED: number
  REJECTED: number
}

/* ── Config ── */

const STATUS_TABS = [
  { key: '', label: 'Toutes', icon: Inbox },
  { key: 'PENDING', label: 'En attente', icon: Clock },
  { key: 'UNDER_REVIEW', label: 'En vérification', icon: ShieldCheck },
  { key: 'APPROVED', label: 'Approuvées', icon: CheckCircle2 },
  { key: 'REJECTED', label: 'Rejetées', icon: XCircle },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'INDIVIDUAL', label: 'Particulier' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'TAX_AGENT', label: 'Agent fiscal' },
  { value: 'ACCOUNTANT', label: 'Comptable' },
  { value: 'COLLECTION_AGENT', label: 'Agent recouvrement' },
  { value: 'OTHER', label: 'Autre' },
]

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Particulier',
  COMPANY: 'Entreprise',
  TAX_AGENT: 'Agent fiscal',
  ACCOUNTANT: 'Comptable',
  COLLECTION_AGENT: 'Agent recouvrement',
  OTHER: 'Autre',
}

function statusConfig(status: string) {
  switch (status) {
    case 'PENDING': return { label: 'En attente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: <Clock className="h-3.5 w-3.5" /> }
    case 'UNDER_REVIEW': return { label: 'En vérification', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
    case 'APPROVED': return { label: 'Approuvée', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
    case 'REJECTED': return { label: 'Rejetée', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', icon: <XCircle className="h-3.5 w-3.5" /> }
    default: return { label: status, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', icon: null }
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

/* ── Stats Cards ── */

function StatsCards({ stats }: { stats: Stats | undefined }) {
  if (!stats) return null
  const cards = [
    { label: 'Total', value: stats.total, iconBg: 'bg-slate-100', iconColor: 'text-slate-500', icon: <Inbox className="h-5 w-5" /> },
    { label: 'En attente', value: stats.PENDING, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', icon: <Clock className="h-5 w-5" /> },
    { label: 'En vérification', value: stats.UNDER_REVIEW, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: <Eye className="h-5 w-5" /> },
    { label: 'Approuvées', value: stats.APPROVED, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: <UserCheck className="h-5 w-5" /> },
    { label: 'Rejetées', value: stats.REJECTED, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', icon: <XCircle className="h-5 w-5" /> },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {cards.map((c, i) => (
        <div key={c.label} style={{ animationDelay: `${i * 0.08}s` }} className="card fx-spot group relative animate-fade-in overflow-hidden p-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-violet-400/10"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{c.label}</p>
              <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{c.value}</p>
            </div>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.iconBg} ${c.iconColor}`}>{c.icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Request Row ── */

function RequestRow({ request, onView, onAssign, onApprove, onReject, isMutating }: {
  request: RegistrationRequest
  onView: () => void
  onAssign: () => void
  onApprove: () => void
  onReject: () => void
  isMutating: boolean
}) {
  const { isOpen, close, triggerProps, dropdownProps } = useDropdown()
  const sc = statusConfig(request.status)
  const isActive = request.status === 'PENDING' || request.status === 'UNDER_REVIEW'

  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{request.name}</p>
          <span className="hidden sm:inline text-[10px] font-mono text-slate-400">{request.reference}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Mail className="h-3 w-3" />
          <span>{request.email}</span>
          <span>·</span>
          <span>{typeLabels[request.requestType] ?? request.requestType}</span>
          <span>·</span>
          <span>{request.organization}</span>
        </div>
      </div>
      <div className="hidden sm:flex shrink-0 items-center min-w-[130px] justify-end">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${sc.bg} ${sc.color}`}>
          {sc.icon} {sc.label}
        </span>
      </div>
      <div className="hidden lg:block text-right min-w-[100px]">
        <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(request.createdAt)}</p>
        {request.assignedTo && (
          <p className="mt-0.5 text-[10px] text-slate-400">→ {request.assignedTo}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onView}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
          title="Voir les détails">
          <Eye className="h-4 w-4" />
        </button>
        {isActive && (
          <div className="relative">
            <button {...triggerProps}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {isOpen && (
              <div {...dropdownProps} className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-slate-700/80 dark:bg-slate-800">
                <div className="space-y-0.5">
                  {request.status === 'PENDING' && !request.assignedTo && (
                    <button onClick={() => { onAssign(); close() }} disabled={isMutating}
                      className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50">
                      <UserCheck className="h-4 w-4 shrink-0" /> Prendre en charge
                    </button>
                  )}
                  <button onClick={() => { onApprove(); close() }} disabled={isMutating}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Approuver
                  </button>
                  <button onClick={() => { onReject(); close() }} disabled={isMutating}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 disabled:opacity-50">
                    <XCircle className="h-4 w-4 shrink-0" /> Rejeter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Detail Modal ── */

function DetailModal({ request, onClose, onAssign, onApprove, onReject, isMutating }: {
  request: RegistrationRequest
  onClose: () => void
  onAssign: () => void
  onApprove: (role?: string) => void
  onReject: (reason: string) => void
  isMutating: boolean
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [approveRole, setApproveRole] = useState(request.role)
  const sc = statusConfig(request.status)
  const isActive = request.status === 'PENDING' || request.status === 'UNDER_REVIEW'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Détail de la demande</h3>
            <p className="mt-0.5 text-xs text-slate-400">{request.reference}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{request.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{request.email}</p>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.color}`}>
                {sc.icon} {sc.label}
              </span>
            </div>
          </div>

          {/* Infos */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-1/3">Champ</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-1/3">Type</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{typeLabels[request.requestType] ?? request.requestType}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Organisation</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.organization}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Téléphone</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.phone ?? '—'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">NIF</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.nif ?? '—'}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Adresse</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.address ?? '—'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Fonction</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.position ?? '—'}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Rôle souhaité</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.role}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Centre fiscal</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.taxCenter ?? '—'}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Demandé le</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{fmtDate(request.createdAt)}</td>
                </tr>
                {request.assignedTo && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Agent responsable</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.assignedTo}</td>
                  </tr>
                )}
                {request.reviewedBy && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Traité par</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{request.reviewedBy}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {request.message && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Message</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{request.message}</p>
            </div>
          )}

          {request.rejectionReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">Motif du rejet</p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">{request.rejectionReason}</p>
            </div>
          )}

          {/* Actions */}
          {isActive && (
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              {showReject ? (
                <div className="space-y-3">
                  <Textarea
                    rows={3}
                    placeholder="Motif du rejet (obligatoire)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowReject(false)}>Annuler</Button>
                    <Button variant="danger" disabled={!rejectReason.trim() || isMutating} loading={isMutating}
                      onClick={() => { onReject(rejectReason); onClose() }}>
                      Confirmer le rejet
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {request.status === 'PENDING' && !request.assignedTo && (
                    <Button variant="secondary" onClick={() => { onAssign(); onClose() }} disabled={isMutating}>
                      <UserCheck className="h-4 w-4" /> Prendre en charge
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Select value={approveRole} onChange={(e) => setApproveRole(e.target.value)} className="w-48">
                      {TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    <Button onClick={() => { onApprove(approveRole); onClose() }} disabled={isMutating} loading={isMutating}>
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </Button>
                  </div>
                  <Button variant="danger" onClick={() => setShowReject(true)} disabled={isMutating}>
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



/* ── Main Page ── */

export default function RegistrationRequests() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['reg-stats'],
    queryFn: () => apiGet<Stats>('/auth/admin/registrations/stats'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', page, size, statusFilter, typeFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(size) })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (search) params.set('q', search)
      return apiGet<PageResponse<RegistrationRequest>>(`/auth/admin/registrations?${params.toString()}`)
    },
  })

  const { data: detailData } = useQuery({
    queryKey: ['reg-detail', detailId],
    queryFn: () => apiGet<RegistrationRequest>(`/auth/admin/registrations/${detailId}`),
    enabled: detailId != null,
  })

  const assignMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/auth/admin/registrations/${id}/assign`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['reg-stats'] })
      toast.success('Demande prise en charge')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, roleCode }: { id: number; roleCode?: string }) =>
      apiPost(`/auth/admin/registrations/${id}/approve`, roleCode ? { roleCode } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['reg-stats'] })
      queryClient.invalidateQueries({ queryKey: ['reg-detail'] })
      toast.success('Demande approuvée. Le compte a été créé.')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost(`/auth/admin/registrations/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['reg-stats'] })
      queryClient.invalidateQueries({ queryKey: ['reg-detail'] })
      toast.success('Demande rejetée.')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const isMutating = assignMutation.isPending || approveMutation.isPending || rejectMutation.isPending

  if (isLoading) return <Spinner label="Chargement des demandes..." />

  return (
    <div className="fx-simple space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Demandes d'inscription
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gérez les demandes d'accès des nouveaux utilisateurs.
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filtres */}
      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Rechercher par référence, nom, email, NIF..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="w-44">
            <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          {(search || typeFilter) && (
            <button onClick={() => { setSearch(''); setTypeFilter(''); setPage(0) }}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200/70 px-5 py-2 dark:border-slate-700/50">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(0) }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                statusFilter === tab.key
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!data || data.content.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande"
              subtitle="Aucune demande d'inscription ne correspond aux critères." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.content.map((r) => (
              <RequestRow key={r.id} request={r}
                onView={() => setDetailId(r.id)}
                onAssign={() => assignMutation.mutate(r.id)}
                onApprove={() => approveMutation.mutate({ id: r.id })}
                onReject={() => setDetailId(r.id)}
                isMutating={isMutating} />
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements}
            pageSize={size} onPageSizeChange={(n) => { setSize(n); setPage(0) }} onChange={setPage} />
        )}
      </Card>

      {/* Detail Modal */}
      {detailId != null && detailData && (
        <DetailModal
          request={detailData}
          onClose={() => setDetailId(null)}
          onAssign={() => assignMutation.mutate(detailId)}
          onApprove={(role) => approveMutation.mutate({ id: detailId, roleCode: role })}
          onReject={(reason) => rejectMutation.mutate({ id: detailId, reason })}
          isMutating={isMutating} />
      )}
    </div>
  )
}
