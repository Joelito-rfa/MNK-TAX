export const debtKeys = {
  all: ['debts'] as const,
  list: (params: string) => ['debts', 'list', params] as const,
  stats: ['debts', 'stats'] as const,
  taxTypes: ['tax-types-ref'] as const,
  taxpayerSearch: (q: string) => ['taxpayer-search', q] as const,
} as const
