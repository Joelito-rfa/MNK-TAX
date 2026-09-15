import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Globe,
  Key,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  User as UserIcon,
  X,
} from 'lucide-react'
import { apiGet, apiPost } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { useI18n, type Locale } from '../lib/i18n'
import { useLocaleFormatters } from '../lib/format'
import type { Message, Notification, Page } from '../types'
import { Avatar } from './Avatar'
import { UserAvatar } from './UserAvatar'
import { useToast } from './Toast'
import GlobalSearch from './GlobalSearch'
import ChangePasswordModal from './ChangePasswordModal'

export const roleLabel = (roles: string[], t: (key: string) => string): string => {
  if (roles.includes('SUPER_ADMIN')) return t('header.admin')
  if (roles.includes('TAX_AGENT')) return t('header.agent')
  if (roles.includes('COLLECTION_AGENT')) return t('header.agent')
  if (roles.includes('ACCOUNTANT')) return t('header.admin')
  if (roles.includes('TAXPAYER')) return t('sidebar.taxpayers')
  return roles[0] ?? 'User'
}

export default function Header({ onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean }) {
  const { user, avatarUrl, logout } = useAuth()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState<'notifications' | 'messages' | 'user' | 'lang' | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { resolved, toggle: cycleTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const { fmtDateTime } = useLocaleFormatters()

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
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    toast.success(t('header.markAllRead'))
  }

  // Après ouverture du dropdown, tout marquer comme lu automatiquement
  // (le badge disparaît sans action manuelle supplémentaire)
  useEffect(() => {
    if (openMenu !== 'notifications' || !unread?.count) return
    const timer = setTimeout(async () => {
      try {
        await apiPost('/notifications/read-all')
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
      } catch { /* silencieux */ }
    }, 1200)
    return () => clearTimeout(timer)
  }, [openMenu, unread?.count, queryClient])

  // Même comportement pour les messages : ouverture = lus automatiquement
  useEffect(() => {
    if (openMenu !== 'messages' || !unreadMessages?.count) return
    const timer = setTimeout(async () => {
      try {
        await apiPost('/messages/read-all')
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
      } catch { /* silencieux */ }
    }, 1200)
    return () => clearTimeout(timer)
  }, [openMenu, unreadMessages?.count, queryClient])

  async function markNotificationRead(id: number) {
    await apiPost(`/notifications/${id}/read`)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
  }

  async function markMessageRead(id: number) {
    await apiPost(`/messages/${id}/read`)
    queryClient.invalidateQueries({ queryKey: ['messages'] })
    queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
  }

  async function handleLogout() {
    setOpenMenu(null)
    await logout()
    navigate('/login')
  }

  const languages: { code: Locale; label: string; initial: string; color: string }[] = [
    { code: 'fr', label: 'Français', initial: 'FR', color: 'bg-blue-600' },
    { code: 'mg', label: 'Malagasy', initial: 'MG', color: 'bg-emerald-600' },
    { code: 'en', label: 'English', initial: 'EN', color: 'bg-rose-600' },
  ]

  return (
    <>
      <header className="header-in z-30 h-16 shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/80">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          {/* ── Left zone: burger + recherche inline ── */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="hbtn rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label={t('a11y.openMenu')}
            >
              <Menu className="h-5 w-5 lg:hidden" />
              {sidebarOpen ? (
                <X className="hidden h-5 w-5 lg:block" />
              ) : (
                <Menu className="hidden h-5 w-5 lg:block" />
              )}
            </button>

            <GlobalSearch />
          </div>

          {/* ── Right zone: notifications · messages · theme · separator · profile ── */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* Messages */}
            <div className="relative">
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
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('header.messages')}</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!recentMessages || recentMessages.content.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('header.noNotifications')}</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {recentMessages.content.map((m) => (
                        <li key={m.id} onClick={() => { if (!m.read) markMessageRead(m.id) }}
                            className={`flex gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${m.read ? 'opacity-60' : 'bg-brand-50/40 dark:bg-brand-900/20'}`}>
                          <UserAvatar userId={m.senderId} name={m.senderName ?? ''} className="mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{m.senderName}</p>
                              {!m.read && <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                            </div>
                            {m.subject && <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">{m.subject}</p>}
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-500">{m.content}</p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{fmtDateTime(m.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  to="/messages"
                  onClick={() => setOpenMenu(null)}
                  className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  {t('header.viewAll')}
                </Link>
              </DropdownPanel>
            )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <MenuButton active={openMenu === 'notifications'} onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} label={t('header.notifications')}>
                <Bell className="h-5 w-5" />
                {!!unread?.count && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
                    {unread.count > 9 ? '9+' : unread.count}
                  </span>
                )}
              </MenuButton>
              {openMenu === 'notifications' && (
              <DropdownPanel onClose={() => setOpenMenu(null)} width="w-80">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('header.notifications')}</p>
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> {t('header.markAllRead')}
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!recent || recent.content.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Bell className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('header.noNotifications')}</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {recent.content.map((n) => (
                        <li key={n.id} onClick={() => { if (!n.read) markNotificationRead(n.id) }}
                            className={`flex gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${n.read ? 'opacity-60' : 'bg-brand-50/40 dark:bg-brand-900/20'}`}>
                          <Avatar
                            name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
                            size="sm"
                            src={avatarUrl}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                            {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>}
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{fmtDateTime(n.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setOpenMenu(null)}
                  className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  {t('header.viewAll')}
                </Link>
              </DropdownPanel>
            )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={cycleTheme}
              className="hbtn rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={resolved === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
            >
              {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'lang' ? null : 'lang')}
                className="hbtn flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                {(() => { const l = languages.find((x) => x.code === locale); return l ? (
                  <span className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${l.color}`}>{l.initial}</span>
                ) : null })()}
                <Globe className="h-4 w-4" />
              </button>
              {openMenu === 'lang' && (
                <DropdownPanel onClose={() => setOpenMenu(null)} width="w-48">
                  <div className="p-1.5">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLocale(lang.code); setOpenMenu(null) }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          locale === lang.code
                            ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${lang.color}`}>{lang.initial}</span>
                        <span>{lang.label}</span>
                        {locale === lang.code && <span className="ml-auto text-brand-500 dark:text-brand-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </DropdownPanel>
              )}
            </div>

            {/* Vertical separator */}
            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Profile block */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                className="hbtn flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size="md" src={avatarUrl} />
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="block text-xs leading-tight text-slate-500 dark:text-slate-400">{roleLabel(user?.roles ?? [], t)}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
              </button>
              {openMenu === 'user' && (
                <DropdownPanel onClose={() => setOpenMenu(null)}>
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user?.username}</p>
                  </div>
                  <div className="p-1.5">
                    <MenuLink icon={<UserIcon className="h-4 w-4" />} label={t('header.profile')} onClick={() => { setOpenMenu(null); navigate('/profile') }} />
                    <MenuLink icon={<Key className="h-4 w-4" />} label={t('header.changePassword')} onClick={() => { setOpenMenu(null); setPwOpen(true) }} />
                    <MenuLink
                      icon={<Settings className="h-4 w-4" />}
                      label={t('header.settings')}
                      onClick={() => { setOpenMenu(null); navigate('/parameters') }}
                    />
                  </div>
                  <div className="border-t border-slate-100 p-1.5 dark:border-slate-700">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <LogOut className="h-4 w-4" /> {t('header.logout')}
                    </button>
                  </div>
                </DropdownPanel>
              )}
            </div>
          </div>
        </div>
      </header>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
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
      className={`hbtn relative rounded-xl p-2 ${active ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'}`}
    >
      {children}
    </button>
  )
}

function DropdownPanel({ children, onClose, width = 'w-64' }: { children: React.ReactNode; onClose: () => void; width?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-0 z-40 mt-2 ${width} max-w-[calc(100vw-3rem)] animate-scale-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-popover dark:border-slate-700/50 dark:bg-slate-800`}
      >
        {children}
      </div>
    </>
  )
}

function MenuLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      {label}
    </button>
  )
}
