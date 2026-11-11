import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Copy, Plus, Shield, Users, Key, Trash2, Pencil } from 'lucide-react'
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
import { useI18n } from '../lib/i18n'
import RowActionPortal from '../components/RowActionPortal'
import { ExportButton } from '../components/ExportButton'

/* ─────────── Catégories de permissions ───────────
 * Liste alignée sur le catalogue applicatif (Permissions.java / table `permissions`).
 * Toute permission absente de la base est ignorée à l'affichage (voir availablePermissions).
 */

const permCategories: Record<string, string[]> = {
  'roles.page.cat.taxpayers': ['TAXPAYER_READ', 'TAXPAYER_WRITE', 'TAXPAYER_DELETE', 'TAXPAYER_EXPORT', 'TAXPAYER_VIEW_HISTORY', 'TAXPAYER_SUSPEND', 'TAXPAYER_CLOSE'],
  'roles.page.cat.declarations': ['DECLARATION_READ', 'DECLARATION_CREATE', 'DECLARATION_UPDATE', 'DECLARATION_WRITE', 'DECLARATION_SUBMIT', 'DECLARATION_REVIEW', 'DECLARATION_VALIDATE', 'DECLARATION_REJECT', 'DECLARATION_CORRECT', 'DECLARATION_CANCEL', 'DECLARATION_EXPORT', 'DECLARATION_ATTACH'],
  'roles.page.cat.debts': ['DEBT_READ', 'DEBT_CREATE', 'DEBT_WRITE', 'DEBT_DELETE', 'DEBT_RECALCULATE', 'DEBT_SUSPEND', 'DEBT_CLOSE', 'DEBT_EXPORT', 'DEBT_DETECT_ARREARS', 'DEBT_ASSIGN_RECOVERY', 'DEBT_VIEW_HISTORY'],
  'roles.page.cat.payments': ['PAYMENT_READ', 'PAYMENT_WRITE', 'PAYMENT_CONFIRM', 'PAYMENT_ALLOCATE', 'PAYMENT_CANCEL', 'PAYMENT_REFUND', 'PAYMENT_EXPORT', 'PAYMENT_RECONCILE', 'PAYMENT_VIEW_HISTORY'],
  'roles.page.cat.receipts': ['RECEIPT_READ', 'RECEIPT_GENERATE', 'RECEIPT_DOWNLOAD', 'RECEIPT_VERIFY', 'RECEIPT_CANCEL', 'RECEIPT_REPLACE', 'RECEIPT_REFUND', 'RECEIPT_EXPORT', 'RECEIPT_VIEW_HISTORY'],
  'roles.page.cat.collection': ['COLLECTION_READ', 'COLLECTION_WRITE'],
  'roles.page.cat.messages': ['MESSAGE_READ', 'MESSAGE_WRITE', 'MESSAGE_MANAGE', 'MESSAGE_DELETE'],
  'roles.page.cat.controls': ['CONTROL_READ', 'CONTROL_WRITE'],
  'roles.page.cat.complaints': ['COMPLAINT_READ', 'COMPLAINT_WRITE'],
  'roles.page.cat.refunds': ['REFUND_READ', 'REFUND_WRITE'],
  'roles.page.cat.deadlines': ['DEADLINE_READ', 'DEADLINE_WRITE', 'OBLIGATION_READ', 'OBLIGATION_WRITE'],
  'roles.page.cat.rules': ['RULE_READ', 'RULE_WRITE', 'TAX_RULE_HISTORY'],
  'roles.page.cat.taxonomy': ['TAXONOMY_READ', 'TAXONOMY_WRITE'],
  'roles.page.cat.assessments': ['ASSESSMENT_READ', 'ASSESSMENT_WRITE'],
  'roles.page.cat.reports': ['REPORT_READ', 'REPORT_EXPORT', 'REPORT_FINANCIAL', 'REPORT_TAX', 'REPORT_RECOVERY'],
  'roles.page.cat.administration': ['USER_READ', 'USER_WRITE', 'USER_DISABLE', 'USER_RESET_PASSWORD', 'ROLE_READ', 'ROLE_WRITE', 'ROLE_ASSIGN', 'PERMISSION_READ', 'PARAMETER_READ', 'PARAMETER_WRITE', 'SYSTEM_SETTINGS_READ', 'SYSTEM_SETTINGS_UPDATE'],
  'roles.page.cat.audit': ['AUDIT_READ', 'NOTIFICATION_READ'],
}

/* ─────────── Main component ─────────── */

