export const taxpayerKeys = {
  all: ['taxpayers'] as const,
  list: (params: string) => ['taxpayers', 'list', params] as const,
  detail: (id: number) => ['taxpayer-detail', id] as const,
  /** Référentiels partagés avec les autres modules (clés historiques conservées). */
  centers: ['tax-centers'] as const,
  regimes: ['tax-regimes'] as const,
  lite: ['taxpayers-lite'] as const,
} as const
