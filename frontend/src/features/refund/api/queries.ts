import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Page, Refund, RefundStats, TaxpayerSummary } from '../../../types'
import { refundKeys } from './keys'

export function useRefunds(params: string) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => apiGet<Page<Refund>>(`/refunds?${params}`),
  })
}

export function useRefundStats() {
  return useQuery({
    queryKey: refundKeys.stats,
    queryFn: () => apiGet<RefundStats>('/refunds/stats'),
  })
}

export function useRefundDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: refundKeys.detail(id ?? 0),
    queryFn: () => apiGet<Refund>(`/refunds/${id}`),
    enabled: enabled && id !== null,
  })
}

/** Référentiel contribuables (cache partagé avec les autres pages via `taxpayers-lite`). */
export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: refundKeys.taxpayers,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
  })
}
