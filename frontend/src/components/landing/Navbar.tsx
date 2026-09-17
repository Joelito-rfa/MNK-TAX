import { useState, useEffect } from 'react'
import { Globe, Menu, Moon, Sun, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui'
import { useTheme } from '../../lib/theme'
import { useI18n, type Locale } from '../../lib/i18n'

const navLinks = [
  { labelKey: 'nav.home', href: '#hero', key: 'home' },
  { labelKey: 'nav.features', href: '#features', key: 'features' },
  { labelKey: 'nav.security', href: '#security', key: 'security' },
  { labelKey: 'nav.about', href: '#about', key: 'about' },
]

const languages: { code: Locale; labelKey: string; initial: string; color: string; flag: string }[] = [
  { code: 'fr', labelKey: 'lang.fr', initial: 'FR', color: 'bg-blue-600', flag: '🇫🇷' },
  { code: 'mg', labelKey: 'lang.mg', initial: 'MG', color: 'bg-emerald-600', flag: '🇲🇬' },
  { code: 'en', labelKey: 'lang.en', initial: 'EN', color: 'bg-rose-600', flag: '🇬🇧' },
]

export default function Navbar({ onLogin, onRequestAccess }: { onLogin: () => void; onRequestAccess: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [active, setActive] = useState<string>('#hero')
  const { resolved, toggle: cycleTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setActive(window.location.hash || '#hero')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const currentLang = languages.find((l) => l.code === locale)

  const langMenu = (
    <div className="relative">
      <button
        onClick={() => setLangOpen((o) => !o)}
        className="nav-anim-btn flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        aria-label={t('nav.language')}
      >
        <Globe className="h-4 w-4" />
        {currentLang && (
          <span key={currentLang.code} className="nav-lang-flag text-sm leading-none">{currentLang.flag}</span>
        )}
      </button>
      {langOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
          <div className="nav-lang-menu absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-popover dark:border-white/10 dark:bg-slate-900">
            <div className="p-1.5">
              {languages.map((lang, i) => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code); setLangOpen(false) }}
                  className={`nav-lang-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    locale === lang.code
                      ? 'bg-brand-600/10 font-semibold text-brand-700 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                  style={{ ['--d' as string]: `${i * 45}ms` }}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{t(lang.labelKey)}</span>
                  {locale === lang.code && <span className="ml-auto text-brand-600 dark:text-brand-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'border-b border-slate-200 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1117]/85 dark:shadow-black/10'
        : 'bg-transparent'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="#hero" className="flex items-center gap-3 group">
          <img src="/logo.webp" alt="MNK-TAX" className="h-9 w-9 rounded-xl object-contain shadow-lg shadow-brand-800/20 transition-transform duration-200 group-hover:scale-105" />
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">MNK-TAX</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Gestion des impôts</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a key={link.key}
              href={link.href}
              aria-current={active === link.href ? 'true' : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                active === link.href ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}>
              {t(link.labelKey)}
            </a>
          ))}
        </div>

        {/* Desktop CTA + theme + langue */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            onClick={cycleTheme}
            className="nav-anim-btn rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            aria-label={resolved === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
          >
            <span key={resolved} className="nav-theme-icon">
              {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </span>
          </button>
          {langMenu}
          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />
          <button onClick={onRequestAccess}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white">
            {t('nav.requestAccess')}
          </button>
          <Button onClick={onLogin} size="sm" className="rounded-xl">
            {t('nav.login')}
          </Button>
        </div>

        {/* Mobile : theme + langue + toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={cycleTheme}
            className="nav-anim-btn rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            aria-label={resolved === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
          >
            <span key={resolved} className="nav-theme-icon">
              {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </span>
          </button>
          {langMenu}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-[#0f1117]/95">
          <div className="space-y-1 px-6 py-4">
{navLinks.map((link) => (
              <a key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active === link.href ? 'true' : undefined}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active === link.href ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}>
                {t(link.labelKey)}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
              <button onClick={() => { onRequestAccess(); setMobileOpen(false) }}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white">
                {t('nav.requestAccess')}
              </button>
              <Button onClick={() => { onLogin(); setMobileOpen(false) }} size="sm" className="w-full rounded-xl">
                {t('nav.login')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
