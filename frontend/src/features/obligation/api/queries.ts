import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { Obligation } from '../../../types'
import { obligationKeys } from './keys'

export function useObligations(taxpayerId: number | null, enabled = true) {
  return useQuery({
    queryKey: obligationKeys.byTaxpayer(taxpayerId ?? 0),
    queryFn: () => apiGet<Obligation[]>(`/obligations?taxpayerId=${taxpayerId}`),
    enabled: enabled && taxpayerId !== null,
  })
}
