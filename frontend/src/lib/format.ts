import { localeToIntl, type Locale } from './i18n'

function intlLocale(locale: Locale): string {
  return localeToIntl[locale] ?? 'fr-MG'
}

// ── Pure helpers (locale param) ──

export function fmtNumber(value: number | null | undefined, locale: Locale = 'fr', decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat(intlLocale(locale)).format(Number(Number(value).toFixed(decimals)))
}

export function fmtMGA(value: number | null | undefined, locale: Locale = 'fr', decimals = 0): string {
  return `${fmtNumber(value, locale, decimals)} MGA`
}

export function fmtDate(value: string | null | undefined, locale: Locale = 'fr'): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(intlLocale(locale))
}

export function fmtDateTime(value: string | null | undefined, locale: Locale = 'fr'): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.toLocaleDateString(intlLocale(locale))} ${d.toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' })}`
}

export function fmtBytes(bytes: number, locale: Locale = 'fr'): string {
  const loc = intlLocale(locale)
  if (bytes < 1024) return `${new Intl.NumberFormat(loc).format(bytes)} o`
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(bytes / 1024)} Ko`
  return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} Mo`
}

// Keys for timeAgo – caller should translate via t()
const timeAgoKeys = {
  instant: 'common.timeAgo.instant',
  min: 'common.timeAgo.min',
  hour: 'common.timeAgo.hour',
  day: 'common.timeAgo.day',
} as const

export function timeAgoKey(value: string | null | undefined): { key: string; vars?: Record<string, number> } | null {
  if (!value) return null
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return null
  const diff = Date.now() - then
  const min = Math.floor(diff / 60_000)
  if (min < 1) return { key: timeAgoKeys.instant }
  if (min < 60) return { key: timeAgoKeys.min, vars: { count: min } }
  const hours = Math.floor(min / 60)
  if (hours < 24) return { key: timeAgoKeys.hour, vars: { count: hours } }
  const days = Math.floor(hours / 24)
  if (days < 7) return { key: timeAgoKeys.day, vars: { count: days } }
  return null
}

export function timeAgo(value: string | null | undefined, t?: (key: string, vars?: Record<string, number>) => string): string {
  const result = timeAgoKey(value)
  if (!result) return fmtDate(value)
  if (!t) {
    // Fallback sans traducteur (évite le crash "t is not a function")
    if (result.key.endsWith('.instant')) return "à l'instant"
    const n = result.vars?.count ?? 0
    if (result.key.endsWith('.min')) return `il y a ${n} min`
    if (result.key.endsWith('.hour')) return `il y a ${n} h`
    if (result.key.endsWith('.day')) return `il y a ${n} j`
    return fmtDate(value)
  }
  return t(result.key, result.vars)
}

export function shortMonthLabel(raw: string, locale: Locale = 'fr'): string {
  const m = raw.match(/(\d{4})-(\d{2})/)
  if (!m) return raw
  const year = Number(m[1]); const month = Number(m[2]) - 1
  const d = new Date(year, month, 1)
  const monthName = d.toLocaleDateString(intlLocale(locale), { month: 'short' })
  return `${monthName} ${year}`
}

// ── Hook for components ──
import { useI18n } from './i18n'

export function useLocaleFormatters() {
  const { locale, t } = useI18n()
  return {
    locale,
    fmtNumber: (v: number | null | undefined, d = 0) => fmtNumber(v, locale, d),
    fmtMGA: (v: number | null | undefined, d = 0) => fmtMGA(v, locale, d),
    fmtDate: (v: string | null | undefined) => fmtDate(v, locale),
    fmtDateTime: (v: string | null | undefined) => fmtDateTime(v, locale),
    fmtBytes: (v: number) => fmtBytes(v, locale),
    shortMonthLabel: (v: string) => shortMonthLabel(v, locale),
    timeAgoKey: (v: string | null | undefined) => timeAgoKey(v),
    timeAgo: (v: string | null | undefined) => timeAgo(v, t),
  }
}
