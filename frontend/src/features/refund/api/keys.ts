export const refundKeys = {
  all: ['refunds'] as const,
  list: (params: string) => ['refunds', 'list', params] as const,
  stats: ['refunds', 'stats'] as const,
  detail: (id: number) => ['refund', id] as const,
  taxpayers: ['taxpayers-lite'] as const,
} as const
