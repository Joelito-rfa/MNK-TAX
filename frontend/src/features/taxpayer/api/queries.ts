import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Page, TaxCenter, TaxRegime, TaxpayerDetail, TaxpayerSummary } from '../../../types'
import { taxpayerKeys } from './keys'

/** Accès direct (exports CSV) partagé avec les hooks. */
export function fetchTaxpayers(params: string) {
  return apiGet<Page<TaxpayerSummary>>(`/taxpayers?${params}`)
}

export function useTaxpayers(params: string) {
  return useQuery({
    queryKey: taxpayerKeys.list(params),
    queryFn: () => fetchTaxpayers(params),
  })
}

export function useTaxpayerDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: taxpayerKeys.detail(id ?? 0),
    queryFn: () => apiGet<TaxpayerDetail>(`/taxpayers/${id}`),
    enabled: enabled && id !== null,
  })
}

export function useTaxCenters() {
  return useQuery({
    queryKey: taxpayerKeys.centers,
    queryFn: () => apiGet<TaxCenter[]>('/tax-centers'),
  })
}

export function useTaxRegimes() {
  return useQuery({
    queryKey: taxpayerKeys.regimes,
    queryFn: () => apiGet<TaxRegime[]>('/tax-regimes'),
  })
}

/** Référentiel allégé pour les sélecteurs (cache partagé via `taxpayers-lite`). */
export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: taxpayerKeys.lite,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
  })
}
