import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Assessment, Page, TaxType } from '../../../types'
import { assessmentKeys } from './keys'

export function useAssessments(params: string) {
  return useQuery({
    queryKey: assessmentKeys.list(params),
    queryFn: () => apiGet<Page<Assessment>>(`/assessments?${params}`),
  })
}

export function useAssessmentDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.detail(id ?? 0),
    queryFn: () => apiGet<Assessment>(`/assessments/${id}`),
    enabled: enabled && id !== null,
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: assessmentKeys.taxTypes,
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}
