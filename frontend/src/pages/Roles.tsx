import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Shield, Users, Key, ChevronDown, ChevronRight } from 'lucide-react'
import { apiErrorMessage, apiGet, apiDelete, apiPost, apiPut } from '../lib/api'
import type { Role, Page, User } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'

/* ─────────── Catégories de permissions ─────────── */

const permCategories: Record<string, string[]> = {
  'Contribuables': ['TAXPAYER_READ', 'TAXPAYER_WRITE', 'TAXPAYER_DELETE', 'TAXPAYER_EXPORT', 'TAXPAYER_VIEW_HISTORY', 'TAXPAYER_SUSPEND', 'TAXPAYER_CLOSE'],
  'Déclarations': ['DECLARATION_READ', 'DECLARATION_CREATE', 'DECLARATION_UPDATE', 'DECLARATION_WRITE', 'DECLARATION_SUBMIT', 'DECLARATION_REVIEW', 'DECLARATION_VALIDATE', 'DECLARATION_REJECT', 'DECLARATION_CORRECT', 'DECLARATION_CANCEL', 'DECLARATION_EXPORT', 'DECLARATION_ATTACH'],
  'Créances': ['DEBT_READ', 'DEBT_CREATE', 'DEBT_WRITE', 'DEBT_UPDATE', 'DEBT_DELETE', 'DEBT_RECALCULATE', 'DEBT_SUSPEND', 'DEBT_CLOSE', 'DEBT_CANCEL', 'DEBT_EXPORT', 'DEBT_DETECT_ARREARS', 'DEBT_ASSIGN_RECOVERY', 'DEBT_VIEW_HISTORY'],
  'Paiements': ['PAYMENT_READ', 'PAYMENT_CREATE', 'PAYMENT_WRITE', 'PAYMENT_CONFIRM', 'PAYMENT_ALLOCATE', 'PAYMENT_CANCEL', 'PAYMENT_REFUND', 'PAYMENT_EXPORT', 'PAYMENT_RECONCILE', 'PAYMENT_VIEW_HISTORY'],
  'Quittances': ['RECEIPT_READ', 'RECEIPT_GENERATE', 'RECEIPT_CREATE', 'RECEIPT_DOWNLOAD', 'RECEIPT_VERIFY', 'RECEIPT_CANCEL', 'RECEIPT_REPLACE', 'RECEIPT_REFUND', 'RECEIPT_EXPORT', 'RECEIPT_VIEW_HISTORY'],
  'Recouvrement': ['COLLECTION_READ', 'COLLECTION_WRITE'],
  'Messages': ['MESSAGE_READ', 'MESSAGE_WRITE', 'MESSAGE_MANAGE', 'MESSAGE_DELETE'],
  'Contrôles fiscaux': ['CONTROL_READ', 'CONTROL_WRITE'],
  'Réclamations': ['COMPLAINT_READ', 'COMPLAINT_WRITE'],
  'Remboursements': ['REFUND_READ', 'REFUND_WRITE'],
  'Calendrier / Obligations': ['DEADLINE_READ', 'DEADLINE_WRITE', 'OBLIGATION_READ', 'OBLIGATION_WRITE'],
  'Règles fiscales': ['RULE_READ', 'RULE_WRITE', 'TAX_RULE_HISTORY'],
  'Référentiels': ['TAXONOMY_READ', 'TAXONOMY_WRITE'],
  'Impositions': ['ASSESSMENT_READ', 'ASSESSMENT_WRITE'],
  'Rapports': ['REPORT_READ', 'REPORT_EXPORT', 'REPORT_FINANCIAL', 'REPORT_TAX', 'REPORT_RECOVERY'],
  'Administration': ['USER_READ', 'USER_CREATE', 'USER_WRITE', 'USER_DISABLE', 'USER_RESET_PASSWORD', 'ROLE_READ', 'ROLE_CREATE', 'ROLE_WRITE', 'ROLE_DELETE', 'ROLE_ASSIGN', 'PERMISSION_READ', 'PARAMETER_READ', 'PARAMETER_WRITE', 'SYSTEM_SETTINGS_READ', 'SYSTEM_SETTINGS_UPDATE'],
  'Audit': ['AUDIT_READ', 'NOTIFICATION_READ'],
}

/* ─────────── Main component ─────────── */

