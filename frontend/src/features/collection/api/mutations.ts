import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import { invalidateCollectionData } from './keys'

function useInvalidateCollection() {
  const qc = useQueryClient()
  // Invalide tout le périmètre recouvrement (listes, stats, détail, historique,
  // échéanciers…) ainsi que dettes/paiements/dashboard : les plans sont
  // resynchronisés côté serveur lors d'un paiement (PaymentPlanService.syncFromPayments).
  return () => invalidateCollectionData(qc)
}

export type ReminderPayload = {
  debtId: number
  description: string
  actionDate: string
  outcome?: string
  nextAction?: string
  nextActionDate?: string
}

/**
 * Relance amiable (échelle fiscale) : enregistrée comme action REMINDER, tracée
 * au journal par le backend, sans changement de phase du dossier.
 */
export function useCreateReminder() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (payload: ReminderPayload) =>
      apiPost('/collection/actions', { ...payload, type: 'REMINDER' }),
    onSuccess: () => { invalidate(); toast.success(t('collection.reminderSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}

export function useRegisterPaymentForm() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (payload:{ debtId:number; amount:number; paymentDate:string; method:string }) => apiPost('/collection/payment', payload),
    onSuccess: () => { invalidate(); toast.success(t('collection.paymentSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}

export function useCancelPlanMutation() {
  const toast = useToast()
  const { t } = useI18n()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id:number; reason:string|null }) => apiPatch(`/collection/plans/${id}/cancel`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-plans'] }); qc.invalidateQueries({ queryKey: ['plan-stats'] }); toast.success(t('plans.cancelled')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}
