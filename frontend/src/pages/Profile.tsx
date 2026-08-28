import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Key, LogOut, Mail, Phone, ShieldCheck, Trash2, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, apiDelete, apiErrorMessage, apiPost, apiPut } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { roleLabel } from '../components/Header'
import { fmtDateTime } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export default function Profile() {
  const { user, avatarUrl, hasAvatar, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  }))
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [avatarError, setAvatarError] = useState('')

  const saveProfile = useMutation({
    mutationFn: () =>
      apiPut('/auth/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
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
      await refreshUser()
      toast.success('Avatar supprimé')
    },
    onError: (err: unknown) => {
      setAvatarError(apiErrorMessage(err))
    },
  })

  const changePassword = useMutation({
    mutationFn: () =>
      apiPost('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.newPass,
      }),
    onSuccess: async () => {
      toast.success('Mot de passe changé. Veuillez vous reconnecter.')
      await logout()
      navigate('/login')
    },
    onError: (err: unknown) => {
      setPwError(apiErrorMessage(err))
    },
  })

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

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPass.length < 8) { setPwError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (pwForm.newPass !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return }
    changePassword.mutate()
  }

  if (!user) return null

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" subtitle="Informations personnelles et sécurité du compte" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Carte d'identité */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-8 text-center">
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
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer la photo
                </button>
              )}
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span className="truncate">{user.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>{user.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>{user.permissions.length} permissions</span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3 text-xs text-slate-400 dark:text-slate-500">
                <p>Membre depuis le {fmtDateTime(user.createdAt)}</p>
                {user.lastLoginAt && <p className="mt-1">Dernière connexion : {fmtDateTime(user.lastLoginAt)}</p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Formulaire d'édition */}
        <div className="space-y-6 lg:col-span-2">
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
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" loading={saveProfile.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Changer le mot de passe"
              subtitle="Un nouveau mot de passe vous déconnecte de toutes les sessions"
              actions={<Key className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
            />
            <form onSubmit={handleChangePassword} className="space-y-4 px-5 py-5">
              {pwError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{pwError}</div>
              )}
              <Field label="Mot de passe actuel">
                <Input
                  type="password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nouveau mot de passe" hint="Minimum 8 caractères">
                  <Input
                    type="password"
                    value={pwForm.newPass}
                    onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })}
                    required
                    minLength={8}
                  />
                </Field>
                <Field label="Confirmer le nouveau mot de passe">
                  <Input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required
                    minLength={8}
                  />
                </Field>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={changePassword.isPending}
                  disabled={!pwForm.current || !pwForm.newPass}
                >
                  <LogOut className="h-4 w-4" /> Changer le mot de passe
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