export default function Roles() {
  const { can } = useAuth()
  const [selected, setSelected] = useState<Role | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [permFilter, setPermFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [duplicateRole, setDuplicateRole] = useState<Role | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<Role[]>('/roles'),
  })

  const { data: usersPage } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiGet<Page<User>>('/users?page=0&size=200'),
  })

  const allPermissions = useMemo(
    () => [...new Set((roles ?? []).flatMap((r) => r.permissions))].sort(),
    [roles],
  )

  const stats = useMemo(() => {
    if (!roles) return { system: 0, custom: 0, totalPerms: allPermissions.length }
    return {
      system: roles.filter((r) => r.system).length,
      custom: roles.filter((r) => !r.system).length,
      totalPerms: allPermissions.length,
    }
  }, [roles, allPermissions])

  const usersByRole = useMemo(() => {
    if (!usersPage) return {} as Record<string, number>
    const map: Record<string, number> = {}
    usersPage.content.forEach((u) => {
      u.roles?.forEach((r: string) => {
        map[r] = (map[r] ?? 0) + 1
      })
    })
    return map
  }, [usersPage])

  const filteredRoles = useMemo(() => {
    if (!roles) return []
    return roles.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        if (!r.code.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q)) return false
      }
      if (filterType === 'system' && !r.system) return false
      if (filterType === 'custom' && r.system) return false
      return true
    })
  }, [roles, search, filterType])

  const save = useMutation({
    mutationFn: () => apiPut(`/roles/${selected!.id}/permissions`, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setSelected(null)
      toast.success('Permissions mises à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const deleteRole = useMutation({
    mutationFn: (id: number) => apiDelete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Rôle supprimé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const openRole = (role: Role) => {
    setSelected(role)
    setDraft([...role.permissions])
    setPermFilter('')
  }

  const openRoleForDuplication = (role: Role) => {
    setDuplicateRole(role)
    setCreateOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles et permissions"
        subtitle="Centre de gouvernance des accès"
        actions={
          can('ROLE_WRITE') && (
            <Button onClick={() => { setDuplicateRole(null); setCreateOpen(true) }}>
              <Plus className="h-4 w-4" /> Nouveau rôle
            </Button>
          )
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.system}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Rôles système</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.custom}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Rôles personnalisés</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{usersPage?.totalElements ?? '—'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Utilisateurs</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Key className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalPerms}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Permissions</p>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700/50">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un rôle..." className="w-64" />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-44">
            <option value="">Tous les types</option>
            <option value="system">Système</option>
            <option value="custom">Personnalisé</option>
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !filteredRoles || filteredRoles.length === 0 ? (
          <EmptyState title="Aucun rôle" subtitle="Créez un nouveau rôle pour commencer." />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
              <tr>
                <Th>Code</Th>
                <Th>Nom</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Permissions</Th>
                <Th>Utilisateurs</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filteredRoles.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <Td className="font-mono font-medium text-brand-700">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td className="max-w-56 truncate text-sm text-slate-500 dark:text-slate-400">{r.description || '—'}</Td>
                  <Td>{r.system ? <Badge tone="blue">Système</Badge> : <Badge>Personnalisé</Badge>}</Td>
                  <Td className="text-sm text-slate-600 dark:text-slate-400">{r.permissions.length}</Td>
                  <Td className="text-sm text-slate-600 dark:text-slate-400">{usersByRole[r.code] ?? 0}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openRole(r)} disabled={r.system}>
                        {r.system ? 'Verrouillé' : 'Éditer'}
                      </Button>
                      {!r.system && can('ROLE_WRITE') && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openRoleForDuplication(r)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm(`Supprimer le rôle ${r.code} ?`)) {
                                deleteRole.mutate(r.id)
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal permissions groupées */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Permissions — ${selected?.name ?? ''}`} wide>
        {selected && (
          <div className="space-y-4">
            {save.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(save.error)}
              </div>
            )}
            <div className="relative">
              <Input
                placeholder="Filtrer les permissions…"
                value={permFilter}
                onChange={(e) => setPermFilter(e.target.value)}
              />
            </div>
            <div className="max-h-[32rem] space-y-3 overflow-y-auto">
              {Object.entries(permCategories).map(([cat, catPerms]) => {
                const available = catPerms.filter((p) => allPermissions.includes(p))
                if (available.length === 0) return null
                const filtered = permFilter
                  ? available.filter((p) => p.toLowerCase().includes(permFilter.toLowerCase()))
                  : available
                if (filtered.length === 0) return null
                const allChecked = filtered.every((p) => draft.includes(p))
                return (
                  <PermCategoryGroup
                    key={cat}
                    category={cat}
                    permissions={filtered}
                    draft={draft}
                    allChecked={allChecked}
                    onToggle={(p) => setDraft(draft.includes(p) ? draft.filter((x) => x !== p) : [...draft, p])}
                    onToggleAll={() => {
                      if (allChecked) {
                        setDraft(draft.filter((p) => !filtered.includes(p)))
                      } else {
                        const merged = [...new Set([...draft, ...filtered])]
                        setDraft(merged)
                      }
                    }}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">{draft.length} permission(s) sélectionnée(s)</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Annuler</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création / duplication */}
      {createOpen && (
        <CreateRoleModal
          allPermissions={allPermissions}
          initial={duplicateRole ? { code: duplicateRole.code + '_COPY', name: duplicateRole.name + ' (copie)', description: duplicateRole.description, permissions: [...duplicateRole.permissions] } : undefined}
          onClose={() => {
            setCreateOpen(false)
            setDuplicateRole(null)
            queryClient.invalidateQueries({ queryKey: ['roles'] })
          }}
        />
      )}
    </div>
  )
}

/* ─────────── Permission Category Group ─────────── */

function PermCategoryGroup({
  category,
  permissions,
  draft,
  allChecked,
  onToggle,
  onToggleAll,
}: {
  category: string
  permissions: string[]
  draft: string[]
  allChecked: boolean
  onToggle: (p: string) => void
  onToggleAll: () => void
}) {
  const [open, setOpen] = useState(true)
  const checkedCount = permissions.filter((p) => draft.includes(p)).length

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <span>{category}</span>
          <span className="text-xs text-slate-400">({checkedCount}/{permissions.length})</span>
        </div>
        <label
          className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={allChecked}
            onChange={onToggleAll}
            className="h-3.5 w-3.5 accent-brand-600"
          />
          Tout
        </label>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-0.5 border-t border-slate-100 px-4 py-2 dark:border-slate-700/50 sm:grid-cols-2">
          {permissions.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <input
                type="checkbox"
                checked={draft.includes(p)}
                onChange={() => onToggle(p)}
                className="h-4 w-4 accent-brand-600"
              />
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{p}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────── Création de rôle ─────────── */

function CreateRoleModal({
  allPermissions,
  initial,
  onClose,
}: {
  allPermissions: string[]
  initial?: { code: string; name: string; description: string; permissions: string[] }
  onClose: () => void
}) {
  const [form, setForm] = useState({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    description: initial?.description ?? '',
  })
  const [perms, setPerms] = useState<string[]>(initial?.permissions ?? [])
  const [filter, setFilter] = useState('')
  const toast = useToast()

  const create = useMutation({
    mutationFn: () =>
      apiPost('/roles', {
        code: form.code,
        name: form.name || undefined,
        description: form.description || undefined,
        permissions: perms,
      }),
    onSuccess: () => {
      onClose()
      toast.success(initial ? 'Rôle dupliqué' : 'Rôle créé')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const filtered = filter.trim()
    ? allPermissions.filter((p) => p.toLowerCase().includes(filter.toLowerCase()))
    : allPermissions

  return (
    <Modal open onClose={onClose} title={initial ? `Dupliquer — ${initial.name}` : 'Nouveau rôle'} wide>
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate() }}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Code (A-Z, chiffres, _)">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="ex : AUDITOR"
            />
          </Field>
          <Field label="Nom affiché">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex : Auditeur" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Permissions ({perms.length})</p>
            <div className="w-48">
              <Input placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>
          <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-100 p-2 dark:border-slate-700/50 sm:grid-cols-2">
            {filtered.map((p) => {
              const checked = perms.includes(p)
              return (
                <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setPerms(checked ? perms.filter((x) => x !== p) : [...perms, p])}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="font-mono text-xs">{p}</span>
                </label>
              )
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-4 text-center text-sm text-slate-500">Aucune permission ne correspond.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={create.isPending || !form.code.trim()}>{initial ? 'Dupliquer' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}
