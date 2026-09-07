import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban, Download, Eye, Filter,
  Link2, MoreHorizontal, RefreshCw, Search, Shield, X,

} from 'lucide-react'
import { apiErrorMessage, apiGet, apiGetBlob, apiPost, apiPut } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { fmtDate, fmtMGA } from '../lib/format'
import type { Page, Receipt, TaxType } from '../types'
import {
  Button, Card, EmptyState, Modal, PageHeader, Pagination,
  Select, Spinner, StatusBadge, Table, Td, Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
}

const statusLabels: Record<string, string> = {
  GENERATED: 'Générée',
  ISSUED: 'Émise',
  VALID: 'Valide',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  REPLACED: 'Remplacée',
  VOID: 'Annulée',
}

export default function Receipts() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(25)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [taxType, setTaxType] = useState('')
  const [method, setMethod] = useState('')
const [showFilters, setShowFilters] = useState(false)
  const [detail, setDetail] = useState<Receipt | null>(null)
  const [sortField, setSortField] = useState('issuedAt')
  const [sortDir, setSortDir] = useState('desc')
  const [_cancelOpen, setCancelOpen] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const toast = useToast()

  const params = new URLSearchParams({ page: String(page), size: String(size), sort: `${sortField},${sortDir}` })
  if (status) params.set('status', status)
  if (taxType) params.set('taxTypeCode', taxType)
  if (method) params.set('method', method)
  if (q) params.set('q', q)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page, size, status, taxType, method, q, sortField, sortDir],
    queryFn: () => apiGet<Page<Receipt>>(`/receipts?${params.toString()}`),
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const downloadPdf = async (r: Receipt) => {
    try {
      const blob = await apiGetBlob(`/receipts/${r.id}/pdf`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quittance-${r.receiptNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PDF téléchargé')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const resetFilters = () => {
    setStatus('')
    setTaxType('')
    setMethod('')
    setQ('')
    setPage(0)
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }

  const exportCsv = useMutation({
    mutationFn: async () => {
      const p = new URLSearchParams({ size: '9999' })
      if (status) p.set('status', status)
      if (taxType) p.set('taxTypeCode', taxType)
      if (method) p.set('method', method)
      if (q) p.set('q', q)
      const rows = await apiGet<Page<Receipt>>(`/receipts?${p.toString()}`)
      downloadCsv(
        `quittances_${new Date().toISOString().slice(0, 10)}.csv`,
        ['N°', 'Référence', 'Contribuable', 'NIF', 'Impôt', 'Période', 'Montant', 'Mode', 'Statut', 'Émise le'],
        rows.content.map((r) => [
          r.receiptNumber, r.reference, r.taxpayerName, r.nif, r.taxTypeCode,
          r.period, r.amount, methodLabels[r.method] ?? r.method,
          statusLabels[r.status] ?? r.status, r.issuedAt,
        ]),
      )
    },
    onSuccess: () => toast.success('Export terminé'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 text-slate-300 dark:text-slate-600">↕</span>
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quittances"
        subtitle="Registre sécurisé des quittances fiscales — traçables et vérifiables"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
          </div>
        }
      />

      <Card>
        {/* ── Barre de recherche et filtres ── */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0) }}
              placeholder="Rechercher (n°, réf., NIF, nom, réf. paiement…)"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filtres
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Statut</label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                <option value="">Toutes</option>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Impôt</label>
              <Select value={taxType} onChange={(e) => { setTaxType(e.target.value); setPage(0) }}>
                <option value="">Tous</option>
                {taxTypes?.map((tt) => (
                  <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label className="text-xs text-slate-500 mb-1 block">Mode de paiement</label>
              <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0) }}>
                <option value="">Tous</option>
                {Object.entries(methodLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="w-24">
              <label className="text-xs text-slate-500 mb-1 block">Taille</label>
              <Select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4" /> Réinitialiser
            </Button>
          </div>
        )}

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title="Aucune quittance"
            subtitle="Les quittances sont émises automatiquement après un paiement confirmé et alloué."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                  <tr>
                    <Th onClick={() => toggleSort('receiptNumber')} className="cursor-pointer">
                      N° <SortIcon field="receiptNumber" />
                    </Th>
                    <Th onClick={() => toggleSort('reference')} className="cursor-pointer">
                      Référence <SortIcon field="reference" />
                    </Th>
                    <Th onClick={() => toggleSort('taxpayerName')} className="cursor-pointer">
                      Contribuable <SortIcon field="taxpayerName" />
                    </Th>
                    <Th>NIF</Th>
                    <Th onClick={() => toggleSort('taxTypeCode')} className="cursor-pointer">
                      Impôt <SortIcon field="taxTypeCode" />
                    </Th>
                    <Th>Période</Th>
                    <Th onClick={() => toggleSort('amount')} className="cursor-pointer">
                      Montant <SortIcon field="amount" />
                    </Th>
                    <Th>Mode</Th>
                    <Th onClick={() => toggleSort('issuedAt')} className="cursor-pointer">
                      Émise le <SortIcon field="issuedAt" />
                    </Th>
                    <Th onClick={() => toggleSort('status')} className="cursor-pointer">
                      Statut <SortIcon field="status" />
                    </Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {data.content.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                      <Td className="font-mono text-xs">{r.receiptNumber}</Td>
                      <Td className="font-mono text-brand-700 text-xs">{r.reference}</Td>
                      <Td className="max-w-44 truncate">
                        <button onClick={() => setDetail(r)} className="font-medium text-slate-900 dark:text-slate-100 hover:text-brand-700 hover:underline">{r.taxpayerName}</button>
                      </Td>
                      <Td className="text-xs text-slate-500">{r.nif}</Td>
                      <Td>{r.taxTypeCode}</Td>
                      <Td>{r.period}</Td>
                      <Td className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(r.amount)}</Td>
                      <Td className="text-xs">{methodLabels[r.method] ?? r.method}</Td>
                      <Td>{fmtDate(r.issuedAt)}</Td>
                      <Td>
                        <StatusBadge value={r.status} />
                      </Td>
                      <Td>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenu(actionMenu === r.id ? null : r.id)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === r.id && (
                            <>
                              <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                              <div className="absolute right-0 top-full z-40 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                                <div className="space-y-0.5">
                                  <button
                                    onClick={() => { setDetail(r); setActionMenu(null) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                                  </button>
                                  <button
                                    onClick={() => { downloadPdf(r); setActionMenu(null) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                                  >
                                    <Download className="h-4 w-4 shrink-0" /> Télécharger PDF
                                  </button>
                                  <a
                                    href={`/verify/receipt/${r.verificationToken}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setActionMenu(null)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Link2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Vérification publique
                                  </a>
                                  {r.status === 'ISSUED' || r.status === 'VALID' ? (
                                    <button
                                      onClick={() => { setCancelOpen(true); setActionMenu(null) }}
                                      className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                    >
                                      <Ban className="h-4 w-4 shrink-0" /> Annuler la quittance
                                    </button>
                                  ) : null}
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
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-sm text-slate-500">
                {data.totalElements} résultat{data.totalElements !== 1 ? 's' : ''}
              </span>
              <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} pageSize={size} onPageSizeChange={(n) => { setSize(n); setPage(0) }} totalElements={data.totalElements} />
            </div>
          </>
        )}
      </Card>

      {detail && <ReceiptDetailModal receipt={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

/* ──────────────────── Détail quittance ──────────────────── */

function ReceiptDetailModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(false)

  const { data: full } = useQuery({
    queryKey: ['receipt', receipt.id],
    queryFn: () => apiGet<Receipt>(`/receipts/${receipt.id}`),
    initialData: receipt,
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => apiPut(`/receipts/${receipt.id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] })
      onClose()
      toast.success('Quittance annulée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const replaceMutation = useMutation({
    mutationFn: () => apiPost(`/receipts/${receipt.id}/replace`, { reason: 'Remplacement demandé' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] })
      onClose()
      toast.success('Quittance remplacée — nouvelle quittance créée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const canCancel = !['CANCELLED', 'VOID', 'REFUNDED', 'REPLACED'].includes(full.status)
  const canReplace = !['CANCELLED', 'VOID', 'REPLACED'].includes(full.status)

  return (
    <Modal open onClose={onClose} title={`Quittance ${full.receiptNumber}`} wide>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge value={full.status} />
            <span className="text-xs text-slate-500">{statusLabels[full.status] ?? full.status}</span>
          </div>
          <p className="font-mono text-sm text-brand-700">{full.reference}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const blob = await apiGetBlob(`/receipts/${full.id}/pdf`)
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `quittance-${full.receiptNumber}.pdf`
                link.click()
                URL.revokeObjectURL(url)
              } catch (err) {
                toast.error(apiErrorMessage(err))
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-brand-400"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger PDF
          </button>
          {full.verificationToken && (
            <a
              href={`/verify/receipt/${full.verificationToken}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            >
              <Shield className="h-3.5 w-3.5" /> Vérifier
            </a>
          )}
        </div>
      </div>

      {/* Montant */}
      <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
        <p className="text-xs text-slate-500 mb-1">Montant payé</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtMGA(full.amount)} {full.currency || 'MGA'}</p>
      </div>

      {/* Informations contribuable */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Contribuable</h4>
      <dl className="mb-4 divide-y divide-slate-100 dark:divide-slate-700/50">
        <DetailRow label="Nom" value={full.taxpayerName} />
        <DetailRow label="NIF" value={full.nif} mono />
        {full.centerCode && <DetailRow label="Centre fiscal" value={full.centerCode} />}
      </dl>

      {/* Informations impôt */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Impôt</h4>
      <dl className="mb-4 divide-y divide-slate-100 dark:divide-slate-700/50">
        <DetailRow label="Type" value={full.taxTypeCode} />
        <DetailRow label="Période" value={full.period} />
      </dl>

      {/* Informations paiement */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Paiement</h4>
      <dl className="mb-4 divide-y divide-slate-100 dark:divide-slate-700/50">
        {full.paymentReference && <DetailRow label="Réf. paiement" value={full.paymentReference} mono link="/payments" />}
        <DetailRow label="Date" value={fmtDate(full.paymentDate ?? full.issuedAt)} />
        <DetailRow label="Mode" value={methodLabels[full.method] ?? full.method} />
        {full.transactionReference && <DetailRow label="Réf. transaction" value={full.transactionReference} mono />}
        {full.debtReference && <DetailRow label="Créance" value={full.debtReference} mono link="/debts" />}
        {full.declarationReference && <DetailRow label="Déclaration" value={full.declarationReference} mono link="/declarations" />}
      </dl>

      {/* Métadonnées */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Métadonnées</h4>
      <dl className="mb-4 divide-y divide-slate-100 dark:divide-slate-700/50">
        <DetailRow label="Émise le" value={fmtDate(full.issuedAt)} />
        <DetailRow label="Émise par" value={full.createdBy ?? '—'} />
        {full.verifiedAt && <DetailRow label="Vérifiée le" value={fmtDate(full.verifiedAt)} />}
        {full.downloadCount > 0 && <DetailRow label="Téléchargements" value={String(full.downloadCount)} />}
        {full.replacedByReference && <DetailRow label="Remplacée par" value={full.replacedByReference} mono />}
        {full.refundReference && <DetailRow label="Réf. remboursement" value={full.refundReference} mono />}
        {full.cancelledReason && <DetailRow label="Motif annulation" value={full.cancelledReason} />}
        {full.cancelledBy && <DetailRow label="Annulée par" value={full.cancelledBy} />}
      </dl>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex gap-2">
          {canCancel && (
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> Annuler
            </Button>
          )}
          {canReplace && (
            <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700" onClick={() => setReplaceOpen(true)}>
              <RefreshCw className="h-4 w-4" /> Remplacer
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>

      {/* Modal annulation */}
      {cancelOpen && (
        <Modal open onClose={() => setCancelOpen(false)} title="Annuler la quittance">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              La quittance <strong>{full.reference}</strong> sera annulée.
              Cette opération est irréversible.
            </p>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">Motif de l'annulation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                rows={3}
                placeholder="Motif obligatoire..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelOpen(false)}>Retour</Button>
              <Button
                variant="ghost"
                className="text-red-600"
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
              >
                {cancelMutation.isPending ? 'Annulation…' : "Confirmer l'annulation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal remplacement */}
      {replaceOpen && (
        <Modal open onClose={() => setReplaceOpen(false)} title="Remplacer la quittance">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Une nouvelle quittance sera créée pour le même paiement.
              L'ancienne quittance <strong>{full.reference}</strong> sera marquée comme <strong>REMPLACÉE</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReplaceOpen(false)}>Annuler</Button>
              <Button
                variant="ghost"
                className="text-amber-600"
                onClick={() => replaceMutation.mutate()}
                disabled={replaceMutation.isPending}
              >
                {replaceMutation.isPending ? 'Remplacement…' : 'Confirmer le remplacement'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

function DetailRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>
        {link ? (
          <span className="text-brand-700 hover:underline cursor-pointer">{value}</span>
        ) : value}
      </dd>
    </div>
  )
}
