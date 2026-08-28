import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { fr } from '../locales/fr'
import { mg } from '../locales/mg'
import { en } from '../locales/en'

export type Locale = 'fr' | 'mg' | 'en'

const STORAGE_KEY = 'mnktax-locale'

const translations: Record<Locale, Record<string, string>> = { fr, mg, en }

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'fr' || stored === 'mg' || stored === 'en') return stored
    } catch {}
    return 'fr'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    document.documentElement.lang = l
  }, [])

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] ?? translations.fr[key] ?? key
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
