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
  Download,
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
import { downloadCsv } from '../lib/csv'
import { fmtDateTime } from '../lib/format'
import type { Page, Role, User as UserType } from '../types'
import { Button, Card, EmptyState } from '../components/ui'
import RowActionPortal from '../components/RowActionPortal'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'


/* ═══════════════════════════ Constantes ═══════════════════════════ */

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  SUPER_ADMIN: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: <Shield className="h-4 w-4" /> },
  ADMIN: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', icon: <ShieldCheck className="h-4 w-4" /> },
  TAX_AGENT: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: <FileText className="h-4 w-4" /> },
  COLLECTION_AGENT: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: <Activity className="h-4 w-4" /> },
  ACCOUNTANT: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: <BarChart3 className="h-4 w-4" /> },
  TAXPAYER: { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', icon: <User className="h-4 w-4" /> },
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  TAX_AGENT: 'Agent Fiscal',
  COLLECTION_AGENT: 'Agent Recouvrement',
  ACCOUNTANT: 'Comptable',
  TAXPAYER: 'Contribuable',
}

const STATUS_OPTIONS = [
  { id: 'all', label: 'Tous les statuts' },
  { id: 'active', label: 'Actif' },
  { id: 'inactive', label: 'Inactif' },
]

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Jamais connecte'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "A l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return fmtDateTime(iso)
}

function initials(firstName: string, lastName: string): string {
  const f = (firstName || '').trim()
  const l = (lastName || '').trim()
  if (f && l) return (f[0] + l[0]).toUpperCase()
  if (f) return f.slice(0, 2).toUpperCase()
  if (l) return l.slice(0, 2).toUpperCase()
  return '??'
}

