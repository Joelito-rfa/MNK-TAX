import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
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

export function useRejectPayment() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiPut(`/payments/${id}/reject`, { reason }),
    onSuccess: () => { invalidate(); toast.success(t('payments.detail.rejected')) },
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

