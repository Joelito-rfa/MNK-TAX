import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeCtx {
  theme: Theme
  resolved: 'light' | 'dark'
  set: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx | null>(null)

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemPreference() : theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('mnk-theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch { /* noop */ }
    return 'system'
  })

  const resolved = resolve(theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    try { localStorage.setItem('mnk-theme', theme) } catch { /* noop */ }
  }, [theme, resolved])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      document.documentElement.classList.toggle('dark', mq.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const set = useCallback((t: Theme) => setTheme(t), [])
  const toggle = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }, [])

  const value = useMemo(() => ({ theme, resolved, set, toggle }), [theme, resolved, set, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>.')
  return ctx
}
