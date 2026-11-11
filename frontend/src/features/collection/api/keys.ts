import type { QueryClient } from '@tanstack/react-query'

export const collectionKeys = {
  all: ['collection'] as const,
  debts: (stage: string, params: string) => ['collection', 'debts', stage, params] as const,
  stats: ['collection', 'stats'] as const,
  overdueSummary: (params: string) => ['collection', 'overdue-summary', params] as const,
  periods: ['collection', 'periods'] as const,
  taxTypes: ['tax-types-ref'] as const,
  history: (debtId: number | null) => ['collection', 'history', debtId] as const,
  actionDebts: ['collection', 'action-debts'] as const,
  plans: (params: string) => ['collection', 'plans', params] as const,
  planStats: ['plan-stats'] as const,
} as const

export type CollectionStage = 'all' | 'overdue' | 'reminders' | 'notices'

/**
 * Invalide TOUTES les clés du périmètre recouvrement (+ dettes/paiements/dashboard).
 * `invalidateQueries` matche par préfixe : les formes plates
 * (`['collection-debts', params]`, `['debt', id]`…) sont donc couvertes aussi.
 */
export function invalidateCollectionData(qc: QueryClient): void {
  const keys = ['collection', 'collection-debts', 'collection-stats', 'collection-periods',
    'collection-history', 'collection-action-debts', 'collection-overdue-summary',
    'collection-detail', 'collection-plans', 'plan-stats',
    'debts', 'debt', 'debt-stats', 'debt-payments', 'payments', 'dashboard']
  for (const k of keys) qc.invalidateQueries({ queryKey: [k] })
}
