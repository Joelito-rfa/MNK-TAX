import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, UserCog } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPut } from '../lib/api'
import type { Role } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

export default function Roles() {
  const [selected, setSelected] = useState<Role | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<Role[]>('/roles'),
  })

  const save = useMutation({
    mutationFn: () => apiPut(`/roles/${selected!.id}/permissions`, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setSelected(null)
      toast.success('Permissions mises à jour')
    },
  })

  const openRole = (role: Role) => {
    setSelected(role)
    setDraft([...role.permissions])
  }

  const allPermissions = [...new Set((data ?? []).flatMap((r) => r.permissions))].sort()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles et permissions"
        subtitle="Définition des profils et des droits d’accès"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Rôles définis" value={data?.length ?? '—'} icon={<UserCog className="h-5 w-5" />} tone="brand" sub="profils d’accès" />
        <StatCard label="Permissions distinctes" value={allPermissions.length} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" sub="utilisables" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Aucun rôle" />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Code</Th>
                <Th>Nom</Th>
                <Th>Description</Th>
                <Th>Système</Th>
                <Th>Permissions</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50/60">
                  <Td className="font-mono font-medium text-brand-700">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td className="max-w-56 truncate text-sm text-slate-500">{r.description || '—'}</Td>
                  <Td>{r.system ? <Badge tone="blue">Système</Badge> : <Badge>Personnalisé</Badge>}</Td>
                  <Td className="text-sm text-slate-600">{r.permissions.length}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => openRole(r)} disabled={r.system}>
                      {r.system ? 'Verrouillé' : 'Éditer'}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Permissions — ${selected?.name ?? ''}`} wide>
        {selected && (
          <div className="space-y-4">
            {save.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(save.error)}
              </div>
            )}
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Les rôles système ({selected.system}) ne peuvent pas être modifiés ; ce rôle est éditable.
            </div>
            <div className="relative">
              <Input
                placeholder="Filtrer les permissions…"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase()
                  document.querySelectorAll<HTMLElement>('[data-perm]').forEach((el) => {
                    el.style.display = q ? (el.dataset.perm!.toLowerCase().includes(q) ? '' : 'none') : ''
                  })
                }}
              />
            </div>
            <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {allPermissions.map((p) => {
                const checked = draft.includes(p)
                return (
                  <label
                    key={p}
                    data-perm={p}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDraft(checked ? draft.filter((x) => x !== p) : [...draft, p])}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-sm text-slate-500">{draft.length} permission(s) sélectionnée(s)</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Annuler</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
