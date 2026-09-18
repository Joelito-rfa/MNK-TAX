import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import type { MarkOverdueResult } from '../../../types'
import { debtKeys } from './keys'

function useInvalidateDebts() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: debtKeys.all })
    qc.invalidateQueries({ queryKey: debtKeys.stats })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export interface CreateDebtPayload {
  taxpayerId: string | number
  principal: string | number
  taxTypeCode?: string
  period?: string
  observations?: string
  priority?: string
}

export function useCreateDebt() {
  const toast = useToast()
  const invalidate = useInvalidateDebts()
  return useMutation({
    mutationFn: (payload: CreateDebtPayload) => {
      const body: Record<string, unknown> = {
        taxpayerId: Number(payload.taxpayerId),
        principal: Number(payload.principal),
      }
      if (payload.taxTypeCode) body.taxTypeCode = payload.taxTypeCode
      if (payload.period) body.period = payload.period
      if (payload.observations) body.observations = payload.observations
      if (payload.priority) body.priority = payload.priority
      return apiPost('/debts', body)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Créance créée avec succès')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

/** Détection manuelle des créances en retard (filtres courants repris en query string). */
export function useMarkOverdue() {
  const toast = useToast()
  const invalidate = useInvalidateDebts()
  return useMutation({
    mutationFn: (filters: { taxTypeCode?: string; period?: string; q?: string } = {}) => {
      const p = new URLSearchParams()
      if (filters.taxTypeCode) p.set('taxTypeCode', filters.taxTypeCode)
      if (filters.period) p.set('period', filters.period)
      if (filters.q) p.set('q', filters.q)
      return apiPost<MarkOverdueResult>(`/debts/mark-overdue?${p.toString()}`)
    },
    onSuccess: (result) => {
      invalidate()
      if (result.updated > 0) {
        toast.success(`${result.updated} créance(s) mise(s) en retard`)
      } else {
        toast.info('Aucune créance en retard détectée')
      }
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useSuspendDebt() {
  const toast = useToast()
  const invalidate = useInvalidateDebts()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiPatch(`/debts/${id}/suspend`, reason ? { reason } : {}),
    onSuccess: () => {
      invalidate()
      toast.success('Créance suspendue')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useResumeDebt() {
  const toast = useToast()
  const invalidate = useInvalidateDebts()
  return useMutation({
    mutationFn: (id: number) => apiPatch(`/debts/${id}/resume`),
    onSuccess: () => {
      invalidate()
      toast.success('Créance réactivée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useCloseDebt() {
  const toast = useToast()
  const invalidate = useInvalidateDebts()
  return useMutation({
    mutationFn: (id: number) => apiPatch(`/debts/${id}/close`),
    onSuccess: () => {
      invalidate()
      toast.success('Créance clôturée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
