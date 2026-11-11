import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  Key,
  Lock,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  Users as UsersIcon,
  X,
  Activity,
  UserCheck,
  UserX,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiDelete, apiPatch, apiPost, apiPut } from '../lib/api'
import { ExportButton } from '../components/ExportButton'
import { fmtDateTime } from '../lib/format'
import { UserAvatar } from '../components/UserAvatar'
import type { Page, Role, User as UserType } from '../types'
import { Button, Card, EmptyState } from '../components/ui'
import RowActionPortal from '../components/RowActionPortal'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'


/* ═══════════════════════════ Constantes ═══════════════════════════ */

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  SUPER_ADMIN: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: <Shield className="h-4 w-4" /> },
  ADMIN: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', icon: <ShieldCheck className="h-4 w-4" /> },
  TAX_AGENT: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: <FileText className="h-4 w-4" /> },
  COLLECTION_AGENT: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: <Activity className="h-4 w-4" /> },
  ACCOUNTANT: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: <BarChart3 className="h-4 w-4" /> },
  TAXPAYER: { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', icon: <User className="h-4 w-4" /> },
}

const ROLE_CODES = ['SUPER_ADMIN', 'ADMIN', 'TAX_AGENT', 'COLLECTION_AGENT', 'ACCOUNTANT', 'TAXPAYER']

