import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, Mail, MailOpen, Send } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import type { Message, Page, User } from '../types'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

export default function Messages() {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState({ recipientUsername: '', subject: '', content: '' })
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['messages', page],
    queryFn: () => apiGet<Page<Message>>(`/messages?page=${page}&size=20`),
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
    },
  })

  const markAll = useMutation({
    mutationFn: () => apiPost('/messages/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Messages marqués comme lus')
    },
  })

  const send = useMutation({
    mutationFn: () =>
      apiPost('/messages', {
        recipientUsername: form.recipientUsername.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setComposeOpen(false)
      setForm({ recipientUsername: '', subject: '', content: '' })
      toast.success('Message envoyé')
    },
  })

  const unread = data?.content.filter((m) => !m.read).length ?? 0

  function onOpenMessage(m: Message) {
    if (!m.read) {
      markRead.mutate(m.id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Messagerie interne entre les agents et les contribuables"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Messages reçus" value={data?.totalElements ?? '—'} icon={<Mail className="h-5 w-5" />} tone="brand" sub="au total" />
        <StatCard label="Non lus" value={unread} icon={<MailOpen className="h-5 w-5" />} tone="rose" sub="sur la page" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun message" subtitle="Recevez ici les messages des agents et de l'administration." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Expéditeur</Th>
                  <Th>Sujet</Th>
                  <Th>Contenu</Th>
                  <Th>Date</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onOpenMessage(m)}
                    className={`cursor-pointer transition hover:bg-slate-50/60 ${m.read ? 'opacity-60' : ''}`}
                  >
                    <Td className="font-medium">{m.senderName}</Td>
                    <Td className="max-w-48 truncate">{m.subject || '—'}</Td>
                    <Td className="max-w-80 truncate text-sm text-slate-600">{m.content}</Td>
                    <Td>{fmtDateTime(m.createdAt)}</Td>
                    <Td>{m.read ? 'Lu' : <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" />}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Nouveau message">
        <form
          onSubmit={(e) => { e.preventDefault(); send.mutate() }}
          className="space-y-4"
        >
          {send.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(send.error)}
            </div>
          )}
          <Field label="Destinataire" hint="Nom d'utilisateur du compte destinataire">
            <Input
              list="recipient-usernames"
              placeholder="ex : agent.tax"
              value={form.recipientUsername}
              onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
              autoComplete="off"
            />
            {users && (
              <datalist id="recipient-usernames">
                {users.content.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.firstName} {u.lastName} ({u.username})
                  </option>
                ))}
              </datalist>
            )}
          </Field>
          <Field label="Sujet (facultatif)">
            <Input
              placeholder="ex : Demande d'information"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </Field>
          <Field label="Message">
            <Textarea
              rows={5}
              placeholder="Rédigez votre message…"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={send.isPending || !form.recipientUsername.trim() || !form.content.trim()}>
              Envoyer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
