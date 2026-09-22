import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { fr } from '../locales/fr'
import { mg } from '../locales/mg'
import { en } from '../locales/en'

export type Locale = 'fr' | 'mg' | 'en'

const STORAGE_KEY = 'mnktax-locale'

const translations: Record<Locale, Record<string, string>> = { fr, mg, en }

export const localeToIntl: Record<Locale, string> = {
  fr: 'fr-MG',
  mg: 'mg-MG',
  en: 'en-US',
}

export type TVars = Record<string, string | number>

function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: TVars) => string
  /** true si la clé existe dans la locale active (sans fallback FR). */
  has: (key: string) => boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'mg' || stored === 'en') return stored
    const nav = navigator.language?.slice(0, 2)
    if (nav === 'en') return 'en'
    if (nav === 'mg') return 'mg'
  } catch {}
  return 'fr'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    document.documentElement.lang = l
  }, [])

  const t = useCallback((key: string, vars?: TVars): string => {
    const dict = translations[locale] ?? translations.fr
    const raw = dict[key] ?? translations.fr[key] ?? key
    if (import.meta.env.DEV && !(dict[key] ?? translations.fr[key])) {
      console.warn(`[i18n] missing key "${key}" for locale "${locale}"`)
    }
    return interpolate(raw, vars)
  }, [locale])

  const has = useCallback((key: string): boolean => {
    const dict = translations[locale] ?? translations.fr
    return dict[key] !== undefined
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t, has }), [locale, setLocale, t, has])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
