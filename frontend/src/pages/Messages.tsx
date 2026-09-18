import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BarChart3,
  CheckCheck,
  Clock,
  Eye,
  Inbox,
  MailOpen,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fmtDateTime } from '../lib/format'
import type { Message, MessageContextType, MessagePriority, MessageProcessingStatus } from '../types'
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
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import ComposeDialog from '../components/communication/ComposeDialog'
import SentTracking from '../components/communication/SentTracking'
import Campaigns from '../components/communication/Campaigns'
import AdminPanel from '../components/communication/AdminPanel'
import { useCommStats, useMessageFolder, useMessageStats, useMessageThread } from '../features/message/api/queries'
import {
  useArchiveMessage,
  useCloseMessage,
  useDownloadMessageAttachment,
  useMarkAllRead,
  useMarkMessageRead,
  useReopenMessage,
  useSendMessage,
  useUnarchiveMessage,
} from '../features/message/api/mutations'
import type { MessageFolder } from '../features/message/api/keys'

type Tab = MessageFolder | 'compose' | 'stats' | 'tracking' | 'campaigns' | 'admin'

const TABS: { key: Tab; labelKey: string; permission?: string; icon: React.ReactNode }[] = [
  { key: 'inbox', labelKey: 'comm.tab.inbox', icon: <Inbox className="h-4 w-4" /> },
  { key: 'sent', labelKey: 'comm.tab.sent', icon: <Send className="h-4 w-4" /> },
  { key: 'archived', labelKey: 'comm.tab.archived', icon: <Archive className="h-4 w-4" /> },
  { key: 'compose', labelKey: 'comm.tab.compose', permission: 'MESSAGE_WRITE', icon: <Send className="h-4 w-4" /> },
  { key: 'stats', labelKey: 'comm.tab.stats', permission: 'MESSAGE_READ', icon: <BarChart3 className="h-4 w-4" /> },
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

const processingBadge: Record<MessageProcessingStatus, string> = {
  WAITING_RESPONSE: 'amber',
  RESPONDED: 'blue',
  CLOSED: 'slate',
  ARCHIVED: 'violet',
}

const emptyKey: Record<MessageFolder, string> = {
  inbox: 'messages.emptyInbox',
  sent: 'messages.emptySent',
  archived: 'messages.emptyArchived',
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
          {tab === 'inbox' && <MailboxView folder="inbox" canWrite={canWrite} />}
          {tab === 'sent' && <MailboxView folder="sent" canWrite={canWrite} />}
          {tab === 'archived' && <MailboxView folder="archived" canWrite={canWrite} />}
          {tab === 'compose' && <ComposeInline onOpen={() => setComposeOpen(true)} canWrite={canWrite} />}
          {tab === 'stats' && <MessageStatsView />}
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
  const { data } = useCommStats()
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

// ─── Statistiques de ma messagerie ─────────────────────────────────

function MessageStatsView() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useMessageStats()

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('error.loadFailed')}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> {t('common.retry')}
        </Button>
      </div>
    )
  }
  if (isLoading || !data) return <Spinner />

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('messages.stats.received')} value={data.totalReceived} icon={<Inbox className="h-5 w-5" />} />
      <StatCard label={t('messages.stats.unread')} value={data.unreadCount} tone="amber" icon={<MailOpen className="h-5 w-5" />} />
      <StatCard label={t('messages.stats.waiting')} value={data.waitingResponseCount} tone="indigo" icon={<Clock className="h-5 w-5" />} />
      <StatCard label={t('messages.stats.urgent')} value={data.urgentCount} tone="rose" icon={<AlertTriangle className="h-5 w-5" />} />
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

// ─── Dossiers : reçus / envoyés / archivés ─────────────────────────

