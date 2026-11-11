import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fmtDateTime } from '../lib/format'
import type { Notification, Page } from '../types'
import { Avatar } from '../components/Avatar'
import { Badge, Card, EmptyState, PageHeader, Pagination, Spinner, Table, Td, Th } from '../components/ui'
import RowActionPortal from '../components/RowActionPortal'
import { ExportButton } from '../components/ExportButton'

export default function Notifications() {
  const { user, avatarUrl } = useAuth()
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => apiGet<Page<Notification>>(`/notifications?page=${page}&size=20`),
  })

  /** Toutes les notifications de l'utilisateur (sans pagination). */
  const exportNotificationRows = async () => {
    const rows = await apiGet<Page<Notification>>('/notifications?size=9999')
    return rows.content.map((n) => [
      t(`notifications.page.type.${n.type}`),
      n.title,
      n.message || '',
      n.createdAt,
      n.read ? t('notifications.page.read') : t('messages.unread'),
    ])
  }

  const markRead = useMutation({
    mutationFn: (id: number) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.page.subtitle')}
        actions={
          <ExportButton
            filenameBase={`notifications_${new Date().toISOString().slice(0, 10)}`}
            title={t('notifications.title')}
            headers={[t('common.type'), t('notifications.page.table.title'), t('notifications.page.table.message'), t('common.date'), t('common.status')]}
            rows={exportNotificationRows}
          />
        }
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title={t('notifications.empty')} />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
                <tr>
                  <Th>{t('common.type')}</Th>
                  <Th>{t('notifications.page.table.title')}</Th>
                  <Th>{t('notifications.page.table.message')}</Th>
                  <Th>{t('common.date')}</Th>
                  <Th>{t('common.status')}</Th>
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
                        <Badge tone={n.read ? 'slate' : 'indigo'}>{t(`notifications.page.type.${n.type}`)}</Badge>
                      </span>
                    </Td>
                    <Td className="font-medium">{n.title}</Td>
                    <Td className="max-w-80 truncate text-sm text-slate-600 dark:text-slate-400">{n.message || '—'}</Td>
                    <Td>{fmtDateTime(n.createdAt)}</Td>
                    <Td>{n.read ? t('notifications.page.read') : <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" />}</Td>
                    <Td>
                      <RowActionPortal width={192}>
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id) }}
                            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <CheckCheck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('notifications.page.markRead')}
                          </button>
                        )}
                      </RowActionPortal>
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
