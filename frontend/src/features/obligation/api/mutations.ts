import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiErrorMessage, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import type { CreateObligationRequest, Obligation } from '../../../types'
import { obligationKeys } from './keys'

function useInvalidateObligations() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: obligationKeys.all })
}

export function useCreateObligation() {
  const toast = useToast()
  const invalidate = useInvalidateObligations()
  return useMutation({
    mutationFn: (payload: CreateObligationRequest) => apiPost<Obligation>('/obligations', payload),
    onSuccess: () => {
      invalidate()
      toast.success('Obligation créée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useUpdateObligation() {
  const toast = useToast()
  const invalidate = useInvalidateObligations()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiPut<Obligation>(`/obligations/${id}`, body),
    onSuccess: () => {
      invalidate()
      toast.success('Obligation mise à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useDeleteObligation() {
  const toast = useToast()
  const invalidate = useInvalidateObligations()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/obligations/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Obligation supprimée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

/**
 * Auto-génération automatique des obligations à partir du régime fiscal déclaré
 * du contribuable (`POST /obligations/generate`).
 */
export function useGenerateObligations() {
  const toast = useToast()
  const invalidate = useInvalidateObligations()
  return useMutation({
    mutationFn: ({ taxpayerId, regimeId }: { taxpayerId: number; regimeId: number }) =>
      apiPost<Obligation[]>(`/obligations/generate?taxpayerId=${taxpayerId}&regimeId=${regimeId}`, {}),
    onSuccess: (created) => {
      invalidate()
      toast.success(`${created.length} obligation(s) générée(s) automatiquement`)
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
