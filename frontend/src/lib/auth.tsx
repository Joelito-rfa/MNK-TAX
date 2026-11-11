import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import axios from 'axios'
import { api, apiGet, apiGetBlob, apiPost, tokenStore } from './api'
import type { LoginRequest, LoginResponse, User } from '../types'

/** Le serveur rejette vraiment la session (à opposer à une panne réseau). */
function isAuthRejection(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  )
}

/** Backend en cours de démarrage (502/503/504) ou réseau momentanément coupé. */
function isTransientError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return !error.response || error.response.status >= 500
}

const TRANSIENT_RETRY_DELAYS = [1_000, 3_000]

/** Récupère /auth/me en réessayant brièvement si le backend démarre encore. */
async function loadCurrentUser(): Promise<User> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await apiGet<User>('/auth/me')
    } catch (error) {
      const canRetry = attempt < TRANSIENT_RETRY_DELAYS.length && isTransientError(error)
      if (!canRetry) throw error
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAYS[attempt]))
    }
  }
}

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
        const me = await loadCurrentUser()
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
      } catch (error) {
        // Une panne passagère (backend qui démarre, réseau) ne doit pas
        // déconnecter l'utilisateur : on ne purge les jetons que si le
        // serveur rejette réellement la session.
        if (isAuthRejection(error)) tokenStore.clear()
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
