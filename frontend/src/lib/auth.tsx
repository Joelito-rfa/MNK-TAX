import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, apiGet, apiGetBlob, apiPost, tokenStore } from './api'
import type { LoginRequest, LoginResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  avatarUrl: string | null
  hasAvatar: boolean
  login: (credentials: LoginRequest) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const avatarUrlRef = useRef<string | null>(null)

  const applyAvatar = useCallback(async (hasAvatar: boolean) => {
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current)
      avatarUrlRef.current = null
    }
    setAvatarUrl(null)
    if (!hasAvatar) return
    try {
      const blob = await apiGetBlob('/auth/me/avatar')
      const url = URL.createObjectURL(blob)
      avatarUrlRef.current = url
      setAvatarUrl(url)
    } catch {
      // avatar indisponible : on garde les initiales
    }
  }, [])

  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!tokenStore.access) {
        setLoading(false)
        return
      }
      try {
        const me = await apiGet<User>('/auth/me')
        if (!active) return
        setUser(me)
        if (me.hasAvatar) {
          const blob = await apiGetBlob('/auth/me/avatar')
          if (active) {
            const url = URL.createObjectURL(blob)
            avatarUrlRef.current = url
            setAvatarUrl(url)
          }
        }
      } catch {
        tokenStore.clear()
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current)
        avatarUrlRef.current = null
      }
    }
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const res = await apiPost<LoginResponse>('/auth/login', credentials)
    tokenStore.set(res.accessToken, res.refreshToken)
    setUser(res.user)
    await applyAvatar(res.user.hasAvatar)
    return res.user
  }, [applyAvatar])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // déconnexion locale même si le serveur est injoignable
    }
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current)
      avatarUrlRef.current = null
    }
    setAvatarUrl(null)
    tokenStore.clear()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) return null
    const me = await apiGet<User>('/auth/me')
    setUser(me)
    await applyAvatar(me.hasAvatar)
    return me
  }, [applyAvatar])

  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, avatarUrl, hasAvatar: !!user?.hasAvatar, login, logout, refreshUser, can }),
    [user, loading, avatarUrl, login, logout, refreshUser, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
