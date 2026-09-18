export const obligationKeys = {
  all: ['obligations'] as const,
  byTaxpayer: (taxpayerId: number) => ['obligations', 'taxpayer', taxpayerId] as const,
  taxTypes: ['tax-types-ref'] as const,
} as const
