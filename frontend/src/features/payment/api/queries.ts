import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Page, Payment, PaymentStats, TaxDebt, TaxType } from '../../../types'
import { paymentKeys } from './keys'

export function usePayments(params: string) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => apiGet<Page<Payment>>(`/payments?${params}`),
  })
}

export function usePaymentStats() {
  return useQuery({
    queryKey: paymentKeys.stats,
    queryFn: () => apiGet<PaymentStats>('/payments/stats'),
  })
}

export function usePaymentDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? 0),
    queryFn: () => apiGet<Payment>(`/payments/${id}`),
    enabled: enabled && id !== null,
  })
}

export function useOpenDebts() {
  return useQuery({
    queryKey: paymentKeys.debts,
    queryFn: () => apiGet<Page<TaxDebt>>('/debts?size=200'),
    select: (d) => d.content.filter((x) => ['ISSUED', 'OVERDUE', 'IN_COLLECTION', 'PARTIALLY_PAID'].includes(x.status)),
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}
