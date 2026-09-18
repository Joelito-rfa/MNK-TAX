export const receiptKeys = {
  all: ['receipts'] as const,
  list: (params: string) => ['receipts', 'list', params] as const,
  stats: ['receipts', 'stats'] as const,
  detail: (id: number) => ['receipts', 'detail', id] as const,
  taxTypes: ['tax-types-ref'] as const,
} as const
