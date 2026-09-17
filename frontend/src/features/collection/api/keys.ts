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
