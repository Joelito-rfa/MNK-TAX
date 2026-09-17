import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, MoreHorizontal } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import type { Notification, Page } from '../types'
import { Avatar } from '../components/Avatar'
import { Badge, Card, EmptyState, PageHeader, Pagination, Spinner, Table, Td, Th } from '../components/ui'

const typeLabels: Record<string, string> = {
  DEADLINE: 'Échéance',
  PAYMENT_CONFIRMED: 'Paiement confirmé',
  RECEIPT_ISSUED: 'Quittance émise',
  DEBT_OVERDUE: 'Créance en retard',
  COLLECTION_ACTION: 'Action de recouvrement',
  SYSTEM: 'Système',
}

export default function Notifications() {
  const { user, avatarUrl } = useAuth()
  const [page, setPage] = useState(0)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => apiGet<Page<Notification>>(`/notifications?page=${page}&size=20`),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alertes, échéances et événements du système"
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune notification" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  <Th>Type</Th>
                  <Th>Titre</Th>
                  <Th>Message</Th>
                  <Th>Date</Th>
                  <Th>Statut</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
{data.content.map((n) => (
                    <tr
                      key={n.id}
                      className={`transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50 ${n.read ? 'opacity-60' : ''} cursor-pointer`}
                      onClick={() => {
                        if (!n.read) markRead.mutate(n.id)
                      }}
                    >
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar
                          name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
                          src={avatarUrl}
                          className="shrink-0"
                        />
                        <Badge tone={n.read ? 'slate' : 'indigo'}>{typeLabels[n.type] ?? n.type}</Badge>
                      </span>
                    </Td>
                    <Td className="font-medium">{n.title}</Td>
                    <Td className="max-w-80 truncate text-sm text-slate-600 dark:text-slate-400">{n.message || '—'}</Td>
                    <Td>{fmtDateTime(n.createdAt)}</Td>
                    <Td>{n.read ? 'Lu' : <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" />}</Td>
                    <Td>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionMenu(actionMenu === n.id ? null : n.id)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === n.id && (
                          <>
                            <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 top-full z-40 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                              <div className="space-y-0.5">
                                {!n.read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); setActionMenu(null) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <CheckCheck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Marquer comme lu
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
