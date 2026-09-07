import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useI18n, type Locale } from '../lib/i18n'
import { apiErrorMessage, apiPost } from '../lib/api'
import { Button, Field, Input } from '../components/ui'
import FallingMoney from '../components/FallingMoney'
import { FileSearch, ShieldCheck, UserPlus } from 'lucide-react'
import { Globe } from 'lucide-react'

const languages: { code: Locale; label: string; initial: string; color: string; flag: string }[] = [
  { code: 'fr', label: 'Français', initial: 'FR', color: 'bg-blue-600', flag: '🇫🇷' },
  { code: 'mg', label: 'Malagasy', initial: 'MG', color: 'bg-emerald-600', flag: '🇲🇬' },
  { code: 'en', label: 'English', initial: 'EN', color: 'bg-rose-600', flag: '🇬🇧' },
]

const schema = z.object({
  name: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  organization: z.string().min(2, "Le nom de l'organisation est requis"),
  role: z.string().min(1, 'Le rôle est requis'),
  message: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const roleOptions = ['Agent fiscal', 'Agent de recouvrement', 'Comptable', 'Administrateur', 'Autre']



export default function Register() {
  const { user } = useAuth()
  const [langOpen, setLangOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => apiPost('/auth/register', data),
    onSuccess: () => setSuccess(true),
    onError: (err: Error) => setError(apiErrorMessage(err)),
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  function onSubmit(values: FormValues) {
    setError('')
    mutation.mutate(values)
  }

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-[#0f1117]">
      {/* Language switcher at top right */}
      <div className="absolute top-4 right-4 z-20" ref={langRef}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={t('login.language')}
        >
          <Globe className="h-4 w-4" />
          {(() => { const l = languages.find((x) => x.code === locale); return l ? (
            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white ${l.color}`}>{l.flag}</span>
          ) : null })()}
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
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${lang.color}`}>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {locale === lang.code && <span className="ml-auto text-brand-500 dark:text-brand-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fond animé global du site */}
      <div className="site-bg site-bg-static" aria-hidden="true">
        <span className="site-bg-orb site-bg-orb-1" />
        <span className="site-bg-orb site-bg-orb-2" />
        <span className="site-bg-orb site-bg-orb-3" />
        <FallingMoney />
      </div>

      {/* Panneau gauche — branding register */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-sidebar to-brand-900 p-12 lg:flex">
        {/* Orbes lumineuses */}
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-float-slow rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 animate-float rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        {/* Formes flottantes décoratives */}
        <div className="absolute right-16 top-24 h-16 w-16 animate-float rounded-2xl border border-indigo-400/20 bg-indigo-500/10" style={{ animationDelay: '0s', animationDuration: '7s' }} />
        <div className="absolute right-32 top-1/3 h-10 w-10 animate-float rounded-xl border border-brand-300/20 bg-brand-400/10" style={{ animationDelay: '1.5s', animationDuration: '5s' }} />
        <div className="absolute left-8 top-1/2 h-12 w-12 animate-float rounded-full border border-emerald-400/20 bg-emerald-500/10" style={{ animationDelay: '0.8s', animationDuration: '6s' }} />
        <div className="absolute bottom-32 right-20 h-8 w-8 animate-float rounded-lg border border-indigo-300/20 bg-indigo-400/10" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute left-1/3 top-20 h-6 w-6 animate-float rounded-full border border-white/10 bg-white/5" style={{ animationDelay: '3s', animationDuration: '9s' }} />
        <div className="absolute bottom-48 left-16 h-14 w-14 animate-float-slow rounded-2xl border border-brand-300/15 bg-brand-500/5" style={{ animationDelay: '1s' }} />
        <div className="absolute right-1/4 bottom-24 h-20 w-20 animate-float rounded-3xl border border-indigo-300/10 bg-indigo-500/5" style={{ animationDelay: '2.5s', animationDuration: '10s' }} />

        <div className="relative z-10 flex animate-fade-in items-center gap-3">
          <span className="brand-scrim" aria-hidden="true" />
          <img src="/logo.webp" alt="MNK-TAX" className="h-11 w-11 rounded-xl object-contain shadow-lg shadow-brand-800/30" />
          <div>
            <p className="text-xl font-bold tracking-tight text-white">{t('sidebar.brand')}</p>
            <p className="text-[11px] uppercase tracking-widest text-indigo-200">{t('login.brand.subtitle')}</p>
          </div>
        </div>

        <div className="relative z-10">
          <span className="brand-scrim" aria-hidden="true" />
          <h1 className="animate-slide-up text-4xl font-bold leading-tight tracking-tight text-white">
            {t('login.register.hero.title')} <span className="text-indigo-300">{t('login.register.hero.highlight')}</span>
          </h1>
          <p className="mt-4 max-w-md animate-slide-up text-sm leading-relaxed text-indigo-100" style={{ animationDelay: '0.12s' }}>
            {t('login.register.hero.text')}
          </p>

          <div className="mt-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">{t('login.register.steps.title')}</p>
            {[
              { icon: UserPlus, step: 'login.register.step.1', text: 'login.register.step.1.text' },
              { icon: ShieldCheck, step: 'login.register.step.2', text: 'login.register.step.2.text' },
              { icon: FileSearch, step: 'login.register.step.3', text: 'login.register.step.3.text' },
            ].map((s, i) => (
              <div key={s.step} className="flex animate-slide-up items-start gap-3" style={{ animationDelay: `${0.22 + i * 0.12}s` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-white">
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t(s.step)}</p>
                  <p className="mt-0.5 text-sm text-indigo-200">{t(s.text)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-200/60">
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

          {success ? (
            /* ── SUCCÈS ── */
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('login.register.success.title')}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('login.register.success.text')}</p>
              <Link to="/login" className="mt-6">
                <Button variant="secondary">{t('login.register.back')}</Button>
              </Link>
            </div>
          ) : (
            /* ── FORMULAIRE ── */
            <>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('login.register.title')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('login.register.subtitle')}</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                {error && (
                  <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                    {error}
                  </div>
                )}

                <Field label={t('login.register.name')}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-10" placeholder={t('login.register.name.placeholder')} {...register('name')} />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
                </Field>

                <Field label={t('login.register.email')}>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <Input className="pl-10" type="email" placeholder={t('login.register.email.placeholder')} {...register('email')} />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
                </Field>

                <Field label={t('login.register.organization')}>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <Input className="pl-10" placeholder={t('login.register.organization.placeholder')} {...register('organization')} />
                  </div>
                  {errors.organization && <p className="mt-1 text-xs text-rose-600">{errors.organization.message}</p>}
                </Field>

                <Field label={t('login.register.role')}>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select {...register('role')} className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                      <option value="">{t('login.register.role.placeholder')}</option>
                      {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role.message}</p>}
                </Field>

                <Field label={t('login.register.message')}>
                  <textarea
                    {...register('message')}
                    rows={3}
                    placeholder={t('login.register.message.placeholder')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </Field>

                <Button type="submit" disabled={mutation.isPending} loading={mutation.isPending} className="w-full" size="lg">
                  {mutation.isPending ? t('login.register.submitting') : t('login.register.submit')}
                </Button>
              </form>
            </>
          )}

          {/* Lien retour connexion */}
          {!success && (
            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                {t('login.hasAccount')}{' '}
                <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                  {t('login.submit')}
                </Link>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 lg:hidden">
            {t('login.prototype')}
          </p>
        </div>
      </div>
    </div>
  )
}
