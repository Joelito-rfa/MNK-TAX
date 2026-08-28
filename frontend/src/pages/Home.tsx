import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { apiErrorMessage, apiPost } from '../lib/api'
import { Button, Field, Input } from '../components/ui'
import FallingMoney from '../components/FallingMoney'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import WhySection from '../components/landing/WhySection'
import Features from '../components/landing/Features'
import TaxCycle from '../components/landing/TaxCycle'
import Security from '../components/landing/Security'
import DashboardPreview from '../components/landing/DashboardPreview'
import { ForAgents, ForTaxpayers, Transparency } from '../components/landing/AudienceSections'
import FinalCTA from '../components/landing/FinalCTA'
import Footer from '../components/landing/Footer'

/* ── Schemas ── */
const requestAccessSchema = z.object({
  name: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  organization: z.string().min(2, "Le nom de l'organisation est requis"),
  role: z.string().min(1, 'Le rôle est requis'),
  message: z.string().optional(),
})

type RequestAccessForm = z.infer<typeof requestAccessSchema>

const roleOptions = ['Agent fiscal', 'Agent de recouvrement', 'Comptable', 'Administrateur', 'Autre']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [requestError, setRequestError] = useState('')

  const requestForm = useForm<RequestAccessForm>({ resolver: zodResolver(requestAccessSchema) })

  const registerMutation = useMutation({
    mutationFn: (data: RequestAccessForm) => apiPost('/auth/register', data),
    onSuccess: () => {
      setRequestSuccess(true)
      setTimeout(() => { setRequestOpen(false); setRequestSuccess(false); requestForm.reset() }, 3000)
    },
    onError: (err: Error) => setRequestError(apiErrorMessage(err)),
  })

  if (user) return <Navigate to="/dashboard" replace />

  function onRequestSubmit(values: RequestAccessForm) {
    setRequestError('')
    registerMutation.mutate(values)
  }

  return (
    <div className="relative min-h-screen bg-[#0f1117] text-slate-200">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <span className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-500/[0.06] blur-[100px]" />
        <span className="absolute right-[-200px] top-[30%] h-[400px] w-[400px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
        <span className="absolute bottom-[-200px] left-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        <FallingMoney />
      </div>

      <div className="relative z-10">
        <Navbar onLogin={() => navigate('/login')} onRequestAccess={() => setRequestOpen(true)} />
        <Hero onLogin={() => navigate('/login')} onRequestAccess={() => setRequestOpen(true)} />
        <WhySection />
        <Features />
        <TaxCycle />
        <Security />
        <DashboardPreview />
        <ForAgents onLogin={() => navigate('/login')} />
        <ForTaxpayers onRequestAccess={() => setRequestOpen(true)} />
        <Transparency />
        <FinalCTA onLogin={() => navigate('/login')} onRequestAccess={() => setRequestOpen(true)} />
        <Footer />
      </div>

      {/* ── MODAL REQUEST ACCESS ── */}
      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setRequestOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#181b25] border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Demander un accès</h3>
                <p className="mt-0.5 text-sm text-slate-500">Remplissez le formulaire pour obtenir un accès.</p>
              </div>
              <button onClick={() => setRequestOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {requestSuccess ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-white">Demande envoyée !</h4>
                <p className="mt-2 text-sm text-slate-500">Nous avons bien reçu votre demande.</p>
              </div>
            ) : (
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="px-6 py-5 space-y-4" noValidate>
                {requestError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{requestError}</div>
                )}
                <Field label="Nom complet">
                  <Input placeholder="ex : RAKOTO Jean" {...requestForm.register('name')} />
                  {requestForm.formState.errors.name && <p className="mt-1 text-xs text-rose-400">{requestForm.formState.errors.name.message}</p>}
                </Field>
                <Field label="Email">
                  <Input type="email" placeholder="ex : jean@example.mg" {...requestForm.register('email')} />
                  {requestForm.formState.errors.email && <p className="mt-1 text-xs text-rose-400">{requestForm.formState.errors.email.message}</p>}
                </Field>
                <Field label="Organisation">
                  <Input placeholder="ex : DGI Antananarivo" {...requestForm.register('organization')} />
                  {requestForm.formState.errors.organization && <p className="mt-1 text-xs text-rose-400">{requestForm.formState.errors.organization.message}</p>}
                </Field>
                <Field label="Rôle souhaité">
                  <select {...requestForm.register('role')} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10">
                    <option value="">Sélectionner un rôle</option>
                    {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {requestForm.formState.errors.role && <p className="mt-1 text-xs text-rose-400">{requestForm.formState.errors.role.message}</p>}
                </Field>
                <Field label="Message (optionnel)">
                  <textarea {...requestForm.register('message')} rows={3} placeholder="Décrivez brièvement votre besoin..."
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" />
                </Field>
                <Button type="submit" className="w-full rounded-xl" size="lg" loading={registerMutation.isPending} disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
