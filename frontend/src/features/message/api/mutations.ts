import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiErrorCode, apiErrorMessageI18n, apiGetBlob, apiPost } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import type { Message, SendMessageRequest } from '../../../types'
import { messageKeys } from './keys'

/** Rafraîchit la messagerie : dossiers, compteurs de non-lus et statistiques. */
function useMailboxInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: messageKeys.all })
    queryClient.invalidateQueries({ queryKey: messageKeys.unread })
  }
}

export function useMarkMessageRead() {
  const invalidate = useMailboxInvalidation()
  return useMutation({
    mutationFn: (id: number) => apiPost<void>(`/messages/${id}/read`),
    onSuccess: invalidate,
  })
}

export function useMarkThreadRead() {
  const invalidate = useMailboxInvalidation()
  return useMutation({
    mutationFn: (id: number) => apiPost<void>(`/messages/${id}/thread-read`),
    onSuccess: invalidate,
  })
}

export function useMarkAllRead() {
  const { t } = useI18n()
  const toast = useToast()
  const invalidate = useMailboxInvalidation()
  return useMutation({
    mutationFn: () => apiPost<void>('/messages/read-all'),
    onSuccess: () => {
      invalidate()
      toast.success(t('messages.markedRead'))
    },
  })
}

/** Envoi d'un message ou d'une réponse dans une conversation. */
export function useSendMessage() {
  const { t } = useI18n()
  const toast = useToast()
  const invalidate = useMailboxInvalidation()
  return useMutation({
    mutationFn: (body: SendMessageRequest) => apiPost<Message>('/messages', body),
    onSuccess: (_data, body) => {
      invalidate()
      toast.success(body.replyToId ? t('messages.replySent') : t('messages.sent'))
    },
    onError: (err) => {
      // Erreur affichée par l'appelant si un code métier précis est attendu.
      if (!apiErrorCode(err)) toast.error(apiErrorMessageI18n(err, t))
    },
  })
}

function useMailboxAction(path: (id: number) => string, successKey: string) {
  const { t } = useI18n()
  const toast = useToast()
  const invalidate = useMailboxInvalidation()
  return useMutation({
    mutationFn: (id: number) => apiPost<void>(path(id)),
    onSuccess: () => {
      invalidate()
      toast.success(t(successKey))
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })
}

export function useArchiveMessage() {
  return useMailboxAction((id) => `/messages/${id}/archive`, 'messages.archived')
}

export function useUnarchiveMessage() {
  return useMailboxAction((id) => `/messages/${id}/unarchive`, 'messages.unarchived')
}

export function useCloseMessage() {
  return useMailboxAction((id) => `/messages/${id}/close`, 'messages.closed')
}

export function useReopenMessage() {
  return useMailboxAction((id) => `/messages/${id}/reopen`, 'messages.reopened')
}

/** Télécharge une pièce jointe (l'endpoint exige le jeton d'authentification). */
export function useDownloadMessageAttachment() {
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: async ({ id, fileName }: { id: number; fileName: string }) => {
      const blob = await apiGetBlob(`/messages/attachments/${id}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })
}
