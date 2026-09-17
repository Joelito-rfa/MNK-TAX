import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { CollectionDebtRow, CollectionHistory, CollectionStats, OverdueSummary, Page, PaymentPlan, TaxType } from '../../../types'
import { collectionKeys, type CollectionStage } from './keys'

export function useCollectionDebts(stage: CollectionStage, params: string, enabled = true) {
  return useQuery({
    queryKey: collectionKeys.debts(stage, params),
    queryFn: () => apiGet<Page<CollectionDebtRow>>(`/collection/debts?${params}`),
    enabled,
  })
}

export function useCollectionStats() {
  return useQuery({ queryKey: collectionKeys.stats, queryFn: () => apiGet<CollectionStats>('/collection/stats') })
}

export function useOverdueSummary(params: string, enabled = true) {
  return useQuery({
    queryKey: collectionKeys.overdueSummary(params),
    queryFn: () => apiGet<OverdueSummary>(`/collection/overdue-summary?${params}`),
    enabled,
  })
}

export function useCollectionPeriods() {
  return useQuery({ queryKey: collectionKeys.periods, queryFn: () => apiGet<string[]>('/collection/periods') })
}

export function useTaxTypesRef() {
  return useQuery({ queryKey: collectionKeys.taxTypes, queryFn: () => apiGet<TaxType[]>('/tax-types') })
}

export function useCollectionHistory(debtId: number | null, open: boolean) {
  return useQuery({
    queryKey: collectionKeys.history(debtId),
    queryFn: () => apiGet<CollectionHistory>(`/collection/history/${debtId}`),
    enabled: open && debtId !== null,
  })
}

export function useActionDebts(enabled: boolean) {
  return useQuery({
    queryKey: collectionKeys.actionDebts,
    queryFn: () => apiGet<Page<CollectionDebtRow>>('/collection/debts?size=9999'),
    enabled,
  })
}

export function useCollectionPlans(params: string) {
  return useQuery({ queryKey: collectionKeys.plans(params), queryFn: () => apiGet<Page<PaymentPlan>>(`/collection/plans?${params}`) })
}

export function usePlanStats() {
  return useQuery({
    queryKey: collectionKeys.planStats,
    queryFn: () => apiGet<{ activePlans:number; completedPlans:number; cancelledPlans:number; overdueInstallments:number; plansWithOverdue:number }>('/collection/plans/stats'),
  })
}
