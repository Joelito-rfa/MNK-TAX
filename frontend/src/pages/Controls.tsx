import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, FileSearch, Gavel, PlusCircle } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost } from '../lib/api'
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
  const queryClient = useQueryClient()

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
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
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

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun contrôle fiscal" subtitle="Modifiez vos critères de recherche." />
        ) : (
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
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(c.id)}>
                        Voir <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
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