function MailboxView({ folder, canWrite }: { folder: MessageFolder; canWrite: boolean }) {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterRead, setFilterRead] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterContext, setFilterContext] = useState('')
  const [viewMessage, setViewMessage] = useState<Message | null>(null)

  const isArchived = folder === 'archived'
  const isInbox = folder === 'inbox'

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', '20')
  // `/messages/archived` n'accepte que la pagination côté backend.
  if (!isArchived) {
    if (search) params.set('search', search)
    if (isInbox && filterRead) params.set('readStatus', filterRead)
    if (filterPriority) params.set('priority', filterPriority)
    if (filterContext) params.set('contextType', filterContext)
  }

  const { data, isLoading, error, refetch } = useMessageFolder(folder, params.toString())
  const markAll = useMarkAllRead()
  const markRead = useMarkMessageRead()

  function openMessage(m: Message) {
    setViewMessage(m)
    if (isInbox && !m.read) markRead.mutate(m.id)
  }

  const hasActiveFilters = !isArchived && Boolean(search || filterRead || filterPriority || filterContext)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {!isArchived && (
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(0) }}
            placeholder={isInbox ? t('messages.searchPlaceholder') : t('messages.searchSent')}
            className="w-64"
          />
        )}
        {isInbox && (
          <Select value={filterRead} onChange={(e) => { setFilterRead(e.target.value); setPage(0) }} className="w-40">
            <option value="">{t('common.all')}</option>
            <option value="UNREAD">{t('messages.unread')}</option>
            <option value="READ">{t('messages.read')}</option>
          </Select>
        )}
        {!isArchived && (
          <Select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(0) }} className="w-40">
            <option value="">{t('common.all')}</option>
            <option value="NORMAL">{t('comm.priority.NORMAL')}</option>
            <option value="IMPORTANT">{t('comm.priority.HIGH')}</option>
            <option value="URGENT">{t('comm.priority.URGENT')}</option>
          </Select>
        )}
        {!isArchived && (
          <Select value={filterContext} onChange={(e) => { setFilterContext(e.target.value); setPage(0) }} className="w-44">
            <option value="">{t('common.all')}</option>
            {Object.entries(contextLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        )}
        {isInbox && (
          <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            <CheckCheck className="h-4 w-4" /> {t('header.markAllRead')}
          </Button>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('error.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> {t('common.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={hasActiveFilters ? t('common.noResult') : t(emptyKey[folder])}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
                <tr>
                  <Th>{isInbox ? t('messages.sender') : t('messages.recipient')}</Th>
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
                    className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isInbox && m.read ? 'opacity-60' : ''}`}
                    onClick={() => openMessage(m)}
                  >
                    <Td className="font-medium">{isInbox ? m.senderName : (m.recipientName ?? '—')}</Td>
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
                      {isInbox ? (
                        !m.read ? (
                          <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" title={t('messages.unread')} />
                        ) : (
                          <Badge tone="blue">{t('messages.read')}</Badge>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge tone={processingBadge[m.processingStatus] as never}>
                            {t(`messages.processing.${m.processingStatus}`)}
                          </Badge>
                          {m.replyCount > 0 && (
                            <span className="text-xs text-slate-400">{m.replyCount}</span>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          isArchived ? (
                            <RowUnarchiveButton id={m.id} label={t('messages.action.unarchive')} />
                          ) : (
                            <RowArchiveButton id={m.id} label={t('messages.action.archive')} />
                          )
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openMessage(m) }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                          aria-label={t('common.details')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} totalElements={data.totalElements} />
        </>
      )}

      <MessageThreadModal message={viewMessage} canWrite={canWrite} onClose={() => setViewMessage(null)} />
    </div>
  )
}

function RowArchiveButton({ id, label }: { id: number; label: string }) {
  const archive = useArchiveMessage()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); archive.mutate(id) }}
      disabled={archive.isPending}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-slate-700"
    >
      <Archive className="h-4 w-4" />
    </button>
  )
}

function RowUnarchiveButton({ id, label }: { id: number; label: string }) {
  const unarchive = useUnarchiveMessage()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); unarchive.mutate(id) }}
      disabled={unarchive.isPending}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-slate-700"
    >
      <ArchiveRestore className="h-4 w-4" />
    </button>
  )
}

// ─── Conversation : détail, liens croisés, réponse, archivage/clôture ──

function MessageThreadModal({
  message,
  canWrite,
  onClose,
}: {
  message: Message | null
  canWrite: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [replyContent, setReplyContent] = useState('')

  const threadQuery = useMessageThread(message?.id ?? null)
  const send = useSendMessage()
  const archive = useArchiveMessage()
  const unarchive = useUnarchiveMessage()
  const close = useCloseMessage()
  const reopen = useReopenMessage()
  const download = useDownloadMessageAttachment()

  useEffect(() => { setReplyContent('') }, [message?.id])

  const thread = threadQuery.data ?? (message ? [message] : [])
  const isArchived = message != null && (message.archivedAt != null || message.processingStatus === 'ARCHIVED')
  const isClosed = message?.processingStatus === 'CLOSED'
  const canReply = canWrite && !isClosed && message?.senderId != null && message.senderId !== user?.id
  const busy = archive.isPending || unarchive.isPending || close.isPending || reopen.isPending

  const links: { to: string; label: string }[] = []
  if (message) {
    if (message.taxpayerId != null) {
      links.push({
        to: `/taxpayers/${message.taxpayerId}`,
        label: `${t('sidebar.taxpayers')} · ${message.taxpayerName ?? message.taxpayerNif ?? message.taxpayerId}`,
      })
    }
    if (message.declarationId != null) {
      links.push({
        to: `/declarations/${message.declarationId}`,
        label: `${contextLabels.DECLARATION} · ${message.declarationReference ?? message.declarationId}`,
      })
    }
    if (message.debtId != null) {
      links.push({
        to: `/debts/${message.debtId}`,
        label: `${contextLabels.DEBT} · ${message.debtReference ?? message.debtId}`,
      })
    }
    if (message.paymentId != null) {
      links.push({
        to: '/payments',
        label: `${contextLabels.PAYMENT} · ${message.paymentReference ?? message.paymentId}`,
      })
    }
  }

  return (
    <Modal
      open={!!message}
      onClose={onClose}
      title={message?.subject || t('messages.title')}
      subtitle={message ? `${message.senderName} · ${fmtDateTime(message.createdAt)}` : undefined}
      wide
    >
      {message && (
        <div className="space-y-4 px-5 py-4">
          {/* Statut + actions de gestion de la conversation */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={processingBadge[message.processingStatus] as never}>
                {t(`messages.processing.${message.processingStatus}`)}
              </Badge>
              <Badge tone={priorityBadge[message.priority] as never}>
                {message.priority === 'URGENT' ? t('comm.priority.URGENT') : message.priority === 'IMPORTANT' ? t('comm.priority.HIGH') : t('comm.priority.NORMAL')}
              </Badge>
              {message.contextType !== 'GENERAL' && (
                <Badge tone={contextBadge[message.contextType] as never}>{contextLabels[message.contextType]}</Badge>
              )}
            </div>
            {canWrite && (
              <div className="flex items-center gap-2">
                {isArchived ? (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => unarchive.mutate(message.id, { onSuccess: onClose })}>
                    <ArchiveRestore className="h-3.5 w-3.5" /> {t('messages.action.unarchive')}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => archive.mutate(message.id, { onSuccess: onClose })}>
                    <Archive className="h-3.5 w-3.5" /> {t('messages.action.archive')}
                  </Button>
                )}
                {isClosed ? (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => reopen.mutate(message.id, { onSuccess: onClose })}>
                    <RefreshCw className="h-3.5 w-3.5" /> {t('messages.action.reopen')}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => close.mutate(message.id, { onSuccess: onClose })}>
                    <XCircle className="h-3.5 w-3.5" /> {t('messages.action.close')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Liens croisés vers les entités liées */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              {links.map((l) => (
                <Link
                  key={l.to + l.label}
                  to={l.to}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-brand-600 shadow-sm transition hover:bg-brand-50 dark:bg-slate-700 dark:text-brand-400"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Conversation */}
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {threadQuery.isLoading && <Spinner />}
            {thread.map((tm) => (
              <div key={tm.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{tm.senderName}</span>
                  <span>{fmtDateTime(tm.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{tm.content}</p>
                {tm.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tm.attachments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => download.mutate({ id: a.id, fileName: a.originalName })}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-brand-600 shadow-sm hover:bg-brand-50 dark:bg-slate-700 dark:text-brand-400"
                      >
                        📎 {a.originalName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canReply && (
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
                  loading={send.isPending}
                  onClick={() =>
                    send.mutate(
                      {
                        recipientId: message.senderId,
                        subject: message.subject,
                        content: replyContent.trim(),
                        replyToId: message.id,
                      },
                      { onSuccess: () => setReplyContent('') },
                    )
                  }
                >
                  <Send className="h-3.5 w-3.5" /> {t('common.send')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
