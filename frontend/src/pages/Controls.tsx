import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSearch, Gavel, Grid3X3, LayoutList, PlusCircle, MoreHorizontal, Pencil, Trash2, Eye, CalendarClock } from 'lucide-react'
import { apiDelete, apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import { fmtDate, fmtDateTime, fmtMGA } from '../lib/format'
import type { Page, TaxControl, TaxControlDetail, TaxpayerSummary, User } from '../types'
import { useAuth } from '../lib/auth'
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
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

export const controlTypeLabels: Record<string, string> = {
  DOCUMENTARY: 'Sur pièces',
  ON_SITE: 'Sur place',
  MIXED: 'Mixte',
}

const controlStatusLabels: Record<string, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  ANOMALY_DETECTED: 'Anomalies détectées',
  REDRESSEMENT: 'Redressement',
  CLOSED: 'Clôturé',
}

const allowedTransitions: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['ANOMALY_DETECTED', 'CLOSED'],
  ANOMALY_DETECTED: ['REDRESSEMENT', 'CLOSED'],
  REDRESSEMENT: ['CLOSED'],
  CLOSED: [],
}

export default function Controls() {
  const { can } = useAuth()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/tax-controls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Contrôle fiscal supprimé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (q) params.set('q', q)

  const { data, isLoading } = useQuery({
    queryKey: ['controls', page, size, status, q],
    queryFn: () => apiGet<Page<TaxControl>>(`/tax-controls?${params.toString()}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôles fiscaux"
        subtitle="Contrôles, vérifications et redressements des contribuables"
        actions={
          can('CONTROL_WRITE') && (
            <Button onClick={() => setCreateOpen(true)}>
              <FileSearch className="h-4 w-4" /> Nouveau contrôle
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={q}
              onChange={(v) => { setQ(v); setPage(0) }}
              placeholder="Rechercher par référence, NIF, nom ou motif…"
              className="min-w-56 flex-1"
            />
            <div className="w-48">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                <option value="">Tous les statuts</option>
                {Object.entries(controlStatusLabels).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </div>
          </div>
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

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun contrôle fiscal" subtitle="Modifiez vos critères de recherche." />
        ) : viewMode === 'list' ? (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Type</Th>
                  <Th>Période contrôlée</Th>
                  <Th>Agent</Th>
                  <Th>Statut</Th>
                  <Th>Redressement</Th>
                  <Th>Créé le</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                    <Td className="font-mono font-medium text-brand-700">{c.reference}</Td>
                    <Td>
                      <Link to={`/taxpayers/${c.taxpayerId}`} className="hover:underline">
                        <span className="block max-w-44 truncate font-medium text-slate-800 dark:text-slate-200">{c.taxpayerName}</span>
                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500">{c.nif}</span>
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone="slate">{controlTypeLabels[c.controlType] ?? c.controlType}</Badge>
                    </Td>
                    <Td>{fmtDate(c.periodStart)} → {fmtDate(c.periodEnd)}</Td>
                    <Td>{c.agentName ?? '—'}</Td>
                    <Td>
                      <StatusBadge value={c.status} />
                    </Td>
                    <Td className={c.redressement ? 'font-medium text-amber-700' : ''}>
                      {c.redressement != null ? fmtMGA(c.redressement) : '—'}
                    </Td>
                    <Td>{fmtDate(c.createdAt)}</Td>
<Td>
                       <div className="relative">
                         <button
                           onClick={(e) => {
                             e.stopPropagation()
                             setActionMenu(actionMenu === c.id ? null : c.id)
                           }}
                           className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                           aria-label="Actions"
                         >
                           <MoreHorizontal className="h-4 w-4" />
                         </button>
                         {actionMenu === c.id && (
                           <>
                             <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                             <div className="absolute right-0 top-full z-40 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                               <div className="space-y-0.5">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     setDetailId(c.id)
                                     setActionMenu(null)
                                   }}
                                   className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                 >
                                   <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le détail
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     setDetailId(c.id)
                                     setActionMenu(null)
                                   }}
                                   className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                 >
                                   <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     setDetailId(c.id)
                                     setActionMenu(null)
                                   }}
                                   className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                 >
                                   <CalendarClock className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Changer le statut
                                 </button>
                                 <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     if (confirm('Supprimer ce contrôle ?')) remove.mutate(c.id)
                                     setActionMenu(null)
                                   }}
                                   className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                 >
                                   <Trash2 className="h-4 w-4 shrink-0" /> Supprimer
                                 </button>
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
              onPageSizeChange={(n) => { setSize(n); setPage(0) }}
              onChange={setPage}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-4">
            {data.content.map((c) => (
              <Card key={c.id} className="group cursor-pointer transition hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800" onClick={() => setDetailId(c.id)}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        <Gavel className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-brand-700">{c.reference}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={c.status} />
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionMenu(actionMenu === c.id ? null : c.id)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === c.id && (
                          <>
                            <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 top-full z-40 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                              <div className="space-y-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDetailId(c.id)
                                    setActionMenu(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le détail
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                   setDetailId(c.id)
                                   setActionMenu(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                   setDetailId(c.id)
                                   setActionMenu(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <CalendarClock className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Changer le statut
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('Supprimer ce contrôle ?')) remove.mutate(c.id)
                                    setActionMenu(null)
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4 shrink-0" /> Supprimer
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.taxpayerName}</p>
                      <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{c.nif}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Badge tone="slate">{controlTypeLabels[c.controlType] ?? c.controlType}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Période:</span>
                      <span>{fmtDate(c.periodStart)} → {fmtDate(c.periodEnd)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Agent:</span>
                      <span>{c.agentName ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Redressement:</span>
                      <span className={c.redressement ? 'font-medium text-amber-700' : ''}>
                        {c.redressement != null ? fmtMGA(c.redressement) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Créé le:</span>
                      <span>{fmtDate(c.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {createOpen && (
        <CreateControlModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['controls'] })
          }}
        />
      )}
      {detailId != null && (
        <ControlDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: ['controls'] })
          }}
        />
      )}
    </div>
  )
}

/* ──────────────────────── Création ──────────────────────── */

export function CreateControlModal({ onClose }: { onClose: () => void }) {
  const { can } = useAuth()
  const [taxpayerId, setTaxpayerId] = useState('')
  const [controlType, setControlType] = useState('DOCUMENTARY')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [reason, setReason] = useState('')
  const [agentId, setAgentId] = useState('')
  const toast = useToast()

  const { data: taxpayers, isLoading: loadingTaxpayers } = useQuery({
    queryKey: ['taxpayers-lite'],
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
  })

  const { data: users } = useQuery({
    queryKey: ['users-lite'],
    queryFn: () => apiGet<Page<User>>('/users?size=1000'),
    enabled: can('USER_READ'),
  })

  const create = useMutation({
    mutationFn: () =>
      apiPost('/tax-controls', {
        taxpayerId: Number(taxpayerId),
        controlType,
        periodStart,
        periodEnd,
        reason,
        agentId: agentId ? Number(agentId) : null,
        documents: [],
      }),
    onSuccess: () => {
      toast.success('Contrôle fiscal créé')
      onClose()
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title="Nouveau contrôle fiscal" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <Field label="Contribuable">
          <Select value={taxpayerId} onChange={(e) => setTaxpayerId(e.target.value)} required>
            <option value="">— Sélectionner —</option>
            {loadingTaxpayers
              ? null
              : taxpayers?.content.map((t) => (
                  <option key={t.id} value={t.id}>{t.nif} — {t.name}</option>
                ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type de contrôle">
            <Select value={controlType} onChange={(e) => setControlType(e.target.value)}>
              {Object.entries(controlTypeLabels).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </Select>
          </Field>
          {can('USER_READ') && (
            <Field label="Agent responsable">
              <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">— Non assigné —</option>
                {users?.content.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Début de période contrôlée">
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </Field>
          <Field label="Fin de période contrôlée">
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </Field>
        </div>
        <Field label="Motif du contrôle">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={create.isPending || !taxpayerId || !periodStart || !periodEnd || !reason.trim()}>
            {create.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Détail ──────────────────────── */

export function ControlDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [nextStatus, setNextStatus] = useState('')
  const [observations, setObservations] = useState('')
  const [anomalies, setAnomalies] = useState('')
  const [redressement, setRedressement] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [closeRedressement, setCloseRedressement] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['control', id],
    queryFn: () => apiGet<TaxControlDetail>(`/tax-controls/${id}`),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['control', id] })
    queryClient.invalidateQueries({ queryKey: ['controls'] })
  }

  const update = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      if (nextStatus) body.status = nextStatus
      if (observations !== '') body.observations = observations
      if (anomalies !== '') body.anomalies = anomalies
      if (redressement !== '') body.redressement = Number(redressement)
      if (penaltyAmount !== '') body.penaltyAmount = Number(penaltyAmount)
      return apiPatch(`/tax-controls/${id}`, body)
    },
    onSuccess: () => {
      setNextStatus('')
      refresh()
      toast.success('Contrôle mis à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const closeWithRedressement = useMutation({
    mutationFn: () =>
      apiPatch(`/tax-controls/${id}/close?redressement=${encodeURIComponent(closeRedressement)}`),
    onSuccess: () => {
      setCloseRedressement('')
      refresh()
      toast.success('Contrôle clôturé avec redressement')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  if (isLoading || !data) {
    return (
      <Modal open onClose={onClose} title="Détail du contrôle fiscal" wide>
        <Spinner />
      </Modal>
    )
  }

  const c = data.control
  const transitions = allowedTransitions[c.status] ?? []
  const canUpdate = can('CONTROL_WRITE') && transitions.length > 0
  const canCloseWithRedressement =
    can('CONTROL_WRITE') && (c.status === 'ANOMALY_DETECTED' || c.status === 'IN_PROGRESS' || c.status === 'REDRESSEMENT')

  return (
    <Modal open onClose={onClose} title="Détail du contrôle fiscal" wide>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-brand-700">{c.reference}</span>
            <StatusBadge value={c.status} />
            <Badge tone="slate">{controlTypeLabels[c.controlType] ?? c.controlType}</Badge>
            {c.agentName && <Badge tone="blue">{c.agentName}</Badge>}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <strong>Période contrôlée :</strong> {fmtDate(c.periodStart)} → {fmtDate(c.periodEnd)}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
            <strong>Motif :</strong> {c.reason}
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            <Link to={`/taxpayers/${c.taxpayerId}`} className="text-brand-700 hover:underline">
              {c.taxpayerName} ({c.nif})
            </Link>
            {' · '}créé le {fmtDateTime(c.createdAt)}
          </p>
          {c.observations && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Observations : </span>
              {c.observations}
            </div>
          )}
          {c.anomalies && (
            <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <span className="font-semibold">Anomalies : </span>
              {c.anomalies}
            </div>
          )}
          {(c.redressement != null || c.penaltyAmount != null) && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {c.redressement != null && (
                <span className="font-medium text-amber-700">
                  Redressement : {fmtMGA(c.redressement)}
                </span>
              )}
              {c.penaltyAmount != null && (
                <span className="font-medium text-rose-700">
                  Pénalités : {fmtMGA(c.penaltyAmount)}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Documents demandés ({data.documents.length})
          </h4>
          {data.documents.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Aucun document enregistré.</p>
          ) : (
            <ul className="space-y-2">
              {data.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.title}</p>
                    {d.documentType && <p className="text-xs text-slate-400 dark:text-slate-500">{d.documentType}</p>}
                  </div>
                  <Badge tone={d.received ? 'green' : 'amber'}>
                    {d.received ? 'Reçu' : 'En attente'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canUpdate && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mettre à jour le contrôle
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nouveau statut">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {transitions.map((t) => (
                    <option key={t} value={t}>{controlStatusLabels[t] ?? t}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Observations">
                <Input value={observations} onChange={(e) => setObservations(e.target.value)} />
              </Field>
              <Field label="Anomalies constatées">
                <Input value={anomalies} onChange={(e) => setAnomalies(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Redressement (MGA)">
                <Input type="number" min="0" step="0.01" value={redressement} onChange={(e) => setRedressement(e.target.value)} />
              </Field>
              <Field label="Pénalités (MGA)">
                <Input type="number" min="0" step="0.01" value={penaltyAmount} onChange={(e) => setPenaltyAmount(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                onClick={() => update.mutate()}
                disabled={update.isPending || (!nextStatus && observations === '' && anomalies === '' && redressement === '' && penaltyAmount === '')}
              >
                Appliquer
              </Button>
            </div>
          </div>
        )}

        {canCloseWithRedressement && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              <Gavel className="h-4 w-4" /> Clôturer avec redressement
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-44 flex-1">
                <Field label="Montant du redressement (MGA)">
                  <Input type="number" min="0" step="0.01" value={closeRedressement} onChange={(e) => setCloseRedressement(e.target.value)} placeholder="ex : 250000" />
                </Field>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => closeWithRedressement.mutate()}
                disabled={closeWithRedressement.isPending || !closeRedressement || Number(closeRedressement) <= 0}
              >
                <PlusCircle className="h-4 w-4" /> Clôturer avec redressement
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
