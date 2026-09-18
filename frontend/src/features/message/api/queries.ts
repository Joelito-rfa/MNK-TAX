import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../lib/api'
import type { CommStats, Message, MessageStats, Page } from '../../../types'
import { messageKeys, type MessageFolder } from './keys'

const folderPath: Record<MessageFolder, string> = {
  inbox: '/messages',
  sent: '/messages/sent',
  archived: '/messages/archived',
}

/**
 * Liste d'un dossier de la messagerie interne.
 * À noter : `/messages/archived` n'accepte que la pagination côté backend.
 */
export function useMessageFolder(folder: MessageFolder, params: string) {
  return useQuery({
    queryKey: messageKeys.list(folder, params),
    queryFn: () => apiGet<Page<Message>>(`${folderPath[folder]}?${params}`),
  })
}

export function useMessageStats() {
  return useQuery({
    queryKey: messageKeys.stats,
    queryFn: () => apiGet<MessageStats>('/messages/stats'),
  })
}

/** Conversation complète (thread) d'un message. */
export function useMessageThread(id: number | null, enabled = true) {
  return useQuery({
    queryKey: messageKeys.thread(id ?? 0),
    queryFn: () => apiGet<Message[]>(`/messages/${id}/thread`),
    enabled: enabled && id !== null,
  })
}

/** Statistiques du centre de communication multicanal. */
export function useCommStats(enabled = true) {
  return useQuery({
    queryKey: messageKeys.commStats,
    queryFn: () => apiGet<CommStats>('/communication/stats'),
    enabled,
    refetchInterval: 60_000,
  })
}
