import { useRef, useState, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  Check,
  Clock,
  Globe,
  Key,
  Laptop,
  LogOut,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  User as UserIcon,
  Activity,
  Bell,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { api, apiDelete, apiErrorMessage, apiGet, apiPost, apiPut } from '../lib/api'
import { tokenStore } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { roleLabel } from '../components/Header'
import { fmtDateTime, timeAgo } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Modal, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'
import ChangePasswordModal from '../components/ChangePasswordModal'
import type { Session, SecurityEvent } from '../types'
import { parseUserAgent, actionLabel, PERMISSION_CATEGORIES, PERMISSION_LABELS } from '../lib/profile-utils'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']





/* ── Notification preference keys ───────────────────── */
const NOTIFICATION_PREFS = [
  { key: 'declarations', label: 'Nouvelles déclarations', icon: <Mail className="h-4 w-4" /> },
  { key: 'deadlines', label: 'Échéances', icon: <Clock className="h-4 w-4" /> },
  { key: 'debts', label: 'Créances', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'payments', label: 'Paiements', icon: <Check className="h-4 w-4" /> },
  { key: 'messages', label: 'Messages', icon: <Mail className="h-4 w-4" /> },
  { key: 'collection', label: 'Recouvrement', icon: <Shield className="h-4 w-4" /> },
  { key: 'controls', label: 'Contrôles', icon: <Eye className="h-4 w-4" /> },
  { key: 'security', label: 'Sécurité', icon: <ShieldCheck className="h-4 w-4" /> },
]





/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function Profile() {
  const { user, avatarUrl, hasAvatar, refreshUser } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── State ──
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    jobTitle: user?.jobTitle ?? '',
    taxCenter: user?.taxCenter ?? '',
  }))
  const [avatarError, setAvatarError] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false)

  // ── Notification preferences (localStorage) ──
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('mnktax-notif-prefs')
      return stored ? JSON.parse(stored) : Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, true]))
    } catch {
      return Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, true]))
    }
  })

  // ── Queries ──
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['profile', 'sessions'],
    queryFn: () => apiGet<Session[]>('/auth/me/sessions?token=' + encodeURIComponent(tokenStore.refresh ?? '')),
    enabled: !!user,
  })

  const { data: securityHistory = [], isLoading: historyLoading } = useQuery<SecurityEvent[]>({
    queryKey: ['profile', 'security-history'],
    queryFn: () => apiGet<SecurityEvent[]>('/auth/me/security-history?page=0&size=10'),
    enabled: !!user,
  })

  // ── Mutations ──
  const saveProfile = useMutation({
    mutationFn: () =>
      apiPut('/auth/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle || undefined,
        taxCenter: form.taxCenter || undefined,
      }),
    onSuccess: async () => {
      await refreshUser()
      toast.success('Profil mis à jour')
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: async () => {
      setAvatarError('')
      await refreshUser()
      toast.success('Avatar mis à jour')
    },
    onError: (err: unknown) => {
      setAvatarError(apiErrorMessage(err))
    },
  })

  const removeAvatar = useMutation({
    mutationFn: () => apiDelete('/auth/me/avatar'),
    onSuccess: async () => {
      setConfirmRemoveAvatar(false)
      await refreshUser()
      toast.success('Avatar supprimé')
    },
    onError: (err: unknown) => {
      setAvatarError(apiErrorMessage(err))
    },
  })

  const revokeSession = useMutation({
    mutationFn: (sessionId: number) => apiPost(`/auth/me/sessions/${sessionId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'sessions'] })
      toast.success('Session révoquée')
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err))
    },
  })

  const revokeAllSessions = useMutation({
    mutationFn: () => apiPost('/auth/me/sessions/revoke-all?token=' + encodeURIComponent(tokenStore.refresh ?? '')),
    onSuccess: () => {
      setConfirmRevokeAll(false)
      queryClient.invalidateQueries({ queryKey: ['profile', 'sessions'] })
      toast.success('Autres sessions révoquées')
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err))
    },
  })

  // ── Handlers ──
  function onAvatarSelected(file: File | undefined) {
    setAvatarError('')
    if (!file) return
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Format non supporté. Utilisez PNG, JPEG, WEBP ou GIF.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("L'image ne doit pas dépasser 2 Mo.")
      return
    }
    uploadAvatar.mutate(file)
  }

  const toggleNotifPref = useCallback((key: string) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('mnktax-notif-prefs', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // ── Computed ──
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  const groupedPermissions = useMemo(() => {
    if (!user?.permissions) return []
    return PERMISSION_CATEGORIES
      .map(cat => ({
        ...cat,
        permissions: user.permissions.filter(p => p.startsWith(cat.prefix)),
      }))
      .filter(cat => cat.permissions.length > 0)
  }, [user?.permissions])

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" subtitle="Gestion de votre compte et sécurité" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ═══ Carte d'identité ═══ */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 bg-brand-700 px-6 py-8 text-center">
              <div className="group relative">
                <Avatar
                  name={fullName || user.username}
                  size="lg"
                  src={avatarUrl}
                  className="h-20 w-20 text-2xl ring-4 ring-white/25"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending || removeAvatar.isPending}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition group-hover:bg-black/45 group-hover:text-white disabled:opacity-50"
                  aria-label="Changer la photo de profil"
                >
                  <Camera className="h-6 w-6" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { onAvatarSelected(e.target.files?.[0]); e.target.value = '' }}
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{fullName || user.username}</p>
                <p className="text-sm text-brand-100">@{user.username}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {user.roles.map((r) => (
                  <Badge key={r} tone="violet" className="bg-white/15 text-white">{roleLabel([r], t)}</Badge>
                ))}
                <Badge tone={user.enabled ? 'green' : 'red'}>{user.enabled ? 'Actif' : 'Désactivé'}</Badge>
              </div>
              {(uploadAvatar.isPending || removeAvatar.isPending) && (
                <p className="text-xs text-brand-100">Chargement de l'image…</p>
              )}
              {avatarError && (
                <p className="max-w-60 text-xs text-rose-200">{avatarError}</p>
              )}
              {hasAvatar && (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveAvatar(true)}
                  disabled={removeAvatar.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer la photo
                </button>
              )}
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              <InfoRow icon={<Mail className="h-4 w-4" />} value={user.email || '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} value={user.phone || '—'} />
              {user.taxCenter && (
                <InfoRow icon={<Globe className="h-4 w-4" />} value={user.taxCenter} />
              )}
              {user.jobTitle && (
                <InfoRow icon={<BriefcaseIcon />} value={user.jobTitle} />
              )}
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>{user.permissions.length} permissions</span>
              </div>
              <button
                onClick={() => setPermissionsOpen(true)}
                className="flex w-full items-center gap-1.5 text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <Eye className="h-3.5 w-3.5" /> Voir mes permissions
              </button>
              <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3 text-xs text-slate-400 dark:text-slate-500">
                <p>Membre depuis le {fmtDateTime(user.createdAt)}</p>
                {user.lastLoginAt && (
                  <p className="mt-1">
                    Dernière connexion : {fmtDateTime(user.lastLoginAt)}
                    {user.lastLoginIp && <span className="ml-1">({user.lastLoginIp})</span>}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ Contenu principal ═══ */}
        <div className="space-y-6 lg:col-span-2">
          {/* ── Informations personnelles ── */}
          <Card>
            <CardHeader
              title="Informations personnelles"
              subtitle="Ces informations sont visibles par les autres agents"
              actions={<UserIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
            />
            <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate() }} className="space-y-4 px-5 py-5">
              {saveProfile.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiErrorMessage(saveProfile.error)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Prénom">
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </Field>
                <Field label="Nom">
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Téléphone">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+261..." />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nom d'utilisateur" hint="Identifiant système (lecture seule)">
                  <Input value={user.username} disabled className="opacity-60" />
                </Field>
                <Field label="Rôle" hint="Attribué par un administrateur">
                  <Input value={user.roles.map(r => roleLabel([r], t)).join(', ')} disabled className="opacity-60" />
                </Field>
              </div>
              {user.taxCenter !== undefined && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Centre fiscal" hint="Lecture seule">
                    <Input value={form.taxCenter} onChange={(e) => setForm({ ...form, taxCenter: e.target.value })} placeholder="Ex: DGI Manakara" />
                  </Field>
                  <Field label="Fonction">
                    <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Ex: Agent fiscal" />
                  </Field>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button type="submit" loading={saveProfile.isPending}>
                  {saveProfile.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </form>
          </Card>

          {/* ── Sécurité ── */}
          <Card>
            <CardHeader
              title="Sécurité"
              subtitle="Changer le mot de passe et gérer les sessions"
              actions={<Key className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
            />
            <div className="px-5 py-5">
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Pour votre sécurité, vous pouvez modifier votre mot de passe à tout moment.
              </p>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setPwOpen(true)}>
                  <Key className="h-4 w-4" /> Changer le mot de passe
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ═══ Sessions actives ═══ */}
      <Card>
        <CardHeader
          title="Sessions actives"
          subtitle={`${sessions.length} session(s) active(s)`}
          actions={
            sessions.length > 1 && (
              <Button variant="danger" size="sm" onClick={() => setConfirmRevokeAll(true)}>
                <LogOut className="h-3.5 w-3.5" /> Tout déconnecter
              </Button>
            )
          }
        />
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {sessionsLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Chargement…</div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Aucune session active</div>
          ) : (
            sessions.map((s) => {
              const parsed = parseUserAgent(s.userAgent)
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {parsed.device === 'Mobile' ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {parsed.os} · {parsed.browser}
                        {parsed.device !== 'Ordinateur' && <span className="ml-1 text-slate-400">({parsed.device})</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.ipAddress && <span>{s.ipAddress} · </span>}
                        Créée {timeAgo(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.current ? (
                      <Badge tone="green">Session actuelle</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSession.mutate(s.id)}
                        loading={revokeSession.isPending}
                      >
                        Déconnecter
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* ═══ Activité récente ═══ */}
      <Card>
        <CardHeader
          title="Activité récente"
          subtitle="Historique de sécurité de votre compte"
          actions={<Activity className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
        />
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {historyLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Chargement…</div>
          ) : securityHistory.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Aucune activité récente</div>
          ) : (
            securityHistory.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    e.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    e.action === 'PASSWORD_CHANGE' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    e.action === 'LOGOUT' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' :
                    'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                  }`}>
                    {e.action === 'LOGIN' ? <LogOut className="h-4 w-4 rotate-180" /> :
                     e.action === 'PASSWORD_CHANGE' ? <Key className="h-4 w-4" /> :
                     <Activity className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {actionLabel(e.action, e.entityType)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {e.ipAddress && <span>{e.ipAddress} · </span>}
                      {fmtDateTime(e.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ═══ Préférences de notification ═══ */}
      <Card>
        <CardHeader
          title="Préférences de notification"
          subtitle="Choisissez les notifications que vous souhaitez recevoir"
          actions={<Bell className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
        />
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {NOTIFICATION_PREFS.map((pref) => (
            <div key={pref.key} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 dark:text-slate-500">{pref.icon}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{pref.label}</span>
                {pref.key === 'security' && (
                  <Badge tone="amber" className="text-[10px]">Critique</Badge>
                )}
              </div>
              <button
                onClick={() => toggleNotifPref(pref.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifPrefs[pref.key] ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifPrefs[pref.key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* ═══ Permissions Modal ═══ */}
      <Modal open={permissionsOpen} onClose={() => setPermissionsOpen(false)} title="Mes permissions" subtitle={`${user.permissions.length} permission(s) effective(s)`} wide>
        <div className="space-y-4">
          {groupedPermissions.map((cat) => (
            <div key={cat.prefix}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{cat.title}</h4>
              <div className="flex flex-wrap gap-1.5">
                {cat.permissions.map((p) => {
                  const suffix = p.replace(cat.prefix, '')
                  const label = PERMISSION_LABELS[suffix] || suffix
                  return (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Check className="h-3 w-3" /> {label}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
          {groupedPermissions.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Aucune permission</p>
          )}
        </div>
      </Modal>

      {/* ═══ Confirm: Revoke all sessions ═══ */}
      <ConfirmDialog
        open={confirmRevokeAll}
        title="Déconnecter toutes les sessions"
        message="Cela déconnectera toutes vos sessions sauf la session actuelle. Êtes-vous sûr ?"
        confirmLabel="Tout déconnecter"
        onConfirm={() => revokeAllSessions.mutate()}
        onClose={() => setConfirmRevokeAll(false)}
        loading={revokeAllSessions.isPending}
      />

      {/* ═══ Confirm: Remove avatar ═══ */}
      <ConfirmDialog
        open={confirmRemoveAvatar}
        title="Supprimer la photo de profil"
        message="Êtes-vous sûr de vouloir supprimer votre photo de profil ?"
        confirmLabel="Supprimer"
        onConfirm={() => removeAvatar.mutate()}
        onClose={() => setConfirmRemoveAvatar(false)}
        loading={removeAvatar.isPending}
      />
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════ */

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
