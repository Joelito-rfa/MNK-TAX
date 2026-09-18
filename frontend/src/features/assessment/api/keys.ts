export const assessmentKeys = {
  all: ['assessments'] as const,
  list: (params: string) => ['assessments', 'list', params] as const,
  detail: (id: number) => ['assessments', 'detail', id] as const,
  taxTypes: ['tax-types-ref'] as const,
} as const
