import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart3,
  CheckCheck,
  Eye,
  Inbox,
  RefreshCw,
  Send,
} from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fmtDateTime } from '../lib/format'
import type {
  CommStats,
  Message,
  MessageContextType,
  MessagePriority,
  Page,
} from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import ComposeDialog from '../components/communication/ComposeDialog'
import SentTracking from '../components/communication/SentTracking'
import Campaigns from '../components/communication/Campaigns'
import AdminPanel from '../components/communication/AdminPanel'

type Tab = 'inbox' | 'compose' | 'tracking' | 'campaigns' | 'admin'

const TABS: { key: Tab; labelKey: string; permission?: string; icon: React.ReactNode }[] = [
  { key: 'inbox', labelKey: 'comm.tab.inbox', icon: <Inbox className="h-4 w-4" /> },
  { key: 'compose', labelKey: 'comm.tab.compose', permission: 'MESSAGE_WRITE', icon: <Send className="h-4 w-4" /> },
  { key: 'tracking', labelKey: 'comm.tab.tracking', permission: 'MESSAGE_MANAGE', icon: <RefreshCw className="h-4 w-4" /> },
  { key: 'campaigns', labelKey: 'comm.tab.campaigns', permission: 'MESSAGE_MANAGE', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'admin', labelKey: 'comm.tab.admin', permission: 'MESSAGE_MANAGE', icon: <AlertTriangle className="h-4 w-4" /> },
]

const contextLabels: Record<MessageContextType, string> = {
  DECLARATION: 'Déclaration',
  DEBT: 'Dette',
  PAYMENT: 'Paiement',
  RECOVERY: 'Recouvrement',
  AUDIT: 'Contrôle fiscal',
  COMPLAINT: 'Réclamation',
  REFUND: 'Remboursement',
  DEADLINE: 'Échéance',
  GENERAL: 'Général',
}

const contextBadge: Record<MessageContextType, string> = {
  DECLARATION: 'blue',
  DEBT: 'red',
  PAYMENT: 'green',
  RECOVERY: 'violet',
  AUDIT: 'amber',
  COMPLAINT: 'rose',
  REFUND: 'emerald',
  DEADLINE: 'indigo',
  GENERAL: 'slate',
}

const priorityBadge: Record<MessagePriority, string> = {
  NORMAL: 'slate',
  IMPORTANT: 'amber',
  URGENT: 'red',
}

export default function Messages() {
  const { user } = useAuth()
  const { t } = useI18n()
  const permissions = user?.permissions ?? []

  const [tab, setTab] = useState<Tab>('inbox')
  const [composeOpen, setComposeOpen] = useState(false)

  const canManage = permissions.includes('MESSAGE_MANAGE')
  const canWrite = permissions.includes('MESSAGE_WRITE')

  const visibleTabs = useMemo(
    () => TABS.filter((tb) => !tb.permission || permissions.includes(tb.permission)),
    [permissions],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('comm.title')}
        subtitle={t('comm.subtitle')}
        actions={
          canWrite && (
            <Button onClick={() => setComposeOpen(true)}>
              <Send className="h-4 w-4" /> {t('messages.new')}
            </Button>
          )
        }
      />

      {canManage && <StatsBar />}

      <Card>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto border-b border-slate-200/70 px-4 pt-3 dark:border-slate-700/50">
          {visibleTabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                tab === tb.key
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tb.icon}
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'inbox' && <InboxView />}
          {tab === 'compose' && <ComposeInline onOpen={() => setComposeOpen(true)} canWrite={canWrite} />}
          {tab === 'tracking' && <SentTracking canManage={canManage} />}
          {tab === 'campaigns' && <Campaigns canManage={canManage} />}
          {tab === 'admin' && <AdminPanel canManage={canManage} />}
        </div>
      </Card>

      <ComposeDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}

// ─── Statistiques du centre ────────────────────────────────────────

