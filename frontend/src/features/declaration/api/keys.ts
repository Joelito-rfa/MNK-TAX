export const declarationKeys = {
  all: ['declarations'] as const,
  list: (params: string) => ['declarations', 'list', params] as const,
  stats: ['declarations', 'statistics'] as const,
  taxTypes: ['tax-types-ref'] as const,
  detail: (id: number) => ['declarations', 'detail', id] as const,
  history: (id: number) => ['declarations', 'history', id] as const,
  calendar: (year: number) => ['declarations', 'calendar', year] as const,
  taxpayers: ['taxpayers-lite'] as const,
} as const
