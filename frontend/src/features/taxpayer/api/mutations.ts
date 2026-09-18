import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { taxpayerKeys } from './keys'

function useInvalidateTaxpayers() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: taxpayerKeys.all })
    qc.invalidateQueries({ queryKey: ['taxpayer-stats'] })
  }
}

/** Charge utile du formulaire de création (les champs vides sont omis). */
export interface CreateTaxpayerPayload {
  type: string
  name: string
  businessName?: string
  firstName?: string
  lastName?: string
  birthDate?: string
  legalRepresentative?: string
  registrationDate?: string
  phone?: string
  email?: string
  address?: string
  taxCenterId?: string
  taxRegimeId?: string
}

export function useCreateTaxpayer() {
  const toast = useToast()
  const invalidate = useInvalidateTaxpayers()
  return useMutation({
    mutationFn: (payload: CreateTaxpayerPayload) => {
      const body: Record<string, unknown> = { type: payload.type, name: payload.name }
      if (payload.businessName) body.businessName = payload.businessName
      if (payload.firstName) body.firstName = payload.firstName
      if (payload.lastName) body.lastName = payload.lastName
      if (payload.birthDate) body.birthDate = payload.birthDate
      if (payload.legalRepresentative) body.legalRepresentative = payload.legalRepresentative
      if (payload.registrationDate) body.registrationDate = payload.registrationDate
      if (payload.phone) body.phone = payload.phone
      if (payload.email) body.email = payload.email
      if (payload.address) body.address = payload.address
      if (payload.taxCenterId) body.taxCenterId = Number(payload.taxCenterId)
      if (payload.taxRegimeId) body.taxRegimeId = Number(payload.taxRegimeId)
      return apiPost('/taxpayers', body)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Contribuable créé avec succès')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useUpdateTaxpayerStatus() {
  const toast = useToast()
  const invalidate = useInvalidateTaxpayers()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiPatch(`/taxpayers/${id}/status?status=${status}`, {}),
    onSuccess: () => {
      invalidate()
      toast.success('Statut mis à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