function StatsBar() {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['comm-stats'],
    queryFn: () => apiGet<CommStats>('/communication/stats'),
    refetchInterval: 60_000,
  })
  if (!data) return null

  const items = [
    { label: t('comm.status.SENT'), value: data.messagesSent, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('comm.status.FAILED'), value: data.messagesFailed, tone: 'text-rose-500' },
    { label: t('comm.status.SCHEDULED'), value: data.messagesScheduled, tone: 'text-indigo-500' },
    { label: t('comm.status.QUEUED'), value: data.messagesQueued, tone: 'text-amber-500' },
    { label: t('comm.status.READ'), value: data.messagesRead, tone: 'text-brand-600' },
    { label: t('comm.channel.EMAIL'), value: data.emailsSent, tone: 'text-slate-600 dark:text-slate-300' },
    { label: t('comm.channel.SMS'), value: data.smsSent, tone: 'text-slate-600 dark:text-slate-300' },
    { label: t('comm.channel.IN_APP'), value: data.notificationsSent, tone: 'text-slate-600 dark:text-slate-300' },
    { label: t('collection.collectionRate'), value: `${data.deliveryRate}%`, tone: 'text-emerald-600' },
    { label: t('comm.status.READ'), value: `${data.readRate}%`, tone: 'text-brand-600' },
  ]
  const seen = new Set<string>()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
      {items.map((it) => {
        const key = `${it.label}-${it.value}`
        if (seen.has(it.label)) return null
        seen.add(it.label)
        return (
          <div key={key} className="card rounded-2xl px-4 py-3">
            <p className="truncate text-xs text-slate-400">{it.label}</p>
            <p className={`text-lg font-semibold ${it.tone}`}>{it.value}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet composeur (point d'entrée) ─────────────────────────────

function ComposeInline({ onOpen, canWrite }: { onOpen: () => void; canWrite: boolean }) {
  const { t } = useI18n()
  if (!canWrite) return null
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
        <Send className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">{t('comm.compose.preview.title')}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('comm.subtitle')}</p>
      </div>
      <Button onClick={onOpen}>
        <Send className="h-4 w-4" /> {t('comm.tab.compose')}
      </Button>
    </div>
  )
}

// ─── Boîte de réception (messagerie contextuelle existante) ────────

function InboxView() {
  const { t } = useI18n()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterRead, setFilterRead] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterContext, setFilterContext] = useState('')
  const [viewMessage, setViewMessage] = useState<Message | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [replyContent, setReplyContent] = useState('')

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', '20')
  if (search) params.set('search', search)
  if (filterRead) params.set('readStatus', filterRead)
  if (filterPriority) params.set('priority', filterPriority)
  if (filterContext) params.set('contextType', filterContext)

  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', 'inbox', page, search, filterRead, filterPriority, filterContext],
    queryFn: () => apiGet<Page<Message>>(`/messages?${params.toString()}`),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => apiPost(`/messages/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => apiPost('/messages/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success(t('messages.markedRead'))
    },
  })

  const reply = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      apiPost<Message>('/messages', {
        recipientId: viewMessage?.senderId ?? null,
        subject: viewMessage?.subject ?? '',
        content,
        replyToId: id,
      }),
    onSuccess: () => {
      toast.success(t('messages.replySent'))
      setReplyContent('')
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  async function openThread(m: Message) {
    try {
      const thread = await apiGet<Message[]>(`/messages/${m.id}/thread`)
      setThreadMessages(thread)
      setViewMessage(m)
    } catch {
      setViewMessage(m)
      setThreadMessages([m])
    }
    if (!m.read) markRead.mutate(m.id)
  }

  const hasActiveFilters = search || filterRead || filterPriority || filterContext

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={t('messages.searchPlaceholder')} className="w-64" />
        <Select value={filterRead} onChange={(e) => { setFilterRead(e.target.value); setPage(0) }} className="w-40">
          <option value="">{t('common.all')}</option>
          <option value="UNREAD">{t('messages.unread')}</option>
          <option value="READ">{t('messages.read')}</option>
        </Select>
        <Select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(0) }} className="w-40">
          <option value="">{t('common.all')}</option>
          <option value="NORMAL">{t('comm.priority.NORMAL')}</option>
          <option value="IMPORTANT">{t('comm.priority.HIGH')}</option>
          <option value="URGENT">{t('comm.priority.URGENT')}</option>
        </Select>
        <Select value={filterContext} onChange={(e) => { setFilterContext(e.target.value); setPage(0) }} className="w-44">
          <option value="">{t('common.all')}</option>
          {Object.entries(contextLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          <CheckCheck className="h-4 w-4" /> {t('header.markAllRead')}
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('error.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}>
            <RefreshCw className="h-4 w-4" /> {t('common.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={hasActiveFilters ? t('common.noResult') : t('messages.emptyInbox')}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
                <tr>
                  <Th>{t('messages.sender')}</Th>
                  <Th>{t('comm.compose.subject')}</Th>
                  <Th>{t('common.type')}</Th>
                  <Th>{t('comm.compose.priority')}</Th>
                  <Th>{t('common.date')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.content.map((m) => (
                  <tr
                    key={m.id}
                    className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${m.read ? 'opacity-60' : ''}`}
                    onClick={() => openThread(m)}
                  >
                    <Td className="font-medium">{m.senderName}</Td>
                    <Td className="max-w-56 truncate">{m.subject || '—'}</Td>
                    <Td>
                      {m.contextType !== 'GENERAL' ? (
                        <Badge tone={contextBadge[m.contextType] as never}>
                          {contextLabels[m.contextType]}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={priorityBadge[m.priority] as never}>
                        {m.priority === 'URGENT' ? t('comm.priority.URGENT') : m.priority === 'IMPORTANT' ? t('comm.priority.HIGH') : t('comm.priority.NORMAL')}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-sm">{fmtDateTime(m.createdAt)}</Td>
                    <Td>
                      {!m.read ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" title={t('messages.unread')} />
                      ) : (
                        <Badge tone="blue">{t('comm.status.READ')}</Badge>
                      )}
                    </Td>
                    <Td>
                      <button
                        onClick={(e) => { e.stopPropagation(); openThread(m) }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                        aria-label={t('common.details')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} totalElements={data.totalElements} />
        </>
      )}

      {/* Détail + réponse (conversation) */}
      <Modal
        open={!!viewMessage}
        onClose={() => setViewMessage(null)}
        title={viewMessage?.subject || t('messages.title')}
        subtitle={viewMessage ? `${viewMessage.senderName} · ${fmtDateTime(viewMessage.createdAt)}` : undefined}
        wide
      >
        {viewMessage && (
          <div className="space-y-4 px-5 py-4">
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {threadMessages.map((tm) => (
                <div key={tm.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{tm.senderName}</span>
                    <span>{fmtDateTime(tm.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{tm.content}</p>
                  {tm.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tm.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={`/api/messages/attachments/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-brand-600 shadow-sm hover:bg-brand-50 dark:bg-slate-700 dark:text-brand-400"
                          target="_blank"
                          rel="noreferrer"
                        >
                          📎 {a.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {viewMessage.senderId !== user?.id && viewMessage.senderId != null && (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('messages.writeReply')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!replyContent.trim()}
                    loading={reply.isPending}
                    onClick={() => reply.mutate({ id: viewMessage.id, content: replyContent.trim() })}
                  >
                    <Send className="h-3.5 w-3.5" /> {t('common.send')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
