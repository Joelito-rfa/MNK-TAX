import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import {
  apiDelete,
  apiErrorMessage,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '../lib/api'
import { fmtDate, fmtNumber } from '../lib/format'
import type {
  Declaration,
  DeclarationHistoryEntry,
  DeclarationStatistics,
  Page,
  TaxType,
  TaxpayerDetail,
} from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  UNDER_REVIEW: 'En contrôle',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
  LIQUIDEE: 'Liquidée',
  PAYEE: 'Payée',
  A_CORRIGER: 'À corriger',
}

const statusToneMap: Record<string, string> = {
  DRAFT: 'slate',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'amber',
  VALIDATED: 'green',
  REJECTED: 'rose',
  CANCELLED: 'slate',
  LIQUIDEE: 'violet',
  PAYEE: 'emerald',
  A_CORRIGER: 'amber',
}

export default function Declarations() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [exerciceFilter, setExerciceFilter] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [detailId, setDetailId] = useState<number | null>(routeId ? Number(routeId) : null)
  const [createOpen, setCreateOpen] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ type: string; id: number } | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [correctionMotif, setCorrectionMotif] = useState('')
  const [validateComment, setValidateComment] = useState('')

  useEffect(() => {
    if (routeId) setDetailId(Number(routeId))
  }, [routeId])

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (statusFilter) params.set('status', statusFilter)
  if (taxTypeFilter) params.set('taxTypeCode', taxTypeFilter)
  if (periodFilter) params.set('period', periodFilter)
  if (exerciceFilter) params.set('exercice', exerciceFilter)
  params.set('page', String(page))
  params.set('size', String(size))
  params.set('sort', `${sortField},${sortDir}`)

  const { data, isLoading } = useQuery({
    queryKey: ['declarations', params.toString()],
    queryFn: () => apiGet<Page<Declaration>>(`/declarations?${params.toString()}`),
  })

  const { data: stats } = useQuery({
    queryKey: ['declarations', 'stats'],
    queryFn: () => apiGet<DeclarationStatistics>('/declarations/statistics'),
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const { data: detail } = useQuery({
    queryKey: ['declarations', detailId],
    queryFn: () => apiGet<Declaration>(`/declarations/${detailId}`),
    enabled: !!detailId,
  })

  const { data: history } = useQuery({
    queryKey: ['declarations', detailId, 'history'],
    queryFn: () => apiGet<DeclarationHistoryEntry[]>(`/declarations/${detailId}/history`),
    enabled: !!detailId,
  })

  const doAction = useMutation({
    mutationFn: async ({ id, op, body }: { id: number; op: string; body?: unknown }) => {
      if (op === 'delete') return apiDelete(`/declarations/${id}`)
      if (op === 'rectificative') return apiPost(`/declarations/${id}/rectificative`, body ?? {})
      return apiPut(`/declarations/${id}/${op}`, body ?? {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declarations'] })
      setConfirmModal(null)
      setDetailId(null)
      toast.success('Action effectuée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams(params)
      p.delete('page')
      p.delete('size')
      const rows = await apiGet<Page<Declaration>>(`/declarations?${p.toString()}&size=9999`)
      const csv = [
        'Référence,NIF,Contribuable,Impôt,Période,Assiette,Déclaré,Calculé,Statut',
        ...rows.content.map(
          (d) =>
            `${d.reference},${d.nif},"${d.taxpayerName}",${d.taxTypeCode},${d.period},${d.taxBase},${d.declaredAmount},${d.calculatedTax ?? ''},${statusLabels[d.status] ?? d.status}`
        ),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `declarations_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Export terminé'),
  })

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }

  function getActions(d: Declaration) {
    const actions: { label: string; icon: React.ReactNode; action: () => void; danger?: boolean }[] = []
    actions.push({ label: 'Voir', icon: <Eye className="h-3.5 w-3.5" />, action: () => { setDetailId(d.id); setActionMenu(null) } })
    if (d.status === 'DRAFT') {
      actions.push({ label: 'Modifier', icon: <Pencil className="h-3.5 w-3.5" />, action: () => { setDetailId(d.id); setActionMenu(null) } })
      actions.push({ label: 'Soumettre', icon: <Send className="h-3.5 w-3.5" />, action: () => { doAction.mutate({ id: d.id, op: 'submit' }); setActionMenu(null) } })
      actions.push({ label: 'Supprimer', icon: <Trash2 className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'cancel', id: d.id }); setActionMenu(null) }, danger: true })
    }
    if (d.status === 'SUBMITTED') {
      actions.push({ label: 'Contrôler', icon: <ShieldCheck className="h-3.5 w-3.5" />, action: () => { doAction.mutate({ id: d.id, op: 'review' }); setActionMenu(null) } })
      actions.push({ label: 'Rejeter', icon: <XCircle className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'reject', id: d.id }); setActionMenu(null) }, danger: true })
    }
    if (d.status === 'UNDER_REVIEW') {
      actions.push({ label: 'Valider', icon: <CheckCircle2 className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'validate', id: d.id }); setActionMenu(null) } })
      actions.push({ label: 'Rejeter', icon: <XCircle className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'reject', id: d.id }); setActionMenu(null) }, danger: true })
      actions.push({ label: 'Demander correction', icon: <AlertTriangle className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'correction', id: d.id }); setActionMenu(null) } })
    }
    if (['VALIDATED', 'LIQUIDEE', 'PAYEE'].includes(d.status)) {
      actions.push({ label: 'Rectificative', icon: <Copy className="h-3.5 w-3.5" />, action: () => { setConfirmModal({ type: 'rectificative', id: d.id }); setActionMenu(null) } })
    }
    if (d.status === 'A_CORRIGER') {
      actions.push({ label: 'Modifier', icon: <Pencil className="h-3.5 w-3.5" />, action: () => { setDetailId(d.id); setActionMenu(null) } })
    }
    return actions
  }

  if (routeId) {
    return <DetailPage id={Number(routeId)} onBack={() => navigate('/declarations')} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déclarations"
        subtitle="Suivi, contrôle et validation des déclarations fiscales"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['declarations'] })}>
              <RefreshCw className="h-4 w-4" /> Actualiser
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nouvelle déclaration
            </Button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Déclarations totales" value={stats?.total ?? '—'} icon={<FileText className="h-5 w-5" />} tone="brand" sub="enregistrées" />
        <StatCard label="À déclarer" value={stats?.aDeclarer ?? 0} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" sub="obligations" />
        <StatCard label="En brouillon" value={stats?.brouillons ?? 0} icon={<Clock className="h-5 w-5" />} tone="slate" sub="non soumises" />
        <StatCard label="En attente" value={stats?.enAttente ?? 0} icon={<Loader2 className="h-5 w-5" />} tone="sky" sub="de validation" />
        <StatCard label="Validées" value={stats?.validees ?? 0} icon={<BadgeCheck className="h-5 w-5" />} tone="green" sub="confirmées" />
        <StatCard label="Montant déclaré" value={stats?.montantDeclare ? fmtNumber(stats.montantDeclare) + ' MGA' : '—'} icon={<TrendingUp className="h-5 w-5" />} tone="violet" sub="total" />
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Rechercher (NIF, nom, référence)…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0) }}
            />
          </div>
          <Field label="Impôt">
            <Select value={taxTypeFilter} onChange={(e) => { setTaxTypeFilter(e.target.value); setPage(0) }}>
              <option value="">Tous</option>
              {taxTypes?.map((t) => (
                <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}>
              <option value="">Tous</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Période">
            <Input placeholder="2026-01" value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPage(0) }} className="w-28" />
          </Field>
          <Field label="Exercice">
            <Input placeholder="2026" value={exerciceFilter} onChange={(e) => { setExerciceFilter(e.target.value); setPage(0) }} className="w-24" />
          </Field>
          {(q || statusFilter || taxTypeFilter || periodFilter || exerciceFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(''); setStatusFilter(''); setTaxTypeFilter(''); setPeriodFilter(''); setExerciceFilter(''); setPage(0) }}>
              <X className="h-3.5 w-3.5" /> Effacer
            </Button>
          )}
        </div>
      </Card>

      {/* Tableau */}
      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune déclaration" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <thead className="border-b border-white/5 bg-white/[0.02]">
                  <tr>
                    {[
                      { key: 'reference', label: 'Référence' },
                      { key: 'nif', label: 'NIF' },
                      { key: 'taxpayerName', label: 'Contribuable' },
                      { key: 'taxTypeCode', label: 'Impôt' },
                      { key: 'period', label: 'Période' },
                      { key: 'taxBase', label: 'Assiette' },
                      { key: 'declaredAmount', label: 'Déclaré' },
                      { key: 'totalAPayer', label: 'Total' },
                      { key: 'status', label: 'Statut' },
                    ].map((col) => (
                      <Th key={col.key} className="cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </span>
                      </Th>
                    ))}
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.content.map((d) => (
                    <tr key={d.id} className="transition hover:bg-white/[0.02]">
                      <Td className="font-mono font-medium text-[#5B4BDB]">{d.reference}</Td>
                      <Td className="font-mono">{d.nif}</Td>
                      <Td className="max-w-48 truncate">{d.taxpayerName}</Td>
                      <Td>{d.taxTypeCode}</Td>
                      <Td>{d.period}</Td>
                      <Td className="text-right">{fmtNumber(d.taxBase)}</Td>
                      <Td className="text-right">{fmtNumber(d.declaredAmount)}</Td>
                      <Td className="text-right font-medium">{d.totalAPayer ? fmtNumber(d.totalAPayer) : '—'}</Td>
                      <Td>
                        <Badge tone={statusToneMap[d.status] as any}>{statusLabels[d.status] ?? d.status}</Badge>
                      </Td>
                      <Td>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenu(actionMenu === d.id ? null : d.id)}
                            className="rounded-lg p-1.5 transition hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === d.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                              <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#151821] shadow-xl">
                                {getActions(d).map((a, i) => (
                                  <button
                                    key={i}
                                    onClick={a.action}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-white/5 ${a.danger ? 'text-[#F87171]' : 'text-slate-300'}`}
                                  >
                                    {a.icon} {a.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="text-xs text-slate-500">
                {data.totalElements} résultat(s) — page {data.number + 1}/{data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} className="w-20 text-xs">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
                <Button size="sm" variant="ghost" disabled={data.first} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={data.last} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal création */}
      {createOpen && <CreateDeclarationModal onClose={() => setCreateOpen(false)} taxTypes={taxTypes ?? []} />}

      {/* Confirm modals */}
      {confirmModal && (
        <ConfirmActionModal
          type={confirmModal.type}
          onConfirm={() => {
            if (confirmModal.type === 'validate') {
              doAction.mutate({ id: confirmModal.id, op: 'validate', body: { comment: validateComment } })
            } else if (confirmModal.type === 'reject') {
              doAction.mutate({ id: confirmModal.id, op: 'reject', body: { motif: rejectMotif } })
            } else if (confirmModal.type === 'correction') {
              doAction.mutate({ id: confirmModal.id, op: 'correction', body: { motif: correctionMotif } })
            } else if (confirmModal.type === 'cancel') {
              doAction.mutate({ id: confirmModal.id, op: 'cancel' })
            } else if (confirmModal.type === 'rectificative') {
              doAction.mutate({ id: confirmModal.id, op: 'rectificative', body: {} })
            }
          }}
          onClose={() => setConfirmModal(null)}
          motif={confirmModal.type === 'reject' ? rejectMotif : correctionMotif}
          setMotif={confirmModal.type === 'reject' ? setRejectMotif : setCorrectionMotif}
          comment={validateComment}
          setComment={setValidateComment}
        />
      )}
    </div>
  )
}

/* ──────────────────────────── Detail Page ──────────────────────────── */

function DetailPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['declarations', id],
    queryFn: () => apiGet<Declaration>(`/declarations/${id}`),
    enabled: !!id,
  })
  const { data: history } = useQuery({
    queryKey: ['declarations', id, 'history'],
    queryFn: () => apiGet<DeclarationHistoryEntry[]>(`/declarations/${id}/history`),
    enabled: !!id,
  })
  const [tab, setTab] = useState<'info' | 'calcul' | 'annexes' | 'historique'>('info')

  if (isLoading) return <Card className="p-8"><Spinner /></Card>
  if (!detail) return <Card className="p-8"><EmptyState title="Déclaration introuvable" /></Card>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4" /> Retour</Button>
        <div>
          <h1 className="text-lg font-bold text-white">{detail.reference}</h1>
          <p className="text-sm text-slate-400">{detail.taxTypeName} — {detail.nif} — {detail.taxpayerName}</p>
        </div>
        <div className="ml-auto">
          <Badge tone={statusToneMap[detail.status] as any}>{statusLabels[detail.status]}</Badge>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {(['info', 'calcul', 'annexes', 'historique'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition ${tab === t ? 'border-b-2 border-[#5B4BDB] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t === 'info' ? 'Informations' : t === 'calcul' ? 'Calcul fiscal' : t === 'annexes' ? `Annexes (${detail.annexes.length})` : `Historique (${detail.historyCount})`}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Informations générales</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Référence" value={detail.reference} />
              <Row label="NIF" value={detail.nif} />
              <Row label="Contribuable" value={detail.taxpayerName} />
              <Row label="Impôt" value={`${detail.taxTypeCode} — ${detail.taxTypeName}`} />
              <Row label="Période" value={detail.period} />
              <Row label="Exercice" value={detail.exercice ?? '—'} />
              <Row label="Régime" value={detail.regime ?? '—'} />
              <Row label="Centre fiscal" value={detail.taxCenterName ?? '—'} />
              {detail.rectificative && <Row label="Rectificative" value={`Oui (origine: ${detail.declarationOrigineId})`} />}
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Situation financière</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Assiette" value={fmtNumber(detail.taxBase) + ' MGA'} />
              <Row label="Montant déclaré" value={fmtNumber(detail.declaredAmount) + ' MGA'} />
              <Row label="Taux" value={detail.taux ? detail.taux + '%' : '—'} />
              <Row label="Impôt calculé" value={detail.calculatedTax ? fmtNumber(detail.calculatedTax) + ' MGA' : '—'} />
              <Row label="Pénalités" value={detail.penalites ? fmtNumber(detail.penalites) + ' MGA' : '0 MGA'} />
              <Row label="Total à payer" value={detail.totalAPayer ? fmtNumber(detail.totalAPayer) + ' MGA' : '—'} />
              <Row label="Montant payé" value={detail.montantPaye ? fmtNumber(detail.montantPaye) + ' MGA' : '0 MGA'} />
              <Row label="Reste à payer" value={detail.resteAPayer ? fmtNumber(detail.resteAPayer) + ' MGA' : '—'} />
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Dates</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Créée le" value={fmtDate(detail.createdAt)} />
              <Row label="Soumise le" value={detail.submissionDate ? fmtDate(detail.submissionDate) : '—'} />
              <Row label="Validée le" value={detail.validatedAt ? fmtDate(detail.validatedAt) : '—'} />
              <Row label="Échéance" value={detail.dateEcheance ? fmtDate(detail.dateEcheance) : '—'} />
              {detail.motifCorrection && <Row label="Motif correction" value={detail.motifCorrection} />}
            </dl>
          </Card>
          {detail.lines.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Lignes</h3>
              <Table>
                <thead><tr><Th>#</Th><Th>Libellé</Th><Th className="text-right">Montant</Th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {detail.lines.map((l) => (
                    <tr key={l.id}><Td>{l.lineNumber}</Td><Td>{l.label}</Td><Td className="text-right">{fmtNumber(l.amount)}</Td></tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {tab === 'calcul' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Calcul fiscal</h3>
          <div className="space-y-4">
            <CalcRow label="Base imposable" value={fmtNumber(detail.taxBase) + ' MGA'} />
            <CalcRow label="Taux appliqué" value={detail.taux ? detail.taux + '%' : '—'} />
            <CalcRow label="Impôt calculé" value={detail.calculatedTax ? fmtNumber(detail.calculatedTax) + ' MGA' : '—'} highlight />
            <CalcRow label="Pénalités" value={detail.penalites ? fmtNumber(detail.penalites) + ' MGA' : '0 MGA'} />
            <CalcRow label="Total à payer" value={detail.totalAPayer ? fmtNumber(detail.totalAPayer) + ' MGA' : '—'} highlight />
            <CalcRow label="Montant payé" value={detail.montantPaye ? fmtNumber(detail.montantPaye) + ' MGA' : '0 MGA'} />
            <CalcRow label="Reste à payer" value={detail.resteAPayer ? fmtNumber(detail.resteAPayer) + ' MGA' : '—'} warn={!!detail.resteAPayer && detail.resteAPayer > 0} />
          </div>
        </Card>
      )}

      {tab === 'annexes' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Pièces et annexes</h3>
          {detail.annexes.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune annexe pour cette déclaration.</p>
          ) : (
            <Table>
              <thead><tr><Th>Nom</Th><Th>Type</Th><Th>Taille</Th><Th>Ajouté par</Th><Th>Date</Th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {detail.annexes.map((a) => (
                  <tr key={a.id}>
                    <Td>{a.nom}</Td><Td>{a.typeMime}</Td><Td>{a.taille ? (a.taille / 1024).toFixed(1) + ' KB' : '—'}</Td><Td>{a.uploadedBy}</Td><Td>{fmtDate(a.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'historique' && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Historique</h3>
          {!history || history.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun historique.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#5B4BDB]" />
                  <div>
                    <p className="text-sm text-white">
                      <span className="font-medium">{h.action}</span>
                      {h.ancienStatut && h.nouveauStatut && (
                        <span className="text-slate-400"> — {statusLabels[h.ancienStatut] ?? h.ancienStatut} → {statusLabels[h.nouveauStatut] ?? h.nouveauStatut}</span>
                      )}
                    </p>
                    {h.commentaire && <p className="mt-0.5 text-xs text-slate-400">{h.commentaire}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-500">{h.username ?? '—'} • {fmtDate(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/* ──────────────────────────── Create Modal ──────────────────────────── */

function CreateDeclarationModal({ onClose, taxTypes }: { onClose: () => void; taxTypes: TaxType[] }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [nif, setNif] = useState('')
  const [taxpayer, setTaxpayer] = useState<TaxpayerDetail | null>(null)
  const [nifError, setNifError] = useState('')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [exercice, setExercice] = useState(new Date().getFullYear().toString())
  const [regime, setRegime] = useState('')
  const [taxBase, setTaxBase] = useState('')
  const [declaredAmount, setDeclaredAmount] = useState('')
  const [taux, setTaux] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [lines, setLines] = useState<{ label: string; amount: string }[]>([{ label: '', amount: '' }])

  const searchMutation = useMutation({
    mutationFn: () => apiGet<TaxpayerDetail>(`/taxpayers/nif/${nif}`),
    onSuccess: (data) => { setTaxpayer(data); setNifError(''); setStep(2) },
    onError: () => { setTaxpayer(null); setNifError('Contribuable introuvable avec ce NIF.') },
  })

  const createMutation = useMutation({
    mutationFn: () => apiPost('/declarations', {
      taxpayerId: taxpayer!.id,
      taxTypeCode,
      period,
      exercice,
      regime: regime || undefined,
      taxBase: Number(taxBase),
      declaredAmount: declaredAmount ? Number(declaredAmount) : undefined,
      taux: taux ? Number(taux) : undefined,
      dateEcheance: dateEcheance || undefined,
      lines: lines.filter((l) => l.label).map((l, i) => ({ lineNumber: i + 1, label: l.label, amount: Number(l.amount) || 0 })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['declarations'] }); toast.success('Déclaration créée'); onClose() },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title={`Étape ${step}/4 — Nouvelle déclaration`}>
      {step === 1 && (
        <div className="space-y-4">
          <Field label="NIF du contribuable">
            <div className="flex gap-2">
              <Input placeholder="10 chiffres" value={nif} onChange={(e) => setNif(e.target.value)} maxLength={10} />
              <Button onClick={() => nif.length === 10 && searchMutation.mutate()} disabled={nif.length !== 10 || searchMutation.isPending}>
                {searchMutation.isPending ? 'Recherche…' : 'Chercher'}
              </Button>
            </div>
          </Field>
          {nifError && <p className="text-sm text-[#F87171]">{nifError}</p>}
        </div>
      )}
      {step === 2 && taxpayer && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
            <p className="font-medium text-white">{taxpayer.name}</p>
            <p className="text-slate-400">NIF: {taxpayer.nif} — Type: {taxpayer.type}</p>
          </div>
          <Field label="Type d'impôt">
            <Select value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)}>
              <option value="">Sélectionner</option>
              {taxTypes.filter((t) => t.active).map((t) => (
                <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Période (ex: 2026-01)"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-01" /></Field>
            <Field label="Exercice"><Input value={exercice} onChange={(e) => setExercice(e.target.value)} placeholder="2026" /></Field>
          </div>
          <Field label="Régime (optionnel)"><Input value={regime} onChange={(e) => setRegime(e.target.value)} placeholder="ex: RNE" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
            <Button onClick={() => { if (taxTypeCode && period) setStep(3) }} disabled={!taxTypeCode || !period}>Suivant</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base imposable (MGA)"><Input type="number" value={taxBase} onChange={(e) => setTaxBase(e.target.value)} /></Field>
            <Field label="Taux (%)"><Input type="number" step="0.01" value={taux} onChange={(e) => setTaux(e.target.value)} /></Field>
          </div>
          <Field label="Montant déclaré (MGA)"><Input type="number" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} /></Field>
          <Field label="Date d'échéance"><Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} /></Field>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Lignes de détail</p>
            {lines.map((l, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Input placeholder="Libellé" value={l.label} onChange={(e) => { const n = [...lines]; n[i].label = e.target.value; setLines(n) }} className="flex-1" />
                <Input type="number" placeholder="Montant" value={l.amount} onChange={(e) => { const n = [...lines]; n[i].amount = e.target.value; setLines(n) }} className="w-32" />
                {lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-[#F87171]"><X className="h-4 w-4" /></button>}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setLines([...lines, { label: '', amount: '' }])}>+ Ajouter une ligne</Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>Retour</Button>
            <Button onClick={() => setStep(4)}>Suivant</Button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white">Récapitulatif</h4>
          <div className="rounded-xl bg-white/[0.03] p-4 text-sm space-y-2">
            <p><span className="text-slate-400">Contribuable :</span> <span className="text-white">{taxpayer?.name} ({taxpayer?.nif})</span></p>
            <p><span className="text-slate-400">Impôt :</span> <span className="text-white">{taxTypeCode}</span></p>
            <p><span className="text-slate-400">Période :</span> <span className="text-white">{period}</span></p>
            <p><span className="text-slate-400">Exercice :</span> <span className="text-white">{exercice}</span></p>
            <p><span className="text-slate-400">Base imposable :</span> <span className="text-white">{fmtNumber(Number(taxBase))} MGA</span></p>
            {taux && <p><span className="text-slate-400">Taux :</span> <span className="text-white">{taux}%</span></p>}
            {declaredAmount && <p><span className="text-slate-400">Déclaré :</span> <span className="text-white">{fmtNumber(Number(declaredAmount))} MGA</span></p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(3)}>Retour</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer la déclaration'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ──────────────────────────── Confirm Modal ──────────────────────────── */

function ConfirmActionModal({ type, onConfirm, onClose, motif, setMotif, comment, setComment }: {
  type: string; onConfirm: () => void; onClose: () => void;
  motif: string; setMotif: (v: string) => void;
  comment: string; setComment: (v: string) => void;
}) {
  const titles: Record<string, string> = {
    validate: 'Valider la déclaration', reject: 'Rejeter la déclaration',
    correction: 'Demander une correction', cancel: 'Annuler la déclaration',
    rectificative: 'Créer une déclaration rectificative',
  }
  return (
    <Modal open onClose={onClose} title={titles[type] ?? type}>
      <div className="space-y-4">
        {type === 'validate' && (
          <Field label="Commentaire (optionnel)"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire de validation" /></Field>
        )}
        {(type === 'reject' || type === 'correction') && (
          <Field label="Motif *"><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif obligatoire" /></Field>
        )}
        {type === 'cancel' && <p className="text-sm text-slate-400">Êtes-vous sûr de vouloir annuler cette déclaration ?</p>}
        {type === 'rectificative' && <p className="text-sm text-slate-400">Une nouvelle déclaration rectificative sera créée basée sur cette déclaration.</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            onClick={onConfirm}
            disabled={(type === 'reject' || type === 'correction') && !motif}
            variant={type === 'reject' ? 'danger' : 'primary'}
          >
            Confirmer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ──────────────────────────── Shared ──────────────────────────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-white">{value}</dd>
    </div>
  )
}

function CalcRow({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${highlight ? 'border-[#5B4BDB]/30 bg-[#5B4BDB]/10' : warn ? 'border-[#F5C451]/30 bg-[#F5C451]/10' : 'border-white/5 bg-white/[0.02]'}`}>
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#5B4BDB]' : warn ? 'text-[#F5C451]' : 'text-white'}`}>{value}</span>
    </div>
  )
}
