import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiGetBlob, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import type { Receipt } from '../../../types'
import { receiptKeys } from './keys'

function useInvalidateReceipts() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: receiptKeys.all })
}

/** Téléchargement du PDF officiel d'une quittance. */
export function useDownloadReceipt() {
  const toast = useToast()
  return useMutation({
    mutationFn: async (receipt: Receipt) => {
      const blob = await apiGetBlob(`/receipts/${receipt.id}/pdf`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quittance-${receipt.receiptNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('PDF téléchargé'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useCancelReceipt() {
  const toast = useToast()
  const invalidate = useInvalidateReceipts()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPut(`/receipts/${id}/cancel`, { reason }),
    onSuccess: () => {
      invalidate()
      toast.success('Quittance annulée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useReplaceReceipt() {
  const toast = useToast()
  const invalidate = useInvalidateReceipts()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost(`/receipts/${id}/replace`, { reason }),
    onSuccess: () => {
      invalidate()
      toast.success('Quittance remplacée — nouvelle quittance créée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useRefundReceipt() {
  const toast = useToast()
  const invalidate = useInvalidateReceipts()
  return useMutation({
    mutationFn: ({ id, refundReference }: { id: number; refundReference?: string }) =>
      apiPut(`/receipts/${id}/refund`, { refundReference: refundReference ?? null }),
    onSuccess: () => {
      invalidate()
      toast.success('Quittance marquée comme remboursée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
