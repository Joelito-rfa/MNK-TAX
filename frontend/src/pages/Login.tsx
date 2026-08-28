import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { FileText, Fingerprint, Lock, ShieldCheck, TrendingDown, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useI18n, type Locale } from '../lib/i18n'
import { apiErrorMessage } from '../lib/api'
import { Button, Field, Input } from '../components/ui'
import FallingMoney from '../components/FallingMoney'
import FiscalAnimation from '../components/FiscalAnimation'
import { Globe } from 'lucide-react'

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

const schema = z.object({
  username: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
})

type FormValues = z.infer<typeof schema>

const featureKeys = [
  { titleKey: 'login.feature.declarations.title', textKey: 'login.feature.declarations.text', Icon: FileText },
  { titleKey: 'login.feature.recouvrement.title', textKey: 'login.feature.recouvrement.text', Icon: TrendingDown },
  { titleKey: 'login.feature.nif.title', textKey: 'login.feature.nif.text', Icon: Fingerprint },
  { titleKey: 'login.feature.securite.title', textKey: 'login.feature.securite.text', Icon: ShieldCheck },
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t } = useI18n()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/dashboard" replace />

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  async function onSubmit(values: FormValues) {
    setError('')
    setSubmitting(true)
    try {
      await login(values)
      navigate(from, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-[#0f1117]">
      {/* Fond animé global du site */}
      <div className="site-bg site-bg-static" aria-hidden="true">
        <span className="site-bg-orb site-bg-orb-1" />
        <span className="site-bg-orb site-bg-orb-2" />
        <span className="site-bg-orb site-bg-orb-3" />
        <FallingMoney />
      </div>

      {/* Panneau gauche — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <FiscalAnimation />
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-float-slow rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 animate-float rounded-full bg-brand-300/10 blur-3xl" />

        <div className="relative z-10 flex animate-fade-in items-center gap-3">
          <span className="brand-scrim" aria-hidden="true" />
          <img src="/logo.webp" alt="MNK-TAX" className="h-11 w-11 rounded-xl object-contain shadow-lg shadow-brand-800/30" />
          <div>
            <p className="text-xl font-bold tracking-tight text-white">{t('sidebar.brand')}</p>
            <p className="text-[11px] uppercase tracking-widest text-brand-200">{t('login.brand.subtitle')}</p>
          </div>
        </div>

        <div className="relative z-10">
          <span className="brand-scrim" aria-hidden="true" />
          <h1 className="animate-slide-up text-4xl font-bold leading-tight tracking-tight text-white">
            {t('login.hero.title')} <span className="text-brand-200">{t('login.hero.highlight')}</span>
          </h1>
          <p className="mt-4 max-w-md animate-slide-up text-sm leading-relaxed text-brand-100" style={{ animationDelay: '0.12s' }}>
            {t('login.hero.text')}
          </p>

          <ul className="mt-10 space-y-5">
            {featureKeys.map((f, i) => (
              <li key={f.titleKey} className="flex animate-slide-up items-start gap-3" style={{ animationDelay: `${0.22 + i * 0.1}s` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/30 text-white">
                  <f.Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t(f.titleKey)}</p>
                  <p className="mt-0.5 text-sm text-brand-100">{t(f.textKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-brand-200/60">
          <span className="brand-scrim" aria-hidden="true" />
          {t('login.prototype')}
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="login-panel w-full max-w-sm animate-slide-in-right">
          <div className="mb-8 flex animate-fade-in flex-col items-center gap-2 lg:hidden">
            <img src="/logo.webp" alt="MNK-TAX" className="h-12 w-12 rounded-xl object-contain shadow-lg shadow-brand-500/20" />
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('sidebar.brand')}</h1>
          </div>

          <div className="mb-6 flex justify-end lg:justify-between items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('login.title')}</h2>
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={t('login.language')}
              >
                <Globe className="h-4 w-4" />
                <span className="text-lg leading-none">{languages.find((l) => l.code === locale)?.flag}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 animate-scale-in rounded-2xl border border-slate-200/80 bg-white shadow-popover dark:border-slate-700/50 dark:bg-slate-800">
                  <div className="p-1.5">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLocale(lang.code); setLangOpen(false) }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          locale === lang.code
                            ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-xl leading-none">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {locale === lang.code && <span className="ml-auto text-brand-500 dark:text-brand-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            {error && (
              <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                {error}
              </div>
            )}

            <Field label={t('login.username')}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder={t('login.username.placeholder')} autoComplete="username" {...register('username')} />
              </div>
              {errors.username && <p className="mt-1 text-xs text-rose-600">{t('login.username.required')}</p>}
            </Field>

            <Field label={t('login.password')}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" type="password" placeholder={t('login.password.placeholder')} autoComplete="current-password" {...register('password')} />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{t('login.password.required')}</p>}
            </Field>

            <Button type="submit" disabled={submitting} loading={submitting} className="w-full" size="lg">
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 lg:hidden">
            {t('login.prototype')}
          </p>
        </div>
      </div>
    </div>
  )
}
