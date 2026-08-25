import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCheck,
  Download,
  Eye,
  FileText,
  Inbox,
  Paperclip,
  RefreshCw,
  Reply,
  RotateCcw,
  Send,
  Upload,
  XCircle,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost, apiUpload } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import type {
  Message,
  MessageContextType,
  MessagePriority,
  MessageProcessingStatus,
  Page,
  User,
} from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

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

const processingLabels: Record<MessageProcessingStatus, string> = {
  WAITING_RESPONSE: 'En attente',
  RESPONDED: 'Répondu',
  CLOSED: 'Fermé',
  ARCHIVED: 'Archivé',
}

export default function Messages() {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterRead, setFilterRead] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterContext, setFilterContext] = useState('')
  const [tab, setTab] = useState<'inbox' | 'sent' | 'archived'>('inbox')
  const [composeOpen, setComposeOpen] = useState(false)
  const [viewMessage, setViewMessage] = useState<Message | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', '20')
  if (search) params.set('search', search)
  if (filterRead) params.set('readStatus', filterRead)
  if (filterPriority) params.set('priority', filterPriority)
  if (filterContext) params.set('contextType', filterContext)

  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', tab, page, search, filterRead, filterPriority, filterContext],
    queryFn: () => {
      if (tab === 'sent') return apiGet<Page<Message>>(`/messages/sent?page=${page}&size=20&search=${encodeURIComponent(search)}`)
      if (tab === 'archived') return apiGet<Page<Message>>(`/messages/archived?page=${page}&size=20&search=${encodeURIComponent(search)}`)
      return apiGet<Page<Message>>(`/messages?${params.toString()}`)
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users', 'recipients'],
    queryFn: () => apiGet<Page<User>>('/users?page=0&size=100'),
    enabled: !!user?.permissions.includes('USER_READ'),
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
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
      toast.success('Messages marqués comme lus')
    },
  })

  const archiveMsg = useMutation({
    mutationFn: (id: number) => apiPost(`/messages/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Message archivé')
      setViewMessage(null)
    },
  })

  const unarchiveMsg = useMutation({
    mutationFn: (id: number) => apiPost(`/messages/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Message désarchivé')
      setViewMessage(null)
    },
  })

  const closeMsg = useMutation({
    mutationFn: (id: number) => apiPost(`/messages/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Conversation fermée')
      if (viewMessage) setViewMessage({ ...viewMessage, processingStatus: 'CLOSED' })
    },
  })

  const reopenMsg = useMutation({
    mutationFn: (id: number) => apiPost(`/messages/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Conversation rouverte')
      if (viewMessage) setViewMessage({ ...viewMessage, processingStatus: 'WAITING_RESPONSE', closedAt: null })
    },
  })

  async function openThread(m: Message) {
    try {
      const thread = await apiGet<Message[]>(`/messages/${m.id}/thread`)
      setThreadMessages(thread)
      setViewMessage(m)
      if (!m.read) markRead.mutate(m.id)
    } catch {
      setViewMessage(m)
      setThreadMessages([m])
      if (!m.read) markRead.mutate(m.id)
    }
  }

  function getSubjectLink(m: Message) {
    if (m.declarationId) return `/declarations/${m.declarationId}`
    if (m.debtId) return `/debts/${m.debtId}`
    if (m.paymentId) return `/payments`
    return null
  }

  function getSubjectLabel(m: Message) {
    if (m.declarationReference) return `Déclaration ${m.declarationReference}`
    if (m.debtReference) return `Dette ${m.debtReference}`
    if (m.paymentReference) return `Paiement ${m.paymentReference}`
    return null
  }

  const hasActiveFilters = search || filterRead || filterPriority || filterContext

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Messagerie fiscale contextuelle"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <Send className="h-4 w-4" /> Nouveau message
            </Button>
          </div>
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/70 dark:border-slate-700/50 px-5 pt-4">
          {(['inbox', 'sent', 'archived'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(0); setSearch(''); setFilterRead(''); setFilterPriority(''); setFilterContext('') }}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'inbox' ? 'Boîte de réception' : t === 'sent' ? 'Envoyés' : 'Archivés'}
            </button>
          ))}
        </div>

        {tab === 'inbox' && (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 dark:border-slate-700/70 dark:border-slate-700/50 px-5 py-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un message..." className="w-64" />
            <Select value={filterRead} onChange={(e) => { setFilterRead(e.target.value); setPage(0) }} className="w-40">
              <option value="">Tous les statuts</option>
              <option value="UNREAD">Non lus</option>
              <option value="READ">Lus</option>
            </Select>
            <Select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(0) }} className="w-40">
              <option value="">Toutes priorités</option>
              <option value="NORMAL">Normale</option>
              <option value="IMPORTANT">Importante</option>
              <option value="URGENT">Urgente</option>
            </Select>
            <Select value={filterContext} onChange={(e) => { setFilterContext(e.target.value); setPage(0) }} className="w-44">
              <option value="">Tous les dossiers</option>
              {Object.entries(contextLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterRead(''); setFilterPriority(''); setFilterContext(''); setPage(0) }}>
                Réinitialiser
              </Button>
            )}
          </div>
        )}

        {(tab === 'sent' || tab === 'archived') && (
          <div className="flex items-end gap-3 border-b border-slate-200 dark:border-slate-700/70 dark:border-slate-700/50 px-5 py-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={tab === 'sent' ? 'Rechercher dans les envoyés...' : 'Rechercher dans les archives...'}
              className="w-64"
            />
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Impossible de charger les messages.</p>
            <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}>
              <RefreshCw className="h-4 w-4" /> Réessayer
            </Button>
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title={hasActiveFilters ? 'Aucun résultat' : 'Aucun message'}
            subtitle={hasActiveFilters
              ? "Aucun message ne correspond à ces filtres."
              : tab === 'inbox' ? "Votre boîte de réception est vide." : tab === 'sent' ? "Vous n'avez envoyé aucun message." : "Aucun message archivé."}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                  <tr>
                    <Th>{tab === 'sent' ? 'Destinataire' : 'Expéditeur'}</Th>
                    <Th>Contribuable</Th>
                    <Th>Sujet</Th>
                    <Th>Dossier</Th>
                    <Th>Priorité</Th>
                    <Th>Date</Th>
                    <Th>Statut</Th>
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
                      <Td className="font-medium">
                        {tab === 'sent' ? (m.recipientName || `#${m.recipientId}`) : m.senderName}
                      </Td>
                      <Td>
                        {m.taxpayerName ? (
                          <div className="text-sm">
                            <span className="font-medium">{m.taxpayerName}</span>
                            {m.taxpayerNif && <span className="ml-1 text-slate-400 dark:text-slate-500">({m.taxpayerNif})</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </Td>
                      <Td className="max-w-48 truncate">{m.subject || '—'}</Td>
                      <Td>
                        {m.contextType !== 'GENERAL' ? (
                          <Badge tone={contextBadge[m.contextType] as any}>
                            {contextLabels[m.contextType]}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={priorityBadge[m.priority] as any}>
                          {m.priority === 'URGENT' && <AlertTriangle className="h-3 w-3" />}
                          {m.priority === 'IMPORTANT' ? 'Important' : m.priority === 'URGENT' ? 'Urgent' : 'Normal'}
                        </Badge>
                      </Td>
                      <Td>{fmtDateTime(m.createdAt)}</Td>
                      <Td>
                        {m.processingStatus === 'CLOSED' ? (
                          <Badge tone="slate">Fermé</Badge>
                        ) : m.processingStatus === 'ARCHIVED' ? (
                          <Badge tone="slate">Archivé</Badge>
                        ) : m.processingStatus === 'RESPONDED' ? (
                          <Badge tone="green">Répondu</Badge>
                        ) : !m.read ? (
                          <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" />
                        ) : (
                          <Badge tone="blue">Lu</Badge>
                        )}
                      </Td>
                      <Td>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openThread(m) }} aria-label="Voir la conversation">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-2 p-4">
              {data.content.map((m) => (
                <div
                  key={m.id}
                  onClick={() => openThread(m)}
                  className={`rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${m.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {tab === 'sent' ? (m.recipientName || `#${m.recipientId}`) : m.senderName}
                    </span>
                    <div className="flex items-center gap-2">
                      {!m.read && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                      <Badge tone={priorityBadge[m.priority] as any}>
                        {m.priority === 'URGENT' ? 'Urgent' : m.priority === 'IMPORTANT' ? 'Important' : 'Normal'}
                      </Badge>
                    </div>
                  </div>
                  {m.subject && <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.subject}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    {m.contextType !== 'GENERAL' && (
                      <Badge tone={contextBadge[m.contextType] as any}>{contextLabels[m.contextType]}</Badge>
                    )}
                    {m.taxpayerName && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{m.taxpayerName}</span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{fmtDateTime(m.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>

      {/* Modal conversation */}
      {viewMessage && (
        <Modal
          open={!!viewMessage}
          onClose={() => { setViewMessage(null); setThreadMessages([]); setReplyContent(''); setReplyFile(null) }}
          title={viewMessage.subject || 'Conversation'}
          wide
        >
          <div className="space-y-4">
            {/* En-tête contextuel */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewMessage.taxpayerName && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Contribuable : </span>
                    <span className="font-medium">{viewMessage.taxpayerName}</span>
                    {viewMessage.taxpayerNif && <span className="ml-1 text-slate-400 dark:text-slate-500">(NIF: {viewMessage.taxpayerNif})</span>}
                  </div>
                )}
                {viewMessage.contextType !== 'GENERAL' && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Dossier : </span>
                    <Badge tone={contextBadge[viewMessage.contextType] as any}>{contextLabels[viewMessage.contextType]}</Badge>
                    {viewMessage.contextRef && <span className="ml-2 font-mono text-xs">{viewMessage.contextRef}</span>}
                  </div>
                )}
                {viewMessage.declarationReference && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Déclaration : </span>
                    <a href={`/declarations/${viewMessage.declarationId}`} className="text-brand-600 hover:underline">{viewMessage.declarationReference}</a>
                  </div>
                )}
                {viewMessage.debtReference && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Dette : </span>
                    <a href={`/debts/${viewMessage.debtId}`} className="text-brand-600 hover:underline">{viewMessage.debtReference}</a>
                  </div>
                )}
                {viewMessage.paymentReference && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Paiement : </span>
                    <span className="font-mono text-xs">{viewMessage.paymentReference}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Priorité : </span>
                  <Badge tone={priorityBadge[viewMessage.priority] as any}>{viewMessage.priority}</Badge>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Statut : </span>
                  <Badge tone="slate">{processingLabels[viewMessage.processingStatus]}</Badge>
                </div>
              </div>
            </div>

            {/* Messages du thread */}
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {threadMessages.map((tm) => (
                <div key={tm.id} className={`flex ${tm.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    tm.senderId === user?.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  }`}>
                    <p className={`text-xs font-semibold mb-1 ${tm.senderId === user?.id ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {tm.senderName}
                    </p>
                    {tm.subject && <p className="text-sm font-medium">{tm.subject}</p>}
                    <p className="text-sm whitespace-pre-wrap">{tm.content}</p>
                    {tm.attachments && tm.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tm.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={`/api/messages/attachments/${a.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] hover:bg-white/30 transition"
                            title={`Télécharger ${a.originalName}`}
                          >
                            <Paperclip className="h-3 w-3" /> {a.originalName}
                            <Download className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={`mt-1 text-[10px] ${tm.senderId === user?.id ? 'text-brand-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {fmtDateTime(tm.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Réponse */}
            {viewMessage.processingStatus !== 'CLOSED' && viewMessage.processingStatus !== 'ARCHIVED' && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <Textarea
                  rows={3}
                  placeholder="Écrire une réponse..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                    <Upload className="h-3.5 w-3.5" />
                    {replyFile ? replyFile.name : 'Joindre un fichier'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { closeMsg.mutate(viewMessage.id) }}
                      disabled={closeMsg.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Fermer
                    </Button>
                    <Button
                      size="sm"
                      disabled={!replyContent.trim()}
                      onClick={async () => {
                        try {
                          // 1. Send reply message
                          const reply = await apiPost<Message>('/messages', {
                            recipientUsername: viewMessage.senderId === user?.id
                              ? (users?.content.find((u) => u.id === viewMessage.recipientId)?.username || '')
                              : (users?.content.find((u) => u.id === viewMessage.senderId)?.username || ''),
                            subject: viewMessage.subject ? `Re: ${viewMessage.subject}` : '',
                            content: replyContent.trim(),
                            replyToId: viewMessage.id,
                            contextType: viewMessage.contextType,
                            contextRef: viewMessage.contextRef,
                            taxpayerId: viewMessage.taxpayerId,
                            declarationId: viewMessage.declarationId,
                            debtId: viewMessage.debtId,
                            paymentId: viewMessage.paymentId,
                            priority: viewMessage.priority,
                          })
                          // 2. Upload attachment if selected
                          if (replyFile) {
                            try {
                              await apiUpload(`/messages/${reply.id}/attachments`, replyFile)
                            } catch (attachErr) {
                              toast.error('Message envoyé mais erreur lors de la pièce jointe: ' + apiErrorMessage(attachErr))
                            }
                          }
                          toast.success('Réponse envoyée')
                          setReplyContent('')
                          setReplyFile(null)
                          // 3. Refresh thread
                          const thread = await apiGet<Message[]>(`/messages/${viewMessage.id}/thread`)
                          setThreadMessages(thread)
                          queryClient.invalidateQueries({ queryKey: ['messages'] })
                          queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
                        } catch (err) {
                          toast.error(apiErrorMessage(err))
                        }
                      }}
                    >
                      <Reply className="h-4 w-4" /> Répondre
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex gap-2">
                {viewMessage.archivedAt ? (
                  <Button variant="secondary" size="sm" onClick={() => unarchiveMsg.mutate(viewMessage.id)}>
                    <ArchiveRestore className="h-4 w-4" /> Désarchiver
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => archiveMsg.mutate(viewMessage.id)}>
                    <Archive className="h-4 w-4" /> Archiver
                  </Button>
                )}
                {viewMessage.processingStatus === 'CLOSED' ? (
                  <Button variant="secondary" size="sm" onClick={() => reopenMsg.mutate(viewMessage.id)} disabled={reopenMsg.isPending}>
                    <RotateCcw className="h-4 w-4" /> Rouvrir
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => closeMsg.mutate(viewMessage.id)} disabled={closeMsg.isPending}>
                    <XCircle className="h-4 w-4" /> Fermer
                  </Button>
                )}
              </div>
              {getSubjectLink(viewMessage) && (
                <a href={getSubjectLink(viewMessage)!}>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" /> {getSubjectLabel(viewMessage)}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal nouveau message */}
      <NewMessageModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        users={users?.content ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['messages'] })
          queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
          setComposeOpen(false)
        }}
      />
    </div>
  )
}

function NewMessageModal({
  open,
  onClose,
  users,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  users: User[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    recipientUsername: '',
    subject: '',
    content: '',
    contextType: 'GENERAL' as MessageContextType,
    contextRef: '',
    taxpayerId: '',
    priority: 'NORMAL' as MessagePriority,
  })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const toast = useToast()

  const send = useMutation({
    mutationFn: async () => {
      const msg = await apiPost<Message>('/messages', {
        recipientUsername: form.recipientUsername.trim(),
        subject: form.subject.trim() || null,
        content: form.content.trim(),
        contextType: form.contextType,
        contextRef: form.contextRef.trim() || null,
        taxpayerId: form.taxpayerId ? Number(form.taxpayerId) : null,
        priority: form.priority,
      })
      if (file) {
        try {
          await apiUpload(`/messages/${msg.id}/attachments`, file)
        } catch (attachErr) {
          toast.error('Message envoyé mais erreur pièce jointe: ' + apiErrorMessage(attachErr))
        }
      }
      return msg
    },
    onSuccess: () => {
      toast.success('Message envoyé')
      setForm({ recipientUsername: '', subject: '', content: '', contextType: 'GENERAL', contextRef: '', taxpayerId: '', priority: 'NORMAL' })
      setFile(null)
      setError('')
      onSuccess()
    },
    onError: (err: any) => setError(apiErrorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Nouveau message" wide>
      <form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Destinataire *">
            <Input
              list="recipient-usernames"
              placeholder="ex : agent.tax"
              value={form.recipientUsername}
              onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
              autoComplete="off"
            />
            <datalist id="recipient-usernames">
              {users.map((u) => (
                <option key={u.id} value={u.username}>{u.firstName} {u.lastName} ({u.username})</option>
              ))}
            </datalist>
          </Field>
          <Field label="Priorité">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as MessagePriority })}>
              <option value="NORMAL">Normale</option>
              <option value="IMPORTANT">Importante</option>
              <option value="URGENT">Urgente</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type de dossier">
            <Select value={form.contextType} onChange={(e) => setForm({ ...form, contextType: e.target.value as MessageContextType, contextRef: '' })}>
              {Object.entries(contextLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Référence du dossier">
            <Input
              placeholder={form.contextType === 'DECLARATION' ? 'ex : DEC-2026-00125' : form.contextType === 'DEBT' ? 'ex : DET-2026-00089' : 'Référence...'}
              value={form.contextRef}
              onChange={(e) => setForm({ ...form, contextRef: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Sujet (facultatif)">
          <Input
            placeholder="ex : Demande d'information"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </Field>
        <Field label="Message *">
          <Textarea
            rows={5}
            placeholder="Rédigez votre message..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </Field>
        <div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
            <Upload className="h-3.5 w-3.5" />
            {file ? file.name : 'Joindre un fichier (optionnel)'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={send.isPending || !form.recipientUsername.trim() || !form.content.trim()}>
            <Send className="h-4 w-4" /> Envoyer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