export default function Roles() {
  const { can } = useAuth()
  const { t, has } = useI18n()
  const [selected, setSelected] = useState<Role | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [permFilter, setPermFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [duplicateRole, setDuplicateRole] = useState<Role | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()
  const roleName = (r: Role) => (has(`role.${r.code}`) ? t(`role.${r.code}`) : r.name)

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
      toast.success(t('roles.page.saveDone'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const deleteRole = useMutation({
    mutationFn: (id: number) => apiDelete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(t('roles.page.deleted'))
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
    <div className="fx-simple space-y-6">
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.page.subtitle')}
        actions={
          <>
            <ExportButton
              filenameBase={`roles_${new Date().toISOString().slice(0, 10)}`}
              title={t('roles.title')}
              headers={[
                t('common.code'),
                t('common.name'),
                t('common.description'),
                t('common.type'),
                t('roles.page.permissions'),
                t('users.title'),
              ]}
              rows={() =>
                filteredRoles.map((r) => [
                  r.code,
                  roleName(r),
                  r.description || '—',
                  r.system ? t('roles.page.system') : t('roles.page.custom'),
                  r.permissions.length,
                  usersByRole[r.code] ?? 0,
                ])
              }
            />
            {can('ROLE_WRITE') && can('ROLE_ASSIGN') && (
              <Button onClick={() => { setDuplicateRole(null); setCreateOpen(true) }}>
                <Plus className="h-4 w-4" /> {t('roles.page.new')}
              </Button>
            )}
          </>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card hover style={{ animationDelay: '0s' }} className="group flex animate-fade-in items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.system}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('roles.page.systemRoles')}</p>
          </div>
        </Card>
        <Card hover style={{ animationDelay: '0.08s' }} className="group flex animate-fade-in items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.custom}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('roles.page.customRoles')}</p>
          </div>
        </Card>
        <Card hover style={{ animationDelay: '0.16s' }} className="group flex animate-fade-in items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{usersPage?.totalElements ?? '—'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('users.title')}</p>
          </div>
        </Card>
        <Card hover style={{ animationDelay: '0.24s' }} className="group flex animate-fade-in items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Key className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalPerms}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('roles.page.permissions')}</p>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700/50">
          <SearchInput value={search} onChange={setSearch} placeholder={t('roles.page.searchPlaceholder')} className="w-64" />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-44">
            <option value="">{t('roles.page.allTypes')}</option>
            <option value="system">{t('roles.page.system')}</option>
            <option value="custom">{t('roles.page.custom')}</option>
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !filteredRoles || filteredRoles.length === 0 ? (
          <EmptyState title={t('roles.page.emptyTitle')} subtitle={t('roles.page.emptySubtitle')} />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
              <tr>
                <Th>{t('common.code')}</Th>
                <Th>{t('common.name')}</Th>
                <Th>{t('common.description')}</Th>
                <Th>{t('common.type')}</Th>
                <Th>{t('roles.page.permissions')}</Th>
                <Th>{t('users.title')}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filteredRoles.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <Td className="font-mono font-medium text-brand-700">{r.code}</Td>
                  <Td>{roleName(r)}</Td>
                  <Td className="max-w-56 truncate text-sm text-slate-500 dark:text-slate-400">{r.description || '—'}</Td>
                  <Td>{r.system ? <Badge tone="blue">{t('roles.page.system')}</Badge> : <Badge>{t('roles.page.custom')}</Badge>}</Td>
                  <Td className="text-sm text-slate-600 dark:text-slate-400">{r.permissions.length}</Td>
                  <Td className="text-sm text-slate-600 dark:text-slate-400">{usersByRole[r.code] ?? 0}</Td>
                  <Td>
                    <RowActionPortal>
                              <button
                                onClick={() => { openRole(r) }}
                                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                disabled={r.system}
                              >
                                <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {r.system ? t('roles.page.locked') : t('roles.page.edit')}
                              </button>
                              {!r.system && can('ROLE_WRITE') && can('ROLE_ASSIGN') && (
                                <>
                                  <button
                                    onClick={() => { openRoleForDuplication(r) }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Copy className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('roles.page.duplicate')}
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                  <button
                                    onClick={() => { if (window.confirm(t('roles.page.confirmDelete', { code: r.code }))) { deleteRole.mutate(r.id) } }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                  >
                                    <Trash2 className="h-4 w-4 shrink-0" /> {t('roles.page.delete')}
                                  </button>
                                </>
                              )}
                    </RowActionPortal>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal permissions groupées */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('roles.page.permissionsTitle', { name: selected ? roleName(selected) : '' })} wide>
        {selected && (
          <div className="space-y-4">
            {save.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(save.error)}
              </div>
            )}
            <div className="relative">
              <Input
                placeholder={t('roles.page.filterPermissions')}
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
                    category={t(cat)}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('roles.page.selected', { count: draft.length })}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>{t('common.cancel')}</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>{t('common.save')}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création / duplication */}
      {createOpen && (
        <CreateRoleModal
          allPermissions={allPermissions}
          initial={duplicateRole ? { code: duplicateRole.code + '_COPY', name: duplicateRole.name + ' ' + t('roles.page.copySuffix'), description: duplicateRole.description, permissions: [...duplicateRole.permissions] } : undefined}
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
  const { t } = useI18n()
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
          {t('roles.page.all')}
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
  const [step, setStep] = useState(0)
  const { t } = useI18n()
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
      toast.success(initial ? t('roles.page.create.duplicated') : t('roles.page.create.created'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const filtered = filter.trim()
    ? allPermissions.filter((p) => p.toLowerCase().includes(filter.toLowerCase()))
    : allPermissions

  const step0Valid = !!form.code.trim()
  const step1Valid = perms.length > 0
  const subtitles = initial
    ? [t('roles.page.create.subtitle.duplicated'), t('roles.page.create.subtitle.permissions'), t('roles.page.create.subtitle.summary')]
    : [t('roles.page.create.subtitle.info'), t('roles.page.create.subtitle.permissions'), t('roles.page.create.subtitle.summary')]
  const baseTitle = initial ? t('roles.page.create.duplicateTitle', { name: initial.name }) : t('roles.page.create.newTitle')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 0 && step0Valid) { setStep(1); return }
    if (step === 1 && step1Valid) { setStep(2); return }
    if (step === 2) create.mutate()
  }

  return (
    <Modal open onClose={onClose} title={t('roles.page.create.title', { step: step + 1, title: baseTitle })} subtitle={subtitles[step]} size="full">
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wide">
            {[t('roles.page.create.step.info'), t('roles.page.create.step.permissions'), t('roles.page.create.step.summary')].map((label, i) => (
              <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>{label}</span>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('roles.page.create.code')}>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder={t('roles.page.create.codePlaceholder')}
                />
              </Field>
              <Field label={t('roles.page.create.name')}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('roles.page.create.namePlaceholder')} />
              </Field>
            </div>
            <Field label={t('roles.page.create.description')}>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            {!step0Valid && (
              <p className="text-xs text-slate-400">{t('roles.page.create.codeRequired')}</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('roles.page.create.permissionsCount', { count: perms.length })}</p>
              <div className="flex items-center gap-2">
                {perms.length > 0 && (
                  <button type="button" onClick={() => setPerms([])} className="text-xs font-medium text-slate-500 hover:text-rose-600">
                    {t('roles.page.create.deselectAll')}
                  </button>
                )}
                <div className="w-48">
                  <Input placeholder={t('roles.page.create.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
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
                <p className="col-span-full py-4 text-center text-sm text-slate-500">{t('roles.page.create.noPermission')}</p>
              )}
            </div>
            {!step1Valid && (
              <p className="text-xs text-slate-400">{t('roles.page.create.selectAtLeast')}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('roles.page.create.summary')}</h4>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('common.code')}</span><span className="font-mono font-medium text-slate-900 dark:text-slate-100">{form.code || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('common.name')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{form.name || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('common.description')}</span><span className="max-w-72 truncate font-medium text-slate-900 dark:text-slate-100">{form.description || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('roles.page.permissions')}</span><span className="font-semibold text-violet-600 dark:text-violet-400">{t('roles.page.create.selectedCount', { count: perms.length })}</span></div>
              {perms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {perms.slice(0, 12).map((p) => (
                    <span key={p} className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">{p}</span>
                  ))}
                  {perms.length > 12 && (
                    <span className="px-1 text-[11px] text-slate-400">{t('roles.page.create.more', { count: perms.length - 12 })}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>
            {step > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>{t('roles.page.create.back')}</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            {step < 2 ? (
              <Button type="submit" disabled={(step === 0 && !step0Valid) || (step === 1 && !step1Valid)}>
                {t('roles.page.create.next')}
              </Button>
            ) : (
              <Button type="submit" disabled={create.isPending || !step0Valid || !step1Valid}>{initial ? t('roles.page.create.duplicate') : t('roles.page.create.create')}</Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
