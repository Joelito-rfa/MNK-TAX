import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Complaint, ComplaintDetail, ComplaintStats, Page, TaxpayerSummary } from '../../../types'
import { complaintKeys } from './keys'

export function useComplaints(params: string) {
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => apiGet<Page<Complaint>>(`/complaints?${params}`),
  })
}

export function useComplaintStats() {
  return useQuery({
    queryKey: complaintKeys.stats,
    queryFn: () => apiGet<ComplaintStats>('/complaints/stats'),
  })
}

export function useComplaintDetail(id: number | null) {
  return useQuery({
    queryKey: complaintKeys.detail(id ?? 0),
    queryFn: () => apiGet<ComplaintDetail>(`/complaints/${id}`),
    enabled: id !== null,
  })
}

export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: complaintKeys.taxpayers,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
  })
}
