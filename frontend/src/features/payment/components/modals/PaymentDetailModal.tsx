import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPut } from '../../../../lib/api'
import { fmtDate, fmtDateTime, fmtMGA } from '../../../../lib/format'
import type { Payment, PaymentAllocationDto } from '../../../../types'
import { Button, Field, Modal, StatusBadge } from '../../../../components/ui'
import { useToast } from '../../../../components/Toast'
import { useI18n } from '../../../../lib/i18n'
import { methodLabel } from '../../lib/methods'

const statusLabels: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmé', ALLOCATED: 'Alloué',
  PARTIALLY_ALLOCATED: 'Partiellement alloué', REJECTED: 'Rejeté',
  CANCELLED: 'Annulé', REFUNDED: 'Remboursé',
}

function statusLabel(status: string, t: (key: string) => string): string {
  const key = `payments.pstatus.${status}`
  const v = t(key)
  return v !== key ? v : (statusLabels[status] ?? status)
}

export { statusLabels }

export function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => apiPut(`/payments/${payment.id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      onClose()
      toast.success(t('payments.detail.cancelled'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const { data: fullPayment } = useQuery({
    queryKey: ['payment', payment.id],
    queryFn: () => apiGet<Payment>(`/payments/${payment.id}`),
    initialData: payment,
  })

  return (
    <Modal open onClose={onClose} title={`${t('payments.title')} ${fullPayment.reference}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge value={fullPayment.status} />
            <span className="text-xs text-slate-500">{statusLabel(fullPayment.status, t)}</span>
          </div>
          <p className="text-sm text-slate-500">{t('payments.detail.recordedByFull', { name: fullPayment.createdBy || '—', date: fmtDateTime(fullPayment.recordedAt) })}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">{t('payments.detail.paidAmount')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{fmtMGA(fullPayment.amount)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">{t('payments.detail.allocatedAmount')}</p>
          <p className="text-xl font-bold text-emerald-600">{fmtMGA(fullPayment.allocatedAmount)}</p>
        </div>
      </div>
      {fullPayment.unpaidAmount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:border-amber-700">
          {t('payments.detail.unallocated')} <strong>{fmtMGA(fullPayment.unpaidAmount)}</strong>
        </div>
      )}
      <dl className="divide-y divide-slate-100 dark:divide-slate-700/50 mb-4">
        <DetailRow label={t('payments.detail.reference')} value={fullPayment.reference} mono />
        <DetailRow label={t('payments.detail.taxpayer')} value={`${fullPayment.taxpayerName} (${fullPayment.nif})`} />
        <DetailRow label={t('payments.detail.nif')} value={fullPayment.nif} />
        {fullPayment.debtReference && <DetailRow label={t('payments.detail.debt')} value={fullPayment.debtReference} link={`/debts`} />}
        {fullPayment.declarationReference && <DetailRow label={t('payments.detail.declaration')} value={fullPayment.declarationReference} link={`/declarations`} />}
        <DetailRow label={t('payments.detail.payDate')} value={fmtDate(fullPayment.paymentDate)} />
        <DetailRow label={t('payments.detail.mode')} value={methodLabel(fullPayment.method, t)} />
        {fullPayment.transactionReference && <DetailRow label={t('payments.detail.txRef')} value={fullPayment.transactionReference} mono />}
        {fullPayment.observations && <DetailRow label={t('payments.detail.observations')} value={fullPayment.observations} />}
        <DetailRow label={t('payments.detail.receipt')} value={fullPayment.receiptReference ?? '—'} mono />
      </dl>
      {fullPayment.allocationDetails && fullPayment.allocationDetails.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('payments.detail.allocations')}</h4>
          <div className="space-y-2">
            {fullPayment.allocationDetails.map((alloc: PaymentAllocationDto) => (
              <div key={alloc.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between">
                  <div><span className="font-mono text-xs text-brand-700">{alloc.debtReference}</span><span className="ml-2 text-xs text-slate-500">({alloc.component})</span></div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(alloc.amount)}</span>
                </div>
                {alloc.comment && <p className="mt-1 text-xs text-slate-500">{alloc.comment}</p>}
                <p className="mt-1 text-xs text-slate-400">{t('payments.detail.allocatedByFull', { name: alloc.createdBy || '—', date: fmtDateTime(alloc.allocatedAt) })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {fullPayment.rejectionReason && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {t('payments.detail.rejectReason')} {fullPayment.rejectionReason}
        </div>
      )}
      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div>
          {fullPayment.status !== 'CANCELLED' && fullPayment.status !== 'REFUNDED' && (
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> {t('payments.actions.cancel')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {fullPayment.debtId && <Button variant="ghost" size="sm" onClick={onClose}>{t('payments.detail.viewDebt')}</Button>}
          <Button variant="secondary" onClick={onClose}>{t('payments.detail.close')}</Button>
        </div>
      </div>
      {cancelOpen && (
        <Modal open onClose={() => setCancelOpen(false)} title={t('payments.detail.cancelTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t('payments.title')} <strong>{fullPayment.reference}</strong> {t('payments.detail.cancelText')}</p>
            <Field label={t('payments.detail.cancelReason')}>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" rows={3} placeholder={t('payments.reasonPlaceholder')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelOpen(false)}>{t('payments.detail.back')}</Button>
              <Button variant="ghost" className="text-red-600" onClick={() => cancelMutation.mutate(cancelReason)} disabled={cancelMutation.isPending || !cancelReason.trim()}>
                {cancelMutation.isPending ? t('payments.detail.cancelling') : t('payments.detail.confirmCancel')}
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
        {link ? <span className="text-brand-700 hover:underline cursor-pointer">{value}</span> : value}
      </dd>
    </div>
  )
}
