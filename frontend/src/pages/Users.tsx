import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ShieldCheck, UserCheck, Users as UsersIcon } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import type { Page, User } from '../types'
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
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

export default function Users() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (q) params.set('q', q)
  if (status) params.set('status', status)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, q, status],
    queryFn: () => apiGet<Page<User>>(`/users?${params.toString()}`),
  })

  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roleCode: '',
  })
  const create = useMutation({
    mutationFn: () =>
      apiPost('/users', {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        roleCode: form.roleCode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      setForm({ username: '', firstName: '', lastName: '', email: '', phone: '', password: '', roleCode: '' })
      toast.success('Utilisateur créé')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        subtitle="Comptes du personnel et contrôle d’accès"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Comptes au total" value={data?.totalElements ?? '—'} icon={<UsersIcon className="h-5 w-5" />} tone="brand" sub="selon les filtres" />
        <StatCard label="Actifs" value={data?.content.filter((u) => u.enabled).length ?? '—'} icon={<UserCheck className="h-5 w-5" />} tone="emerald" sub="sur la page affichée" />
        <StatCard label="Permissions cumulées" value={data?.content.reduce((s, u) => s + u.permissions.length, 0) ?? '—'} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" sub="sur la page affichée" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); setPage(0) }}
            placeholder="Rechercher par nom, identifiant ou email…"
            className="min-w-56 flex-1"
          />
          <div className="w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="DISABLED">Désactivé</option>
              <option value="LOCKED">Verrouillé</option>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState title="Aucun utilisateur" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Identifiant</Th>
                  <Th>Nom</Th>
                  <Th>Email / Téléphone</Th>
                  <Th>Rôles</Th>
                  <Th>Permissions</Th>
                  <Th>Statut</Th>
                  <Th>Dernière connexion</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50/60">
                    <Td className="font-mono font-medium text-brand-700">{u.username}</Td>
                    <Td>{u.lastName} {u.firstName}</Td>
                    <Td>{u.email || u.phone || '—'}</Td>
                    <Td>
                      {u.roles.map((r) => (
                        <Badge key={r} tone="slate" className="mr-1">{r}</Badge>
                      ))}
                    </Td>
                    <Td className="text-xs text-slate-500">{u.permissions.length} perm.</Td>
                    <Td>{u.enabled ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Désactivé</Badge>}</Td>
                    <Td>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel utilisateur">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
          {create.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(create.error)}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Identifiant">
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label="Rôle">
              <Select value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>
                <option value="">— Choisir —</option>
                <option value="SUPER_ADMIN">Super admin</option>
                <option value="TAX_AGENT">Agent des impôts</option>
                <option value="COLLECTION_AGENT">Agent de recouvrement</option>
                <option value="ACCOUNTANT">Comptable</option>
                <option value="TAXPAYER">Contribuable</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Nom">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Mot de passe initial">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || !form.username || !form.password || !form.roleCode}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
