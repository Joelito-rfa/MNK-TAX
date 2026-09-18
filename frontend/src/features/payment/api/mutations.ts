import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiGet, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import type { Page, Payment } from '../../../types'
import { paymentKeys } from './keys'

function useInvalidatePayments() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: paymentKeys.all })
    qc.invalidateQueries({ queryKey: paymentKeys.stats })
  }
}

export function useCreatePayment() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (payload: {
      debtId: number; amount: number; paymentDate: string; method: string
      transactionReference?: string; observations?: string
    }) => apiPost('/payments', payload),
    onSuccess: () => { invalidate(); toast.success(t('payments.created')) },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useConfirmPayment() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (id: number) => apiPut(`/payments/${id}/confirm`, {}),
    onSuccess: () => { invalidate(); toast.success(t('payments.confirmed')) },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useCancelPayment() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiPut(`/payments/${id}/cancel`, { reason }),
    onSuccess: () => { invalidate(); toast.success(t('payments.detail.cancelled')) },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

/** Allocation automatique du paiement sur les créances ouvertes les plus anciennes. */
export function useAllocatePayment() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (id: number) => apiPut(`/payments/${id}/allocate`, {}),
    onSuccess: () => {
      invalidate()
      toast.success(t('payments.allocated'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useExportPayments() {
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: async (params: string) => {
      const rows = await apiGet<Page<Payment>>(`/payments?${params}&size=9999`)
      const csv = [
        [t('payments.table.reference'), 'NIF', t('payments.table.taxpayer'), t('payments.table.date'), t('payments.table.amount'), t('payments.table.mode'), t('payments.table.allocated'), t('payments.table.remaining'), t('payments.table.status'), t('payments.table.receipt')],
        ...rows.content.map((x: Payment) => [x.reference, x.nif, x.taxpayerName, x.paymentDate, x.amount, x.method, x.allocatedAmount, x.unpaidAmount, x.status, x.receiptReference ?? '']),
      ].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paiements_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('toast.exportDone'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
