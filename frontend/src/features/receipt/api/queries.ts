import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Page, Receipt, ReceiptStats, TaxType } from '../../../types'
import { receiptKeys } from './keys'

export function useReceipts(params: string) {
  return useQuery({
    queryKey: receiptKeys.list(params),
    queryFn: () => apiGet<Page<Receipt>>(`/receipts?${params}`),
  })
}

export function useReceiptStats() {
  return useQuery({
    queryKey: receiptKeys.stats,
    queryFn: () => apiGet<ReceiptStats>('/receipts/stats'),
  })
}

export function useReceiptDetail(id: number | null, initialData?: Receipt) {
  return useQuery({
    queryKey: receiptKeys.detail(id ?? 0),
    queryFn: () => apiGet<Receipt>(`/receipts/${id}`),
    enabled: id !== null,
    initialData,
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: receiptKeys.taxTypes,
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}
