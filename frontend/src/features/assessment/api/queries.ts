import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../lib/api'
import type { Assessment, AssessmentHistory, AssessmentStats, Page, TaxType } from '../../../types'
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

export function useAssessmentHistory(id: number | null) {
  return useQuery({
    queryKey: [...assessmentKeys.detail(id ?? 0), 'history'],
    queryFn: () => apiGet<AssessmentHistory[]>(`/assessments/${id}/history`),
    enabled: id !== null,
  })
}

export function useAssessmentStats() {
  return useQuery({
    queryKey: [...assessmentKeys.all, 'stats'],
    queryFn: () => apiGet<AssessmentStats>('/assessments/stats'),
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: assessmentKeys.taxTypes,
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: assessmentKeys.all })
  }
}

export function useSimulate() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<{ base: number; rate: number; grossTax: number; exemption: number; deduction: number; netTax: number; ruleCode: string; ruleVersion: number }>('/assessments/simulate', body),
  })
}

export function useCreateOffice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Assessment>('/assessments/office', body),
    onSuccess: () => invalidate(),
  })
}

export function useAdjustAssessment(id: number | null) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Assessment>(`/assessments/${id}/adjust`, body),
    onSuccess: () => invalidate(),
  })
}

export function useNotifyAssessment(id: number | null) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => apiPost<Assessment>(`/assessments/${id}/notify`, {}),
    onSuccess: () => invalidate(),
  })
}

export function useCancelAssessment(id: number | null) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Assessment>(`/assessments/${id}/cancel`, body),
    onSuccess: () => invalidate(),
  })
}
