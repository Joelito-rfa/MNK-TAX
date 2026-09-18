export const messageKeys = {
  all: ['messages'] as const,
  list: (folder: string, params: string) => ['messages', folder, params] as const,
  stats: ['messages', 'stats'] as const,
  unread: ['messages', 'unread'] as const,
  detail: (id: number) => ['messages', 'detail', id] as const,
  thread: (id: number) => ['messages', 'thread', id] as const,
  commStats: ['comm-stats'] as const,
} as const

export type MessageFolder = 'inbox' | 'sent' | 'archived'
