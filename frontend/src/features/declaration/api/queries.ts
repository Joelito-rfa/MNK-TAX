import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type {
  CalendarEntry,
  Declaration,
  DeclarationHistoryEntry,
  DeclarationStatistics,
  Page,
  TaxType,
  TaxpayerSummary,
} from '../../../types'
import { declarationKeys } from './keys'

/** Accès direct (exports CSV) partagé avec les hooks. */
export function fetchDeclarations(params: string) {
  return apiGet<Page<Declaration>>(`/declarations?${params}`)
}

export function useDeclarations(params: string) {
  return useQuery({
    queryKey: declarationKeys.list(params),
    queryFn: () => fetchDeclarations(params),
  })
}

export function useDeclarationStats() {
  return useQuery({
    queryKey: declarationKeys.stats,
    queryFn: () => apiGet<DeclarationStatistics>('/declarations/statistics'),
  })
}

export function useTaxTypesRef() {
  return useQuery({
    queryKey: declarationKeys.taxTypes,
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
}

export function useDeclarationDetail(id: number | null) {
  return useQuery({
    queryKey: declarationKeys.detail(id ?? 0),
    queryFn: () => apiGet<Declaration>(`/declarations/${id}`),
    enabled: id !== null,
  })
}

export function useDeclarationHistory(id: number | null, enabled = true) {
  return useQuery({
    queryKey: declarationKeys.history(id ?? 0),
    queryFn: () => apiGet<DeclarationHistoryEntry[]>(`/declarations/${id}/history`),
    enabled: enabled && id !== null,
  })
}

/** Calendrier annuel des échéances de déclaration (`GET /declarations/calendar`). */
export function useDeclarationCalendar(year: number) {
  return useQuery({
    queryKey: declarationKeys.calendar(year),
    queryFn: () => apiGet<CalendarEntry[]>(`/declarations/calendar?year=${year}`),
  })
}

/** Référentiel contribuables (cache partagé via `taxpayers-lite`). */
export function useTaxpayersRef(enabled = true) {
  return useQuery({
    queryKey: declarationKeys.taxpayers,
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=1000'),
    enabled,
  })
}
