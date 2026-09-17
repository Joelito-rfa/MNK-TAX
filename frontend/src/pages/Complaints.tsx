import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileQuestion, MoreHorizontal, Pencil, Trash2, Eye, CalendarClock } from 'lucide-react'
import { apiDelete, apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
import { fmtDateTime, fmtDate } from '../lib/format'
import type { Complaint, ComplaintDetail, Page, TaxpayerSummary } from '../types'
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

export const complaintContextLabels: Record<string, string> = {
  DECLARATION: 'Déclaration',
  DEBT: 'Créance',
  PAYMENT: 'Paiement',
  CONTROL: 'Contrôle fiscal',
  REFUND: 'Remboursement',
  GENERAL: 'Général',
}

const complaintStatusLabels: Record<string, string> = {
  OPEN: 'Ouverte',
  UNDER_REVIEW: 'En examen',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Rejetée',
  CLOSED: 'Clôturée',
}

const allowedTransitions: Record<string, string[]> = {
  OPEN: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'CLOSED'],
  ACCEPTED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
}

export default function Complaints() {
  const { can } = useAuth()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/complaints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Réclamation supprimée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (q) params.set('q', q)

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page, size, status, q],
    queryFn: () => apiGet<Page<Complaint>>(`/complaints?${params.toString()}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réclamations"
        subtitle="Réclamations des contribuables et suivi des décisions"
        actions={
          can('COMPLAINT_WRITE') && (
            <Button onClick={() => setCreateOpen(true)}>
              <FileQuestion className="h-4 w-4" /> Nouvelle réclamation
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); setPage(0) }}
            placeholder="Rechercher par référence, NIF, nom ou objet…"
            className="min-w-56 flex-1"
          />
          <div className="w-48">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              {Object.entries(complaintStatusLabels).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune réclamation" subtitle="Modifiez vos critères de recherche." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  <Th>Référence</Th>
                  <Th>Contribuable</Th>
                  <Th>Objet</Th>
                  <Th>Contexte</Th>
                  <Th>Statut</Th>
                  <Th>Créée le</Th>
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
                    <Td className="max-w-56 truncate">{c.subject}</Td>
                    <Td>
                      <Badge tone="slate">{complaintContextLabels[c.contextType] ?? c.contextType}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge value={c.status} />
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
                                 {c.status !== 'CLOSED' && (
                                   <>
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
                                     {c.status === 'OPEN' && (
                                       <>
                                         <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation()
                                             if (confirm('Supprimer cette réclamation ?')) remove.mutate(c.id)
                                             setActionMenu(null)
                                           }}
                                           className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                         >
                                           <Trash2 className="h-4 w-4 shrink-0" /> Supprimer
                                         </button>
                                       </>
                                     )}
                                   </>
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
              onPageSizeChange={(n) => { setSize(n); setPage(0) }}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      {createOpen && (
        <CreateComplaintModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['complaints'] })
          }}
        />
      )}
      {detailId != null && (
        <ComplaintDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: ['complaints'] })
          }}
        />
      )}
    </div>
  )
}

/* ──────────────────────── Création ──────────────────────── */

export function CreateComplaintModal({ onClose }: { onClose: () => void }) {
  const [taxpayerId, setTaxpayerId] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [contextType, setContextType] = useState('GENERAL')
  const [contextRef, setContextRef] = useState('')
  const toast = useToast()

  const { data: taxpayers, isLoading: loadingTaxpayers } = useQuery({
    queryKey: ['taxpayers-lite'],
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
  })

  const create = useMutation({
    mutationFn: () =>
      apiPost('/complaints', {
        taxpayerId: Number(taxpayerId),
        subject,
        description,
        contextType,
        contextRef: contextRef || null,
      }),
    onSuccess: () => {
      toast.success('Réclamation créée')
      onClose()
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title="Nouvelle réclamation" wide>
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
        <Field label="Objet">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
        </Field>
        <Field label="Description">
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contexte">
            <Select value={contextType} onChange={(e) => setContextType(e.target.value)}>
              {Object.entries(complaintContextLabels).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Référence du dossier (contexte)">
            <Input value={contextRef} onChange={(e) => setContextRef(e.target.value)} placeholder="ex : DEC-2026-001" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={create.isPending || !taxpayerId || !subject.trim() || !description.trim()}>
            {create.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Détail + réponses ──────────────────────── */

export function ComplaintDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [resolution, setResolution] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => apiGet<ComplaintDetail>(`/complaints/${id}`),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['complaint', id] })
    queryClient.invalidateQueries({ queryKey: ['complaints'] })
  }

  const addResponse = useMutation({
    mutationFn: () => apiPost(`/complaints/${id}/responses`, { content }),
    onSuccess: () => {
      setContent('')
      refresh()
      toast.success('Réponse ajoutée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const update = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { status: nextStatus }
      if (resolution.trim()) body.resolution = resolution.trim()
      return apiPatch(`/complaints/${id}`, body)
    },
    onSuccess: () => {
      setNextStatus('')
      setResolution('')
      refresh()
      toast.success('Réclamation mise à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const complaint = data?.complaint
  const transitions = complaint ? allowedTransitions[complaint.status] ?? [] : []
  const canUpdate = can('COMPLAINT_WRITE') && transitions.length > 0

  return (
    <Modal open onClose={onClose} title="Détail de la réclamation" wide>
      {isLoading || !complaint ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-brand-700">{complaint.reference}</span>
              <StatusBadge value={complaint.status} />
              <Badge tone="slate">{complaintContextLabels[complaint.contextType] ?? complaint.contextType}</Badge>
              {complaint.contextRef && <Badge tone="blue">{complaint.contextRef}</Badge>}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{complaint.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{complaint.description}</p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              <Link to={`/taxpayers/${complaint.taxpayerId}`} className="text-brand-700 hover:underline">
                {complaint.taxpayerName} ({complaint.nif})
              </Link>
              {' · '}créée le {fmtDateTime(complaint.createdAt)}
            </p>
            {complaint.resolution && (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span className="font-semibold">Décision : </span>
                {complaint.resolution}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Réponses ({data.responses.length})
            </h4>
            {data.responses.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Aucune réponse pour l'instant.</p>
            ) : (
              <ol className="space-y-2">
                {data.responses.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.authorName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{fmtDateTime(r.createdAt)}</p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{r.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {can('COMPLAINT_WRITE') && complaint.status !== 'CLOSED' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addResponse.mutate()
              }}
              className="space-y-2"
            >
              <Field label="Ajouter une réponse">
                <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} required />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={addResponse.isPending || !content.trim()}>
                  Répondre
                </Button>
              </div>
            </form>
          )}

          {canUpdate && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 p-4">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Changer le statut
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-44 flex-1">
                  <Field label="Nouveau statut">
                    <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {transitions.map((t) => (
                        <option key={t} value={t}>{complaintStatusLabels[t] ?? t}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="min-w-52 flex-[2]">
                  <Field label="Décision / résolution">
                    <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Motif de la décision" />
                  </Field>
                </div>
                <Button
                  onClick={() => update.mutate()}
                  disabled={update.isPending || !nextStatus}
                >
                  Appliquer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
