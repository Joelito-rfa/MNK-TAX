import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiErrorMessage, apiPatch, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import type { ComplaintContextType } from '../../../types'
import { complaintKeys } from './keys'

function useInvalidateComplaints() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: complaintKeys.all })
    qc.invalidateQueries({ queryKey: complaintKeys.stats })
  }
}

export interface CreateComplaintPayload {
  taxpayerId: number
  subject: string
  description: string
  contextType: ComplaintContextType
  contextRef?: string | null
}

export function useCreateComplaint() {
  const toast = useToast()
  const invalidate = useInvalidateComplaints()
  return useMutation({
    mutationFn: (payload: CreateComplaintPayload) => apiPost('/complaints', payload),
    onSuccess: () => {
      invalidate()
      toast.success('Réclamation créée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useUpdateComplaint() {
  const toast = useToast()
  const invalidate = useInvalidateComplaints()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiPatch(`/complaints/${id}`, body),
    onSuccess: () => {
      invalidate()
      toast.success('Réclamation mise à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useDeleteComplaint() {
  const toast = useToast()
  const invalidate = useInvalidateComplaints()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/complaints/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Réclamation supprimée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}

export function useAddComplaintResponse() {
  const toast = useToast()
  const invalidate = useInvalidateComplaints()
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      apiPost(`/complaints/${id}/responses`, { content }),
    onSuccess: () => {
      invalidate()
      toast.success('Réponse ajoutée')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })
}
