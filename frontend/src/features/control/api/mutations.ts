import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiErrorMessage, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { controlKeys } from './keys'

function useInvalidateControls() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: controlKeys.all })
}

export interface CreateTaxControlPayload {
  taxpayerId: number
  controlType: string
  periodStart: string
  periodEnd: string
  reason: string
  agentId?: number | null
  documents?: string[]
}

export function useCreateTaxControl() {
  const toast = useToast()
  const invalidate = useInvalidateControls()
  return useMutation({
    mutationFn: (payload: CreateTaxControlPayload) => apiPost('/tax-controls', payload),
    onSuccess: () => {
      invalidate()
      toast.success('Contrôle fiscal créé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useUpdateTaxControl() {
  const toast = useToast()
  const invalidate = useInvalidateControls()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiPatch(`/tax-controls/${id}`, body),
    onSuccess: () => {
      invalidate()
      toast.success('Contrôle mis à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useCloseTaxControl() {
  const toast = useToast()
  const invalidate = useInvalidateControls()
  return useMutation({
    mutationFn: ({ id, redressement }: { id: number; redressement: string }) =>
      apiPatch(`/tax-controls/${id}/close?redressement=${encodeURIComponent(redressement)}`),
    onSuccess: () => {
      invalidate()
      toast.success('Contrôle clôturé avec redressement')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useDeleteTaxControl() {
  const toast = useToast()
  const invalidate = useInvalidateControls()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/tax-controls/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Contrôle fiscal supprimé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
