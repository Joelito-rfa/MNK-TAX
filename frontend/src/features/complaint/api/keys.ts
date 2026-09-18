export const complaintKeys = {
  all: ['complaints'] as const,
  list: (params: string) => ['complaints', 'list', params] as const,
  stats: ['complaints', 'stats'] as const,
  detail: (id: number) => ['complaints', 'detail', id] as const,
  taxpayers: ['taxpayers-lite'] as const,
} as const
