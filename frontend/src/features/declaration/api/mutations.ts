import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiErrorMessage, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { declarationKeys } from './keys'

function useInvalidateDeclarations() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: declarationKeys.all })
    qc.invalidateQueries({ queryKey: declarationKeys.stats })
  }
}

/**
 * Actions du cycle de vie d'une déclaration :
 * `submit`, `review`, `validate`, `reject`, `correction`, `cancel`, `rectificative`, `delete`.
 */
export function useDeclarationAction() {
  const toast = useToast()
  const invalidate = useInvalidateDeclarations()
  return useMutation({
    mutationFn: async ({ id, op, body }: { id: number; op: string; body?: unknown }) => {
      if (op === 'delete') return apiDelete(`/declarations/${id}`)
      if (op === 'rectificative') return apiPost(`/declarations/${id}/rectificative`, body ?? {})
      return apiPut(`/declarations/${id}/${op}`, body ?? {})
    },
    onSuccess: () => {
      invalidate()
      toast.success('Action effectuée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useCreateDeclaration() {
  const toast = useToast()
  const invalidate = useInvalidateDeclarations()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost('/declarations', payload),
    onSuccess: () => {
      invalidate()
      toast.success('Déclaration créée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useUpdateDeclaration() {
  const toast = useToast()
  const invalidate = useInvalidateDeclarations()
  return useMutation({
    mutationFn: ({ id, isCorrection, body }: { id: number; isCorrection: boolean; body: Record<string, unknown> }) =>
      apiPut(`/declarations/${id}${isCorrection ? '/correct' : ''}`, body),
    onSuccess: (_data, variables) => {
      invalidate()
      toast.success(variables.isCorrection ? 'Correction appliquée' : 'Déclaration modifiée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
