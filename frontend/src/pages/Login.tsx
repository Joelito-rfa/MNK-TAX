import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { FileText, Fingerprint, Lock, ShieldCheck, TrendingDown, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { apiErrorMessage } from '../lib/api'
import { Button, Field, Input } from '../components/ui'

const schema = z.object({
  username: z.string().min(1, 'Le nom d\u2019utilisateur est requis.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
})

type FormValues = z.infer<typeof schema>

const features = [
  { icon: <FileText className="h-4.5 w-4.5" />, title: 'Déclarations fiscales', text: 'Saisie, suivi et validation des déclarations en quelques clics.' },
  { icon: <TrendingDown className="h-4.5 w-4.5" />, title: 'Créances & recouvrement', text: 'Suivi des impayés, relances et actions de recouvrement.' },
  { icon: <Fingerprint className="h-4.5 w-4.5" />, title: 'NIF & registre', text: 'Registre des contribuables avec Numéro d\u2019Identification Fiscale (NIF).' },
  { icon: <ShieldCheck className="h-4.5 w-4.5" />, title: 'Sécurité & audit', text: 'Authentification JWT, contrôle d\u2019accès par permission et journal d\u2019audit.' },
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/" replace />

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
    <div className="flex min-h-screen bg-slate-50">
      {/* Panneau gauche — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-600 p-12 lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-float-slow rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 animate-float rounded-full bg-brand-300/20 blur-3xl" />

        <div className="relative flex animate-fade-in items-center gap-3">
          <img src="/logo.webp" alt="MNK-TAX" className="h-11 w-11 rounded-xl object-contain shadow-lg shadow-brand-800/30" />
          <div>
            <p className="text-xl font-bold tracking-tight text-white">MNK-TAX</p>
            <p className="text-[11px] uppercase tracking-widest text-brand-200">Gestion des impôts</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="animate-slide-up text-4xl font-bold leading-tight tracking-tight text-white">
            Plateforme de gestion des obligations et du <span className="text-brand-200">recouvrement fiscal</span>
          </h1>
          <p className="mt-4 max-w-md animate-slide-up text-sm leading-relaxed text-brand-100" style={{ animationDelay: '0.12s' }}>
            Centralisez les déclarations, suivez les créances et pilotez le recouvrement des impôts à Madagascar.
          </p>

          <ul className="mt-10 space-y-5">
            {features.map((f, i) => (
              <li key={f.title} className="flex animate-slide-up items-start gap-3" style={{ animationDelay: `${0.22 + i * 0.1}s` }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/30 text-white">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-sm text-brand-100">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/60">
          Prototype académique — données fictives. Ne constitue pas un système officiel.
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-slide-in-right">
          <div className="mb-8 flex animate-fade-in flex-col items-center gap-2 lg:hidden">
            <img src="/logo.webp" alt="MNK-TAX" className="h-12 w-12 rounded-xl object-contain shadow-lg shadow-brand-500/20" />
            <h1 className="mt-2 text-2xl font-bold text-slate-900">MNK-TAX</h1>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500">Accédez à votre espace de gestion fiscale.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            {error && (
              <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <Field label="Nom d\u2019utilisateur">
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder="ex : admin" autoComplete="username" {...register('username')} />
              </div>
              {errors.username && <p className="mt-1 text-xs text-rose-600">{errors.username.message}</p>}
            </Field>

            <Field label="Mot de passe">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" type="password" placeholder="••••••••" autoComplete="current-password" {...register('password')} />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
            </Field>

            <Button type="submit" disabled={submitting} loading={submitting} className="w-full" size="lg">
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            Prototype académique — données fictives.
          </p>
        </div>
      </div>
    </div>
  )
}
