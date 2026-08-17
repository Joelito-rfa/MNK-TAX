import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, CheckCheck } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import type { Notification, Page } from '../types'
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Spinner, StatCard, Table, Td, Th } from '../components/ui'
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

  const unread = data?.content.filter((n) => !n.read).length ?? 0

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Notifications affichées" value={data?.totalElements ?? '—'} icon={<BellRing className="h-5 w-5" />} tone="brand" sub="selon les filtres" />
        <StatCard label="Non lues" value={unread} icon={<BellRing className="h-5 w-5" />} tone="rose" sub="sur la page" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune notification" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Type</Th>
                  <Th>Titre</Th>
                  <Th>Message</Th>
                  <Th>Date</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((n) => (
                  <tr key={n.id} className={`transition hover:bg-slate-50/60 ${n.read ? 'opacity-60' : ''}`}>
                    <Td>
                      <Badge tone={n.read ? 'slate' : 'indigo'}>{typeLabels[n.type] ?? n.type}</Badge>
                    </Td>
                    <Td className="font-medium">{n.title}</Td>
                    <Td className="max-w-80 truncate text-sm text-slate-600">{n.message || '—'}</Td>
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