function getStatusInfo(u: UserType): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (!u.enabled) return { label: 'Desactive', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: <UserX className="h-3.5 w-3.5" /> }
  return { label: 'Actif', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <UserCheck className="h-3.5 w-3.5" /> }
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function Users() {
  const { can } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    return Object.entries(ROLE_LABELS).map(([code, label]) => ({
      code, label, count: counts[code] ?? 0, ...(ROLE_COLORS[code] ?? ROLE_COLORS.ADMIN),
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

  const handleExport = () => {
    if (filteredUsers.length === 0) {
      toast.info('Aucun utilisateur a exporter')
      return
    }
    downloadCsv(
      `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Identifiant', 'Nom', 'Prenom', 'Email', 'Telephone', 'Roles', 'Statut', 'Derniere connexion'],
      filteredUsers.map((u) => [
        u.username, u.lastName, u.firstName, u.email, u.phone,
        u.roles.join(' / '), u.enabled ? 'Actif' : 'Desactive', u.lastLoginAt ?? '',
      ]),
    )
    toast.success('Export termine')
  }

  /* -- Mutations -- */
  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiPatch(`/users/${id}/enabled?enabled=${enabled}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Statut mis a jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiDelete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteConfirm(null)
      toast.success('Utilisateur supprime')
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
            Gestion des utilisateurs
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerez les comptes utilisateurs, les roles, les acces et les autorisations du systeme.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate('/audit')}>
            <Activity className="h-4 w-4" />
            Journal d'activite
          </Button>
          {can('USER_WRITE') && (
            <button
              onClick={() => setCreateOpen(true)}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30"
            >
              <span className="absolute inset-0 bg-brand-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <Plus className="relative h-4 w-4" />
              <span className="relative">Nouvel utilisateur</span>
            </button>
          )}
        </div>
      </div>

      {/* === 2. KPI STATS === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="bg-violet-50" iconColor="text-violet-600"
          label="UTILISATEURS TOTAUX" value={stats.total} sub="Comptes enregistres" style={{ animationDelay: '0s' }} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          label="UTILISATEURS ACTIFS" value={stats.active} sub="Comptes actifs"
          delta={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% du total`} deltaTone="up" style={{ animationDelay: '0.08s' }} />
        <StatCard icon={<Clock className="h-5 w-5" />} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="EN ATTENTE" value={stats.waiting} sub="Comptes a valider" style={{ animationDelay: '0.16s' }} />
        <StatCard icon={<Lock className="h-5 w-5" />} iconBg="bg-amber-50" iconColor="text-amber-600"
          label="DESACTIVES" value={stats.disabled} sub="Comptes inactifs"
          delta={stats.disabled > 0 ? 'Attention' : 'Aucun'} deltaTone={stats.disabled > 0 ? 'down' : 'neutral'} style={{ animationDelay: '0.24s' }} />
      </div>

      {/* === 3. ROLE DISTRIBUTION === */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Repartition par role
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
              placeholder="Rechercher par nom, identifiant, email ou telephone..."
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
              {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700">
              <RotateCcw className="h-3.5 w-3.5" />
              Reinitialiser
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-xs">Afficher</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs">par page</span>
          </div>
        </div>

        {/* === 5. USERS LIST === */}
        {pagedUsers.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<UsersIcon className="h-10 w-10" />} title="Aucun utilisateur trouve"
              subtitle={search ? `Aucun resultat pour "${search}"` : "Aucun compte utilisateur ne correspond a vos criteres."} />
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" /> Reinitialiser les filtres
              </Button>
              {can('USER_WRITE') && (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Nouvel utilisateur
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pagedUsers.map((user) => {
              const status = getStatusInfo(user)
              const roleInfo = ROLE_COLORS[user.roles[0]] ?? ROLE_COLORS.ADMIN
              return (
                <div key={user.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  {/* Avatar + Nom */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                        {initials(user.firstName, user.lastName)}
                      </div>
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
                      {user.roles[0] ? ROLE_LABELS[user.roles[0]] ?? user.roles[0] : '--'}
                    </span>
                  </div>

                  {/* Permissions count */}
                  <div className="hidden xl:block">
                    <button onClick={() => setPermissionsUser(user)}
                      className="text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition">
                      {user.permissions.length} permissions
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(user.lastLoginAt)}</p>
                  </div>

                  {/* Actions */}
                  {can('USER_WRITE') && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => setSelectedUser(user)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
                        title="Voir le profil">
                        <Eye className="h-4 w-4" />
                      </button>
                      <RowActionPortal>
                        <MenuItem icon={<Eye className="h-4 w-4" />} label="Voir le profil"
                          onClick={() => { setSelectedUser(user) }} />
                        <MenuItem icon={<Edit3 className="h-4 w-4" />} label="Modifier"
                          onClick={() => { setEditUser(user) }} />
                        <MenuItem icon={<Shield className="h-4 w-4" />} label="Gerer les roles"
                          onClick={() => { setPermissionsUser(user) }} />
                        <MenuItem icon={<Key className="h-4 w-4" />} label="Reinitialiser le mot de passe"
                          onClick={() => { setResetUser(user) }} />
                        <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                        <MenuItem
                          icon={user.enabled ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          label={user.enabled ? 'Desactiver' : 'Activer'}
                          onClick={() => { toggleEnabled.mutate({ id: user.id, enabled: !user.enabled }) }}
                          danger={user.enabled} />
                        {!user.roles.includes('SUPER_ADMIN') && (
                          <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Supprimer"
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
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiche{filteredUsers.length > 1 ? 's' : ''}
              {search && ` pour "${search}"`}
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Supprimer l'utilisateur</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Etes-vous sur de vouloir supprimer <strong>{deleteConfirm.username}</strong> ({deleteConfirm.firstName} {deleteConfirm.lastName}) ? Cette action est irreversible.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
              <Button variant="danger" onClick={() => deleteUser.mutate(deleteConfirm.id)} loading={deleteUser.isPending}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

function ResetPasswordModal({ user, onClose }: { user: UserType; onClose: () => void }) {
  const toast = useToast()
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const reset = useMutation({
    mutationFn: () => apiPost<{ temporaryPassword: string }>(`/users/${user.id}/reset-password`),
    onSuccess: (data) => setTempPassword(data.temporaryPassword),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Key className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Reinitialiser le mot de passe</h3>
          {tempPassword === null ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Un mot de passe temporaire sera genere pour <strong>{user.username}</strong>. L'utilisateur devra le changer a sa prochaine connexion.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Mot de passe temporaire genere (a communiquer par un canal securise) :</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
                <code className="flex-1 break-all font-mono text-sm text-slate-800 dark:text-slate-200">{tempPassword}</code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(tempPassword); toast.success('Copie') }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Copier"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          {tempPassword === null ? (
            <>
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button variant="primary" onClick={() => reset.mutate()} loading={reset.isPending}>Reinitialiser</Button>
            </>
          ) : (
            <Button variant="primary" onClick={onClose}>Fermer</Button>
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
  const status = getStatusInfo(user)
  const roleInfo = ROLE_COLORS[user.roles[0]] ?? ROLE_COLORS.ADMIN
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
              {initials(user.firstName, user.lastName)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{user.username}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleInfo.bg} ${roleInfo.text}`}>
                  {roleInfo.icon} {user.roles[0] ? ROLE_LABELS[user.roles[0]] ?? user.roles[0] : '--'}
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
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email || '--'} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telephone" value={user.phone || '--'} />
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Cree le" value={fmtDateTime(user.createdAt)} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Derniere connexion" value={timeAgo(user.lastLoginAt)} />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Permissions ({user.permissions.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions.slice(0, 12).map((p) => (
                <span key={p} className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                  {p.replace('PERMISSION_', '')}
                </span>
              ))}
              {user.permissions.length > 12 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">+{user.permissions.length - 12} autres</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button variant="primary" size="sm" onClick={() => { onEdit(user) }}>
              <Edit3 className="h-3.5 w-3.5" /> Modifier
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onManageAccess(user)}>
              <Shield className="h-3.5 w-3.5" /> Gerer les acces
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
  const [searchPerm, setSearchPerm] = useState('')
  const role = roles.find((r) => r.code === user.roles[0])
  const allPerms = role?.permissions ?? user.permissions
  const filtered = searchPerm ? allPerms.filter((p) => p.toLowerCase().includes(searchPerm.toLowerCase())) : allPerms
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Roles et permissions</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user.firstName} {user.lastName} ({user.username})</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Role actuel :</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
              <Shield className="h-4 w-4" />
              {ROLE_LABELS[user.roles[0]] ?? user.roles[0] ?? 'Aucun role'}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchPerm} onChange={(e) => setSearchPerm(e.target.value)}
              placeholder="Rechercher une permission..."
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
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Aucune permission trouvee</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -- Create User Modal -- */
function CreateUserModal({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const [form, setForm] = useState({ username: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', roleCode: '' })
  const queryClient = useQueryClient()
  const toast = useToast()

  const create = useMutation({
    mutationFn: () => apiPost('/users', {
      username: form.username, firstName: form.firstName, lastName: form.lastName,
      email: form.email || undefined, phone: form.phone || undefined,
      password: form.password, roleCodes: form.roleCode ? [form.roleCode] : [],
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose(); toast.success('Utilisateur cree') },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nouvel utilisateur</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Creez un nouveau compte utilisateur</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="px-6 py-5 space-y-5">
          {create.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage(create.error)}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Identifiant" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="ex: agent.nouveau" />
            <FieldSelect label="Role" value={form.roleCode} onChange={(v) => setForm({ ...form, roleCode: v })}
              options={[{ value: '', label: 'Selectionner...' }, ...roles.map((r) => ({ value: r.code, label: r.name }))]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Prenom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <FieldInput label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FieldInput label="Telephone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Mot de passe" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <FieldInput label="Confirmer" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || !form.username || !form.password || !form.roleCode} loading={create.isPending}>
              <Plus className="h-4 w-4" /> Creer l'utilisateur
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* -- Edit User Modal -- */
function EditUserModal({ user, roles, onClose }: { user: UserType; roles: Role[]; onClose: () => void }) {
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', roleCode: user.roles[0] ?? '' })
  const queryClient = useQueryClient()
  const toast = useToast()

  const update = useMutation({
    mutationFn: () => apiPut(`/users/${user.id}`, {
      username: user.username, firstName: form.firstName, lastName: form.lastName,
      email: form.email || undefined, phone: form.phone || undefined,
      roleCodes: form.roleCode ? [form.roleCode] : [],
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose(); toast.success('Utilisateur mis a jour') },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Modifier : {user.username}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user.firstName} {user.lastName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate() }} className="px-6 py-5 space-y-5">
          {update.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage(update.error)}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Prenom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <FieldInput label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FieldInput label="Telephone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <FieldSelect label="Role" value={form.roleCode} onChange={(v) => setForm({ ...form, roleCode: v })}
            options={roles.map((r) => ({ value: r.code, label: r.name }))} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={update.isPending} loading={update.isPending}>
              <Edit3 className="h-4 w-4" /> Enregistrer
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
