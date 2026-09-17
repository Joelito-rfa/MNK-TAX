import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiGet, apiGetBlob, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import { collectionKeys } from './keys'

function useInvalidateCollection() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['collection'] })
    qc.invalidateQueries({ queryKey: collectionKeys.stats })
    // Clés utilisées par les pages du module (elles ne sont pas préfixées par
    // 'collection' : sans ces invalidations, la relance enregistrée n'apparaît
    // pas dans la liste ni dans l'onglet « Relances »).
    qc.invalidateQueries({ queryKey: ['collection-debts'] })
    qc.invalidateQueries({ queryKey: ['collection-stats'] })
    qc.invalidateQueries({ queryKey: ['collection-detail'] })
    qc.invalidateQueries({ queryKey: ['collection-history'] })
    qc.invalidateQueries({ queryKey: ['collection-overdue-summary'] })
    qc.invalidateQueries({ queryKey: ['collection-action-debts'] })
    qc.invalidateQueries({ queryKey: ['debt-stats'] })
    qc.invalidateQueries({ queryKey: ['plan-stats'] })
  }
}

export function useCreateActionForm() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (payload: { debtId:number; type:string; description:string; actionDate:string; outcome?:string; nextAction?:string; nextActionDate?:string }) =>
      apiPost('/collection/actions', payload),
    onSuccess: () => { invalidate(); toast.success(t('collection.actionSaved')) },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
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

export function useCreateNoticeForm() {
  const toast = useToast()
  const { t } = useI18n()
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (payload:{ debtId:number; noticeType:string; content?:string }) => apiPost('/collection/notices', payload),
    onSuccess: () => { invalidate(); toast.success(t('collection.noticeIssued')) },
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id:number; reason:string|null }) => apiPatch(`/collection/plans/${id}/cancel`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-plans'] }); qc.invalidateQueries({ queryKey: ['plan-stats'] }); toast.success('Échéancier annulé') },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}

export async function exportCollectionCsv(params:string, toast:any, t:any) {
  try {
    const p = new URLSearchParams(params); p.delete('page'); p.delete('size')
    const rows = await apiGet<any>(`/collection/debts?${p.toString()}&size=9999`)
    const csv = ['Référence,NIF,Contribuable,Impôt,Période,Montant dû,Payé,Reste,Échéance,Jours de retard,Statut,Priorité', ...rows.content.map((d:any)=>[`"${d.reference}"`,d.nif,`"${d.taxpayerName}"`,d.taxTypeCode,d.period,d.totalAmount,d.paidAmount,d.balance,d.dueDate,d.daysOverdue,`"${d.debtStatus}"`,d.collectionPriority].join(','))].join('\n')
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`recouvrement_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url); toast.success(t('collection.exportDone'))
  } catch(err:any){ toast.error(apiErrorMessage(err)) }
}

export async function exportEtatPdf(params:URLSearchParams, toast:any) {
  try { const blob = await apiGetBlob(`/collection/documents/etat-restes?${params.toString()}`); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`etat-restes-a-recouvrer_${new Date().toISOString().slice(0,10)}.pdf`; a.click(); URL.revokeObjectURL(url); toast.success('PDF généré') } catch(err:any){ toast.error(apiErrorMessage(err)) }
}