const STATUS_OPTIONS = [
  { id: 'all', labelKey: 'users.page.filter.allStatuses' },
  { id: 'active', labelKey: 'users.page.filter.active' },
  { id: 'inactive', labelKey: 'users.page.filter.inactive' },
]

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function timeAgo(iso: string | null | undefined, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!iso) return t('users.page.lastLogin.never')
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('users.page.lastLogin.now')
  if (mins < 60) return t('users.page.lastLogin.minutes', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('users.page.lastLogin.hours', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('users.page.lastLogin.days', { count: days })
  return fmtDateTime(iso)
}

function getStatusInfo(u: UserType, t: (key: string) => string): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (!u.enabled) return { label: t('users.page.status.disabled'), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: <UserX className="h-3.5 w-3.5" /> }
  return { label: t('users.page.status.active'), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <UserCheck className="h-3.5 w-3.5" /> }
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function Users() {
  const { can } = useAuth()
  const { t, has } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roleLabel = (code?: string) => (code ? (has(`role.${code}`) ? t(`role.${code}`) : code) : '--')

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [pageSize, setPageSize] = useState(25)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserType | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null)
  const [permissionsUser, setPermissionsUser] = useState<UserType | null>(null)
  const [resetUser, setResetUser] = useState<UserType | null>(null)

  /* -- Queries -- */
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<Page<UserType>>('/users?size=9999'),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<Role[]>('/roles'),
  })

  /* -- Stats -- */
  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, waiting: 0, disabled: 0 }
    const users = data.content
    return {
      total: users.length,
      active: users.filter((u) => u.enabled).length,
      waiting: 0,
      disabled: users.filter((u) => !u.enabled).length,
    }
  }, [data])

  /* -- Role distribution -- */
  const roleDistribution = useMemo(() => {
    if (!data) return []
    const counts: Record<string, number> = {}
    data.content.forEach((u) => {
      u.roles.forEach((r) => { counts[r] = (counts[r] ?? 0) + 1 })
    })
    return ROLE_CODES.map((code) => ({
      code, label: roleLabel(code), count: counts[code] ?? 0, ...(ROLE_COLORS[code] ?? ROLE_COLORS.ADMIN),
    }))
  }, [data])

  /* -- Filtered users -- */
  const filteredUsers = useMemo(() => {
    if (!data) return []
    let result = data.content

    if (filterRole !== 'all') {
      result = result.filter((u) => u.roles.includes(filterRole))
    }
    if (filterStatus === 'active') result = result.filter((u) => u.enabled)
    else if (filterStatus === 'inactive') result = result.filter((u) => !u.enabled)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) => u.username.toLowerCase().includes(q)
          || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
          || u.email?.toLowerCase().includes(q)
          || u.phone?.toLowerCase().includes(q),
      )
    }
    return result
  }, [data, filterRole, filterStatus, search])

  const pagedUsers = useMemo(() => filteredUsers.slice(0, pageSize), [filteredUsers, pageSize])

  /** Lignes d'export : les utilisateurs filtrés (la liste complète est déjà chargée). */
  const exportUserRows = () =>
    filteredUsers.map((u) => [
      u.username, u.lastName, u.firstName, u.email, u.phone,
      u.roles.join(' / '), u.enabled ? t('users.page.status.active') : t('users.page.status.disabled'), u.lastLoginAt ?? '',
    ])

  /* -- Mutations -- */
  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiPatch(`/users/${id}/enabled?enabled=${enabled}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.page.toast.statusUpdated'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiDelete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteConfirm(null)
      toast.success(t('users.page.toast.deleted'))
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const resetFilters = useCallback(() => {
    setSearch('')
    setFilterRole('all')
    setFilterStatus('all')
  }, [])

  const hasActiveFilters = search || filterRole !== 'all' || filterStatus !== 'all'

  if (isLoading) return <UsersSkeleton />

  return (
    <div className="fx-simple space-y-6">
      {/* === 1. HEADER === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            {t('users.page.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('users.page.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExportButton
            filenameBase={`utilisateurs_${new Date().toISOString().slice(0, 10)}`}
            title={t('users.page.title')}
            headers={t('users.page.exportHeaders').split(',')}
            rows={exportUserRows}
          />
          <Button variant="secondary" size="md" onClick={() => navigate('/audit')}>
            <Activity className="h-4 w-4" />
            {t('users.page.audit')}
          </Button>
          {can('USER_WRITE') && (
            <button
              onClick={() => setCreateOpen(true)}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30"
            >
              <span className="absolute inset-0 bg-brand-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <Plus className="relative h-4 w-4" />
              <span className="relative">{t('users.page.new')}</span>
            </button>
          )}
        </div>
      </div>

      {/* === 2. KPI STATS === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="bg-violet-50" iconColor="text-violet-600"
          label={t('users.page.kpi.total')} value={stats.total} sub={t('users.page.kpi.totalSub')} style={{ animationDelay: '0s' }} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          label={t('users.page.kpi.active')} value={stats.active} sub={t('users.page.kpi.activeSub')}
          delta={t('users.page.kpi.activeDelta', { pct: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 })} deltaTone="up" style={{ animationDelay: '0.08s' }} />
        <StatCard icon={<Clock className="h-5 w-5" />} iconBg="bg-blue-50" iconColor="text-blue-600"
          label={t('users.page.kpi.waiting')} value={stats.waiting} sub={t('users.page.kpi.waitingSub')} style={{ animationDelay: '0.16s' }} />
        <StatCard icon={<Lock className="h-5 w-5" />} iconBg="bg-amber-50" iconColor="text-amber-600"
          label={t('users.page.kpi.disabled')} value={stats.disabled} sub={t('users.page.kpi.disabledSub')}
          delta={stats.disabled > 0 ? t('users.page.kpi.warning') : t('users.page.kpi.none')} deltaTone={stats.disabled > 0 ? 'down' : 'neutral'} style={{ animationDelay: '0.24s' }} />
      </div>

      {/* === 3. ROLE DISTRIBUTION === */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('users.page.roleDistribution')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {roleDistribution.map((role) => (
            <button
              key={role.code}
              onClick={() => setFilterRole(filterRole === role.code ? 'all' : role.code)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                filterRole === role.code
                  ? `${role.bg} ${role.text} shadow-sm`
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {role.icon}
              {role.label}
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                filterRole === role.code
                  ? 'bg-white/30 dark:bg-black/20'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {role.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* === 4. SEARCH AND FILTERS === */}
      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.page.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
            <Shield className="h-4 w-4 text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
              {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('users.page.reset')}
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-xs">{t('users.page.show')}</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs">{t('users.page.perPage')}</span>
          </div>
        </div>

        {/* === 5. USERS LIST === */}
        {pagedUsers.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<UsersIcon className="h-10 w-10" />} title={t('users.page.emptyTitle')}
              subtitle={search ? t('users.page.emptySearch', { q: search }) : t('users.page.emptySubtitle')} />
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" /> {t('users.page.resetFilters')}
              </Button>
              {can('USER_WRITE') && (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> {t('users.page.new')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pagedUsers.map((user) => {
              const status = getStatusInfo(user, t)
              const roleInfo = ROLE_COLORS[user.roles[0]] ?? ROLE_COLORS.ADMIN
              return (
                <div key={user.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  {/* Avatar + Nom */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                       <UserAvatar userId={user.id} name={`${user.firstName} ${user.lastName}`} hasAvatar={user.hasAvatar} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {user.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email / Tel */}
                  <div className="hidden md:block min-w-0">
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">{user.email || '--'}</p>
                    {user.phone && (
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user.phone}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div className="hidden lg:block">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${roleInfo.bg} ${roleInfo.text}`}>
                      {roleInfo.icon}
                      {roleLabel(user.roles[0])}
                    </span>
                  </div>

                  {/* Permissions count */}
                  <div className="hidden xl:block">
                    <button onClick={() => setPermissionsUser(user)}
                      className="text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition">
                      {t('users.page.permissions', { count: user.permissions.length })}
                    </button>
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.bg} ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  {/* Last login */}
                  <div className="hidden lg:block text-right min-w-[100px]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(user.lastLoginAt, t)}</p>
                  </div>

                  {/* Actions */}
                  {can('USER_WRITE') && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => setSelectedUser(user)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
                        title={t('users.page.action.view')}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <RowActionPortal>
                        <MenuItem icon={<Eye className="h-4 w-4" />} label={t('users.page.action.view')}
                          onClick={() => { setSelectedUser(user) }} />
                        <MenuItem icon={<Edit3 className="h-4 w-4" />} label={t('users.page.action.edit')}
                          onClick={() => { setEditUser(user) }} />
                        <MenuItem icon={<Shield className="h-4 w-4" />} label={t('users.page.action.roles')}
                          onClick={() => { setPermissionsUser(user) }} />
                        <MenuItem icon={<Key className="h-4 w-4" />} label={t('users.page.action.reset')}
                          onClick={() => { setResetUser(user) }} />
                        <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                        <MenuItem
                          icon={user.enabled ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          label={user.enabled ? t('users.page.action.disable') : t('users.page.action.enable')}
                          onClick={() => { toggleEnabled.mutate({ id: user.id, enabled: !user.enabled }) }}
                          danger={user.enabled} />
                        {!user.roles.includes('SUPER_ADMIN') && (
                          <MenuItem icon={<Trash2 className="h-4 w-4" />} label={t('users.page.action.delete')}
                            onClick={() => { setDeleteConfirm(user) }} danger />
                        )}
                      </RowActionPortal>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {pagedUsers.length > 0 && (
          <div className="border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {search
                ? t('users.page.countSearch', { count: filteredUsers.length, q: search })
                : t('users.page.count', { count: filteredUsers.length })}
            </p>
          </div>
        )}
      </Card>

      {/* === MODALS === */}
      {selectedUser && <UserProfilePanel user={selectedUser} onClose={() => setSelectedUser(null)} onEdit={(u) => { setSelectedUser(null); setEditUser(u) }} onManageAccess={(u) => { setSelectedUser(null); setPermissionsUser(u) }} />}
      {permissionsUser && <PermissionsPanel user={permissionsUser} roles={roles ?? []} onClose={() => setPermissionsUser(null)} />}
      {createOpen && <CreateUserModal roles={roles ?? []} onClose={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }) }} />}
      {editUser && <EditUserModal user={editUser} roles={roles ?? []} onClose={() => { setEditUser(null); queryClient.invalidateQueries({ queryKey: ['users'] }) }} />}

      {/* RESET PASSWORD */}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('users.page.delete.title')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('users.page.delete.message', { username: deleteConfirm.username, name: `${deleteConfirm.firstName} ${deleteConfirm.lastName}`.trim() })}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={() => deleteUser.mutate(deleteConfirm.id)} loading={deleteUser.isPending}>{t('common.delete')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

function ResetPasswordModal({ user, onClose }: { user: UserType; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const [manualPassword, setManualPassword] = useState<string | null>(null)

  const reset = useMutation({
    mutationFn: () =>
      apiPost<{ delivery: 'EMAIL' | 'MANUAL'; temporaryPassword: string | null }>(
        `/users/${user.id}/reset-password`,
      ),
    onSuccess: (data) => {
      setSent(true)
      setManualPassword(data?.temporaryPassword ?? null)
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Key className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('users.page.reset.title')}</h3>
          {!sent ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('users.page.reset.intro', { username: user.username, email: user.email })}
            </p>
          ) : manualPassword ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('users.page.reset.manual')}
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
                <code className="flex-1 break-all font-mono text-sm text-slate-800 dark:text-slate-200">{manualPassword}</code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(manualPassword); toast.success(t('users.page.reset.copied')) }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title={t('users.page.reset.copy')}
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('users.page.reset.sent', { email: user.email })}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('users.page.reset.security')}
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          {!sent ? (
            <>
              <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={() => reset.mutate()} loading={reset.isPending}>{t('users.page.reset.submit')}</Button>
            </>
          ) : (
            <Button variant="primary" onClick={onClose}>{t('common.close')}</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value, sub, delta, deltaTone = 'neutral', style }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: React.ReactNode; sub: string; delta?: string; deltaTone?: 'up' | 'down' | 'neutral'; style?: React.CSSProperties
}) {
  return (
    <Card hover style={style} className="group relative overflow-hidden p-5 animate-fade-in">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-violet-400/10"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>{icon}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
            deltaTone === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : deltaTone === 'down' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {deltaTone === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {deltaTone === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500">{sub}</span>
      </div>
    </Card>
  )
}

function MenuItem({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}>
      <span className={`shrink-0 ${danger ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{icon}</span>
      {label}
    </button>
  )
}

/* -- User Profile Panel -- */
function UserProfilePanel({ user, onClose, onEdit, onManageAccess }: {
  user: UserType
  onClose: () => void
  onEdit: (u: UserType) => void
  onManageAccess: (u: UserType) => void
}) {
  const { t, has } = useI18n()
  const status = getStatusInfo(user, t)
  const roleInfo = ROLE_COLORS[user.roles[0]] ?? ROLE_COLORS.ADMIN
  const roleLabel = (code?: string) => (code ? (has(`role.${code}`) ? t(`role.${code}`) : code) : '--')
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
               <UserAvatar userId={user.id} name={`${user.firstName} ${user.lastName}`} hasAvatar={user.hasAvatar} size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{user.username}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleInfo.bg} ${roleInfo.text}`}>
                  {roleInfo.icon} {roleLabel(user.roles[0])}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.bg} ${status.color}`}>
                  {status.icon} {status.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Mail className="h-4 w-4" />} label={t('tp.email')} value={user.email || '--'} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label={t('tp.phone')} value={user.phone || '--'} />
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label={t('users.page.profile.created')} value={fmtDateTime(user.createdAt)} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label={t('users.page.profile.lastLogin')} value={timeAgo(user.lastLoginAt, t)} />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{t('users.page.profile.permissions', { count: user.permissions.length })}</p>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions.slice(0, 12).map((p) => (
                <span key={p} className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                  {p.replace('PERMISSION_', '')}
                </span>
              ))}
              {user.permissions.length > 12 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{t('users.page.profile.more', { count: user.permissions.length - 12 })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button variant="primary" size="sm" onClick={() => { onEdit(user) }}>
              <Edit3 className="h-3.5 w-3.5" /> {t('common.edit')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onManageAccess(user)}>
              <Shield className="h-3.5 w-3.5" /> {t('users.page.profile.manage')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  )
}

/* -- Permissions Panel -- */
function PermissionsPanel({ user, roles, onClose }: { user: UserType; roles: Role[]; onClose: () => void }) {
  const { t, has } = useI18n()
  const [searchPerm, setSearchPerm] = useState('')
  const role = roles.find((r) => r.code === user.roles[0])
  const allPerms = role?.permissions ?? user.permissions
  const filtered = searchPerm ? allPerms.filter((p) => p.toLowerCase().includes(searchPerm.toLowerCase())) : allPerms
  const roleLabel = (code?: string) => (code ? (has(`role.${code}`) ? t(`role.${code}`) : code) : t('users.page.perms.none'))
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('users.page.perms.title')}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user.firstName} {user.lastName} ({user.username})</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('users.page.perms.current')}</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
              <Shield className="h-4 w-4" />
              {roleLabel(user.roles[0])}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchPerm} onChange={(e) => setSearchPerm(e.target.value)}
              placeholder={t('users.page.perms.search')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400" />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filtered.map((p) => (
              <label key={p} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-slate-700 dark:text-slate-300">{p.replace('PERMISSION_', '').replace(/_/g, ' ')}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">{t('users.page.perms.empty')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -- Create User Modal : wizard 3 étapes -- */
function CreateUserModal({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const { t, has } = useI18n()
  const [form, setForm] = useState({ username: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', roleCode: '' })
  const roleLabel = (code?: string) => (code ? (has(`role.${code}`) ? t(`role.${code}`) : code) : '—')
  const [step, setStep] = useState(0)
  const queryClient = useQueryClient()
  const toast = useToast()

  const create = useMutation({
    mutationFn: () => apiPost('/users', {
      username: form.username, firstName: form.firstName, lastName: form.lastName,
      email: form.email || undefined, phone: form.phone || undefined,
      password: form.password, roleCodes: form.roleCode ? [form.roleCode] : [],
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose(); toast.success(t('users.page.create.created')) },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const emailValid = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const step0Valid = form.username.trim().length >= 3 && !!form.roleCode
  const step1Valid = form.password.length >= 6 && form.confirmPassword === form.password && emailValid
  const canSubmit = step0Valid && step1Valid
  const roleName = form.roleCode ? roleLabel(form.roleCode) : '—'

  function close() { setStep(0); onClose() }
  function next() {
    if (step === 0 && step0Valid) setStep(1)
    else if (step === 1 && step1Valid) setStep(2)
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 2) { next(); return }
    if (canSubmit) create.mutate()
  }

  const subtitles = [t('users.page.create.subtitle.account'), t('users.page.create.subtitle.identity'), t('users.page.create.subtitle.summary')]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur-sm sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('users.page.create.title', { step: step + 1 })}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitles[step]}</p>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-5" noValidate>
          {create.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage(create.error)}</div>
          )}
          <div>
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wide">
              {[t('users.page.create.step.account'), t('users.page.create.step.security'), t('users.page.create.step.summary')].map((label, i) => (
                <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>{label}</span>
              ))}
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label={t('users.page.create.username')} value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder={t('users.page.create.usernamePlaceholder')} />
                <FieldSelect label={t('users.page.create.role')} value={form.roleCode} onChange={(v) => setForm({ ...form, roleCode: v })}
                  options={[{ value: '', label: t('users.page.create.select') }, ...roles.map((r) => ({ value: r.code, label: has(`role.${r.code}`) ? t(`role.${r.code}`) : r.name }))]} />
              </div>
              {!step0Valid && (
                <p className="text-xs text-slate-400">{t('users.page.create.usernameHint')}</p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label={t('users.page.create.firstName')} value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
                <FieldInput label={t('users.page.create.lastName')} value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label={t('users.page.create.email')} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <FieldInput label={t('users.page.create.phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
              {!emailValid && <p className="text-xs text-rose-600">{t('users.page.create.emailInvalid')}</p>}
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label={t('users.page.create.password')} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
                <FieldInput label={t('users.page.create.confirm')} type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} />
              </div>
              {form.password && form.password.length < 6 && (
                <p className="text-xs text-rose-600">{t('users.page.create.passwordShort')}</p>
              )}
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-xs text-rose-600">{t('users.page.create.passwordMismatch')}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('users.page.create.summary')}</h4>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.username').replace(' *', '')}</span><span className="font-mono font-medium text-slate-900 dark:text-slate-100">{form.username || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.fullName')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{`${form.firstName} ${form.lastName}`.trim() || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.email')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{form.email || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.phone')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{form.phone || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.roleField')}</span><span className="font-medium text-violet-600 dark:text-violet-400">{roleName}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.page.create.password').replace(' *', '')}</span><span className="font-medium text-slate-900 dark:text-slate-100">••••••</span></div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <div>
              {step > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>{t('users.page.create.back')}</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={close}>{t('common.cancel')}</Button>
              {step < 2 ? (
                <Button type="submit" disabled={(step === 0 && !step0Valid) || (step === 1 && !step1Valid)}>
                  {t('users.page.create.next')}
                </Button>
              ) : (
                <Button type="submit" disabled={create.isPending || !canSubmit} loading={create.isPending}>
                  <Plus className="h-4 w-4" /> {t('users.page.create.submit')}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

/* -- Edit User Modal -- */
function EditUserModal({ user, roles, onClose }: { user: UserType; roles: Role[]; onClose: () => void }) {
  const { t, has } = useI18n()
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', roleCode: user.roles[0] ?? '' })
  const queryClient = useQueryClient()
  const toast = useToast()

  const update = useMutation({
    mutationFn: () => apiPut(`/users/${user.id}`, {
      username: user.username, firstName: form.firstName, lastName: form.lastName,
      email: form.email || undefined, phone: form.phone || undefined,
      roleCodes: form.roleCode ? [form.roleCode] : [],
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose(); toast.success(t('users.page.edit.saved')) },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('users.page.edit.title', { username: user.username })}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user.firstName} {user.lastName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate() }} className="px-6 py-5 space-y-5">
          {update.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage(update.error)}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label={t('users.page.create.firstName')} value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <FieldInput label={t('users.page.create.lastName')} value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label={t('users.page.create.email')} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FieldInput label={t('users.page.create.phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <FieldSelect label={t('users.page.create.roleField')} value={form.roleCode} onChange={(v) => setForm({ ...form, roleCode: v })}
            options={roles.map((r) => ({ value: r.code, label: has(`role.${r.code}`) ? t(`role.${r.code}`) : r.name }))} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={update.isPending} loading={update.isPending}>
              <Edit3 className="h-4 w-4" /> {t('users.page.edit.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400" />
    </label>
  )
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/* ═══════════════════════════ Skeleton ═══════════════════════════ */
function UsersSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600" />
          <div className="h-4 w-96 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
    </div>
  )
}
