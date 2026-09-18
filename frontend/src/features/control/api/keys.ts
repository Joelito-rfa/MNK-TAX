export const controlKeys = {
  all: ['tax-controls'] as const,
  list: (params: string) => ['tax-controls', 'list', params] as const,
  detail: (id: number) => ['tax-controls', 'detail', id] as const,
  taxpayers: ['taxpayers-lite'] as const,
  users: ['users-lite'] as const,
} as const
