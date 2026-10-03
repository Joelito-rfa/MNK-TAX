import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { DebtStats, Page, TaxDebt, TaxType, TaxpayerSummary } from '../../../types'
import { debtKeys } from './keys'

/** Accès direct (exports CSV, préchargements) partagé avec les hooks. */
export function fetchDebts(params: string) {
  return apiGet<Page<TaxDebt>>(`/debts?${params}`)
}

export function useDebts(params: string) {
  return useQuery({
    queryKey: debtKeys.list(params),
    queryFn: () => fetchDebts(params),
  })
}

export function useDebtStats() {
  return useQuery({
    queryKey: debtKeys.stats,
    queryFn: () => apiGet<DebtStats>('/debts/stats'),
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: debtKeys.taxTypes,
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}

/** Référentiel contribuables pour le Select NIF (cache partagé via `taxpayers-lite`). */
export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: debtKeys.taxpayers,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
    staleTime: 60_000,
  })
}

/** Recherche incrémentale de contribuables (à partir de 2 caractères). */
export function useTaxpayerSearch(q: string) {
  return useQuery({
    queryKey: debtKeys.taxpayerSearch(q),
    queryFn: () => apiGet<Page<TaxpayerSummary>>(`/taxpayers?q=${encodeURIComponent(q)}&size=10`),
    enabled: q.length >= 2,
  })
}
