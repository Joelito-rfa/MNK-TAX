import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  Key,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  User as UserIcon,
  X,
} from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import type { Message, Notification, Page } from '../types'
import { Avatar } from './Avatar'
import { useToast } from './Toast'

export const roleLabel = (roles: string[]): string => {
  if (roles.includes('SUPER_ADMIN')) return 'Administrateur'
  if (roles.includes('TAX_AGENT')) return 'Agent des impôts'
  if (roles.includes('COLLECTION_AGENT')) return 'Agent de recouvrement'
  if (roles.includes('ACCOUNTANT')) return 'Comptable'
  if (roles.includes('TAXPAYER')) return 'Contribuable'
  return roles[0] ?? 'Utilisateur'
}

export default function Header({ onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<'notifications' | 'messages' | 'user' | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => apiGet<{ count: number }>('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const { data: unreadMessages } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => apiGet<{ count: number }>('/messages/unread-count'),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const { data: recentMessages } = useQuery({
    queryKey: ['messages', 'recent'],
    queryFn: () => apiGet<Page<Message>>('/messages?page=0&size=5'),
    enabled: openMenu === 'messages' && !!user,
  })

  const { data: recent } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => apiGet<Page<Notification>>('/notifications?page=0&size=5'),
    enabled: openMenu === 'notifications' && !!user,
  })

  async function markAllRead() {
    await apiPost('/notifications/read-all')
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    toast.success('Notifications marquées comme lues')
  }

  async function handleLogout() {
    setOpenMenu(null)
    await logout()
    navigate('/login')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPass.length < 8) { setPwError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (pwForm.newPass !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return }
    setPwLoading(true)
    try {
      await apiPost('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPass })
      toast.success('Mot de passe changé. Veuillez vous reconnecter.')
      setPwOpen(false)
      setPwForm({ current: '', newPass: '', confirm: '' })
      await logout()
      navigate('/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/taxpayers?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Afficher ou masquer le menu"
        >
          <Menu className="h-5 w-5 lg:hidden" />
          {sidebarOpen ? (
            <X className="hidden h-5 w-5 lg:block" />
          ) : (
            <Menu className="hidden h-5 w-5 lg:block" />
          )}
        </button>

        <div className="relative hidden w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Rechercher… (NIF, contribuable)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Effacer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Messages */}
          <MenuButton active={openMenu === 'messages'} onClick={() => setOpenMenu(openMenu === 'messages' ? null : 'messages')} label="Messages">
            <MessageSquare className="h-5 w-5" />
            {!!unreadMessages?.count && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white shadow">
                {unreadMessages.count > 9 ? '9+' : unreadMessages.count}
              </span>
            )}
          </MenuButton>
          {openMenu === 'messages' && (
            <DropdownPanel onClose={() => setOpenMenu(null)} width="w-80">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Messages</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!recentMessages || recentMessages.content.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-slate-500">Aucun message</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {recentMessages.content.map((m) => (
                      <li key={m.id} className={`px-4 py-3 ${m.read ? 'opacity-60' : 'bg-brand-50/40'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-800">{m.senderName}</p>
                          {!m.read && <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                        </div>
                        {m.subject && <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{m.subject}</p>}
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{m.content}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{fmtDateTime(m.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link
                to="/messages"
                onClick={() => setOpenMenu(null)}
                className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50"
              >
                Tout voir
              </Link>
            </DropdownPanel>
          )}

          {/* Notifications */}
          <MenuButton active={openMenu === 'notifications'} onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} label="Notifications">
            <Bell className="h-5 w-5" />
            {!!unread?.count && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
                {unread.count > 9 ? '9+' : unread.count}
              </span>
            )}
          </MenuButton>
          {openMenu === 'notifications' && (
            <DropdownPanel onClose={() => setOpenMenu(null)} width="w-80">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Tout lire
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!recent || recent.content.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <Bell className="h-5 w-5 text-slate-300" />
                    <p className="text-sm text-slate-500">Aucune notification</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {recent.content.map((n) => (
                      <li key={n.id} className={`px-4 py-3 ${n.read ? 'opacity-60' : 'bg-brand-50/40'}`}>
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                        <p className="mt-1 text-[11px] text-slate-400">{fmtDateTime(n.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link
                to="/notifications"
                onClick={() => setOpenMenu(null)}
                className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50"
              >
                Tout voir
              </Link>
            </DropdownPanel>
          )}

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              className="ml-1 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
            >
              <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size="md" />
              <span className="hidden text-left md:block">
                <span className="block text-sm font-semibold leading-tight text-slate-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-xs leading-tight text-slate-500">{roleLabel(user?.roles ?? [])}</span>
              </span>
            </button>
            {openMenu === 'user' && (
              <DropdownPanel onClose={() => setOpenMenu(null)}>
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-500">@{user?.username}</p>
                </div>
                <div className="p-1.5">
                  <MenuLink icon={<UserIcon className="h-4 w-4" />} label="Mon profil" onClick={() => { setOpenMenu(null); navigate('/users') }} />
                  <MenuLink icon={<Key className="h-4 w-4" />} label="Changer le mot de passe" onClick={() => { setOpenMenu(null); setPwOpen(true) }} />
                  <MenuLink
                    icon={<Settings className="h-4 w-4" />}
                    label="Paramètres"
                    onClick={() => { setOpenMenu(null); navigate('/parameters') }}
                  />
                </div>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              </DropdownPanel>
            )}
          </div>
          </div>
        </div>
      </header>
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Changer le mot de passe</h3>
            <button onClick={() => setPwOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {pwError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>}
            <input type="password" placeholder="Mot de passe actuel" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" required />
            <input type="password" placeholder="Nouveau mot de passe (min. 8 caractères)" value={pwForm.newPass} onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" required minLength={8} />
            <input type="password" placeholder="Confirmer le nouveau mot de passe" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" required minLength={8} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setPwOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Annuler</button>
              <button type="submit" disabled={pwLoading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {pwLoading ? 'Envoi…' : 'Changer'}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}
    </>
  )
}

function MenuButton({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`relative rounded-xl p-2 transition ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      {children}
    </button>
  )
}

function DropdownPanel({ children, onClose, width = 'w-64' }: { children: React.ReactNode; onClose: () => void; width?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className={`absolute right-0 z-40 mt-2 ${width} animate-scale-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-popover`}>
        {children}
      </div>
    </>
  )
}

function MenuLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  )
}
