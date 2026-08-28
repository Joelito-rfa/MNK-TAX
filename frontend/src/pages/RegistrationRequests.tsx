import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Mail,
  MoreHorizontal,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { apiGet, apiErrorMessage } from '../lib/api'
import { useToast } from '../components/Toast'
import { useDropdown } from '../lib/useDropdown'
import { Card, EmptyState, Pagination, Spinner } from '../components/ui'

interface RegistrationRequest {
  id: number
  name: string
  email: string
  organization: string
  role: string
  message: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const STATUS_TABS = [
  { key: '', label: 'Toutes', icon: Inbox },
  { key: 'PENDING', label: 'En attente', icon: Clock },
  { key: 'APPROVED', label: 'Approuvées', icon: CheckCircle2 },
  { key: 'REJECTED', label: 'Rejetées', icon: XCircle },
]

function statusConfig(status: string) {
  switch (status) {
    case 'PENDING': return { label: 'En attente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Clock className="h-3.5 w-3.5" /> }
    case 'APPROVED': return { label: 'Approuvée', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
    case 'REJECTED': return { label: 'Rejetée', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: <XCircle className="h-3.5 w-3.5" /> }
    default: return { label: status, color: 'text-slate-500', bg: 'bg-slate-100', icon: null }
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '--' }
}

function RequestCard({ request, onApprove, onReject, isMutating }: {
  request: RegistrationRequest
  onApprove: () => void
  onReject: () => void
  isMutating: boolean
}) {
  const { isOpen, close, triggerProps, dropdownProps } = useDropdown()
  const [detailOpen, setDetailOpen] = useState(false)
  const sc = statusConfig(request.status)

  return (
    <>
      <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{request.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Mail className="h-3 w-3" />
            <span>{request.email}</span>
            <span>·</span>
            <span>{request.organization}</span>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${sc.bg} ${sc.color}`}>
            {sc.icon} {sc.label}
          </span>
        </div>
        <div className="hidden lg:block text-right min-w-[100px]">
          <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(request.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setDetailOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
            title="Voir les détails">
            <Eye className="h-4 w-4" />
          </button>
          {request.status === 'PENDING' && (
            <div className="relative">
              <button {...triggerProps}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOpen && (
                <div {...dropdownProps} className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                  <div className="space-y-0.5">
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

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setDetailOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Détails de la demande</h3>
              <button onClick={() => setDetailOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Organisation</p>
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{request.organization}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rôle souhaité</p>
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{request.role}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Demandé le</p>
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{fmtDate(request.createdAt)}</p>
                </div>
                {request.reviewedBy && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Traité par</p>
                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{request.reviewedBy}</p>
                  </div>
                )}
              </div>
              {request.message && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Message</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{request.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function RegistrationRequests() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', page, size, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(size) })
      if (statusFilter) params.set('status', statusFilter)
      return apiGet<PageResponse<RegistrationRequest>>(`/auth/admin/registrations?${params.toString()}`)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => post(`/auth/admin/registrations/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      toast.success('Demande approuvée. Le compte a été créé.')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => post(`/auth/admin/registrations/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      toast.success('Demande rejetée.')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const pendingCount = data?.content.filter((r) => r.status === 'PENDING').length ?? 0

  if (isLoading) return <Spinner label="Chargement des demandes..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Demandes d'inscription
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gérez les demandes d'accès des nouveaux utilisateurs.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" /> {pendingCount} en attente
          </span>
        )}
      </div>

      <Card className="overflow-visible">
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

        {!data || data.content.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande"
              subtitle="Aucune demande d'inscription ne correspond aux critères." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.content.map((r) => (
              <RequestCard key={r.id} request={r}
                onApprove={() => approveMutation.mutate(r.id)}
                onReject={() => rejectMutation.mutate(r.id)}
                isMutating={approveMutation.isPending || rejectMutation.isPending} />
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements}
            pageSize={size} onChange={setPage} />
        )}
      </Card>
    </div>
  )
}

async function post(url: string) {
  const { apiPost } = await import('../lib/api')
  return apiPost(url)
}
