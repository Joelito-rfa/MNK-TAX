export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: string) => ['payments', 'list', params] as const,
  stats: ['payments', 'stats'] as const,
  detail: (id: number) => ['payments', 'detail', id] as const,
  debts: ['payments', 'debts'] as const,
} as const
