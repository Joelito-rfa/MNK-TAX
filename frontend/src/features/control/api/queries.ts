import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Page, TaxControl, TaxControlDetail, TaxpayerSummary, User } from '../../../types'
import { controlKeys } from './keys'

export function useTaxControls(params: string) {
  return useQuery({
    queryKey: controlKeys.list(params),
    queryFn: () => apiGet<Page<TaxControl>>(`/tax-controls?${params}`),
  })
}

export function useTaxControlDetail(id: number | null) {
  return useQuery({
    queryKey: controlKeys.detail(id ?? 0),
    queryFn: () => apiGet<TaxControlDetail>(`/tax-controls/${id}`),
    enabled: id !== null,
  })
}

/** Référentiel contribuables (cache partagé via `taxpayers-lite`). */
export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: controlKeys.taxpayers,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
  })
}

/** Référentiel utilisateurs (cache partagé via `users-lite`). */
export function useUsersRef(enabled = true) {
  return useQuery({
    queryKey: controlKeys.users,
    queryFn: () => apiGet<Page<User>>('/users?size=1000'),
    enabled,
  })
}
