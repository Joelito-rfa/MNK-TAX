import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import type { Notification, Page } from '../types'
import { Avatar } from '../components/Avatar'
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Spinner, Table, Td, Th } from '../components/ui'
import { useToast } from '../components/Toast'

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
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => apiGet<Page<Notification>>(`/notifications?page=${page}&size=20`),
  })

  const markAll = useMutation({
    mutationFn: () => apiPost('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications marquées comme lues')
    },
  })


  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alertes, échéances et événements du système"
        actions={
          <Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        }
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((n) => (
                  <tr key={n.id} className={`transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50 ${n.read ? 'opacity-60' : ''}`}>
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
