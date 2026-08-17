import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, ShieldCheck, UserCheck } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import type { AuditLog, Page } from '../types'
import { Badge, Card, EmptyState, Input, PageHeader, Pagination, SearchInput, Spinner, StatCard, Table, Td, Th } from '../components/ui'

const actionLabels: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGIN_FAILED: 'Échec connexion',
  CREATE: 'Création',
  UPDATE: 'Mise à jour',
  DELETE: 'Suppression',
  VALIDATE: 'Validation',
  REJECT: 'Rejet',
  ADJUSTMENT: 'Ajustement',
  PAYMENT: 'Paiement',
  MARK_OVERDUE: 'Marquage retard',
}

export default function AuditLogs() {
  const [page, setPage] = useState(0)
  const [action, setAction] = useState('')
  const [username, setUsername] = useState('')

  const params = new URLSearchParams({ page: String(page), size: '50' })
  if (action) params.set('action', action)
  if (username) params.set('username', username)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action, username],
    queryFn: () => apiGet<Page<AuditLog>>(`/audit-logs?${params.toString()}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d’audit"
        subtitle="Traçabilité des actions sensibles et des connexions"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Entrées affichées" value={data?.totalElements ?? '—'} icon={<ScrollText className="h-5 w-5" />} tone="brand" sub="selon les filtres" />
        <StatCard label="Actions tracées" value={Object.keys(actionLabels).length} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" sub="types d’événements" />
        <StatCard label="Utilisateurs actifs" value={data?.content.filter((a) => a.username).length ?? '—'} icon={<UserCheck className="h-5 w-5" />} tone="sky" sub="sur la page" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <SearchInput
            value={username}
            onChange={(v) => { setUsername(v); setPage(0) }}
            placeholder="Utilisateur (ex : admin)…"
            className="min-w-48 flex-1"
          />
          <div className="w-48">
            <Input placeholder="Action (ex : LOGIN)…" value={action} onChange={(e) => { setAction(e.target.value); setPage(0) }} />
          </div>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucune entrée d’audit" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Date</Th>
                  <Th>Utilisateur</Th>
                  <Th>Action</Th>
                  <Th>Entité</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((a) => (
                  <tr key={a.id} className="transition hover:bg-slate-50/60">
                    <Td>{fmtDateTime(a.createdAt)}</Td>
                    <Td className="font-mono">{a.username || '—'}</Td>
                    <Td>
                      <Badge tone="slate">{actionLabels[a.action] ?? a.action}</Badge>
                    </Td>
                    <Td>
                      <span className="text-sm">{a.entityType}</span>
                      <span className="ml-1 font-mono text-xs text-slate-500">#{a.entityId}</span>
                    </Td>
                    <Td className="font-mono text-xs">{a.ipAddress || '—'}</Td>
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
