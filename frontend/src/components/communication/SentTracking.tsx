import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, ChevronDown, ChevronRight, RotateCcw, Send } from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { fmtDateTime } from '../../lib/format'
import type {
  CommChannel,
  CommDelivery,
  CommMessageStatus,
  CommSentMessage,
  Page,
} from '../../types'
import { Badge, Button, Card, EmptyState, Pagination, SearchInput, Select, Spinner, Table, Td, Th } from '../ui'
import { useToast } from '../Toast'

const STATUS_TONES: Record<string, string> = {
  DRAFT: 'slate',
  SCHEDULED: 'indigo',
  QUEUED: 'amber',
  SENDING: 'blue',
  SENT: 'green',
  DELIVERED: 'green',
  READ: 'emerald',
  FAILED: 'red',
  CANCELLED: 'slate',
  PENDING: 'amber',
  BOUNCED: 'rose',
}

const CHANNEL_ICONS: Record<CommChannel, string> = {
  IN_APP: '💻',
  EMAIL: '📧',
  SMS: '📱',
}

const MESSAGE_STATUSES: CommMessageStatus[] = [
  'SCHEDULED',
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED',
]

export default function SentTracking({ canManage }: { canManage: boolean }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['comm-sent', page, status, search],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', '20')
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      return apiGet<Page<CommSentMessage>>(`/communication/sent?${params.toString()}`)
    },
    enabled: canManage,
    refetchInterval: 30_000,
  })

  const retry = useMutation({
    mutationFn: (id: number) => apiPost(`/communication/messages/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-sent'] })
      toast.success(t('comm.tracking.retryDone'))
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  const cancel = useMutation({
    mutationFn: (id: number) => apiPost(`/communication/messages/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-sent'] })
      toast.success(t('comm.tracking.cancelDone'))
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  if (!canManage) return null

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={t('common.search')} className="w-64" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} className="w-44">
          <option value="">{t('common.all')}</option>
          {MESSAGE_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`comm.status.${s}`)}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={<Send className="h-5 w-5" />}
          title={t('comm.tracking.empty')}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
                <tr>
                  <Th />
                  <Th>{t('comm.tracking.recipient')}</Th>
                  <Th>{t('comm.compose.subject')}</Th>
                  <Th>{t('comm.tracking.channels')}</Th>
                  <Th>{t('comm.tracking.status')}</Th>
                  <Th>{t('comm.tracking.created')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((m) => (
                  <SentRow
                    key={m.id}
                    message={m}
                    expanded={expanded === m.id}
                    onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                    onRetry={() => retry.mutate(m.id)}
                    onCancel={() => cancel.mutate(m.id)}
                    retrying={retry.isPending && retry.variables === m.id}
                    cancelling={cancel.isPending && cancel.variables === m.id}
                  />
                ))}
              </tbody>
            </Table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} totalElements={data.totalElements} />
        </>
      )}
    </Card>
  )
}

function SentRow({
  message,
  expanded,
  onToggle,
  onRetry,
  onCancel,
  retrying,
  cancelling,
}: {
  message: CommSentMessage
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
  onCancel: () => void
  retrying: boolean
  cancelling: boolean
}) {
  const { t } = useI18n()
  const channels = (message.channels ?? '').split(',').filter(Boolean)

  return (
    <>
      <tr className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={onToggle}>
        <Td>
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </Td>
        <Td>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {message.recipientName}
          </div>
          {message.taxpayerName && (
            <div className="text-xs text-slate-400">
              {message.taxpayerName}
              {message.taxpayerNif ? ` · ${message.taxpayerNif}` : ''}
            </div>
          )}
        </Td>
        <Td className="max-w-56 truncate">{message.subject || '—'}</Td>
        <Td>
          <div className="flex gap-1">
            {channels.map((c) => (
              <span key={c} title={t(`comm.channel.${c}`)}>
                {CHANNEL_ICONS[c as CommChannel] ?? c}
              </span>
            ))}
          </div>
        </Td>
        <Td>
          <Badge tone={(STATUS_TONES[message.status] ?? 'slate') as never}>
            {t(`comm.status.${message.status}`)}
          </Badge>
          {message.lastError && (
            <div className="mt-1 max-w-52 truncate text-xs text-rose-500" title={message.lastError}>
              {message.lastError}
            </div>
          )}
        </Td>
        <Td className="whitespace-nowrap text-sm">
          {fmtDateTime(message.scheduledAt ?? message.createdAt)}
        </Td>
        <Td>
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {message.status === 'FAILED' && (
              <Button variant="ghost" size="sm" onClick={onRetry} loading={retrying} title={t('comm.tracking.retry')}>
                <RotateCcw className="h-3.5 w-3.5" /> {t('comm.tracking.retry')}
              </Button>
            )}
            {message.status === 'SCHEDULED' && (
              <Button variant="ghost" size="sm" onClick={onCancel} loading={cancelling} title={t('comm.tracking.cancel')}>
                <Ban className="h-3.5 w-3.5" /> {t('comm.tracking.cancel')}
              </Button>
            )}
          </div>
        </Td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/60 dark:bg-slate-800/40">
          <td colSpan={7} className="px-10 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('comm.tracking.deliveries')}
            </p>
            {message.deliveries.length === 0 ? (
              <p className="text-sm text-slate-400">{t('comm.tracking.noDeliveries')}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {message.deliveries.map((d) => (
                  <DeliveryChip key={d.id} delivery={d} />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function DeliveryChip({ delivery }: { delivery: CommDelivery }) {
  const { t } = useI18n()
  return (
    <div className="min-w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {CHANNEL_ICONS[delivery.channel]} {t(`comm.channel.${delivery.channel}`)}
        </span>
        <Badge tone={(STATUS_TONES[delivery.status] ?? 'slate') as never}>
          {t(`comm.status.${delivery.status}`)}
        </Badge>
      </div>
      {delivery.recipientAddress && (
        <div className="truncate text-slate-400" title={delivery.recipientAddress}>
          {delivery.recipientAddress}
        </div>
      )}
      <div className="mt-1 text-slate-400">
        {t('comm.tracking.attempts')} : {delivery.attemptCount}/{delivery.maxAttempts}
      </div>
      {delivery.sentAt && (
        <div className="text-slate-400">↳ {fmtDateTime(delivery.sentAt)}</div>
      )}
      {delivery.readAt && (
        <div className="text-emerald-500">✓ {fmtDateTime(delivery.readAt)}</div>
      )}
      {delivery.lastError && (
        <div className="mt-1 text-rose-500" title={delivery.lastError}>
          {delivery.lastError}
        </div>
      )}
    </div>
  )
}
