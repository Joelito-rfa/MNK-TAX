import { ArrowRight, CheckCircle2, Search, ShieldCheck, FileText, MessageSquare, ClipboardList, BarChart3 } from 'lucide-react'
import { Button } from '../ui'

export function ForAgents({ onLogin }: { onLogin: () => void }) {
  const features = [
    { icon: Search, text: 'Recherche rapide de contribuables' },
    { icon: FileText, text: 'Validation des déclarations' },
    { icon: ShieldCheck, text: 'Suivi des créances' },
    { icon: ClipboardList, text: 'Contrôle fiscal ciblé' },
    { icon: MessageSquare, text: 'Messagerie intégrée' },
    { icon: BarChart3, text: 'Reporting et statistiques' },
  ]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Conçu pour les agents,
              <span className="block text-brand-400">pensé pour la performance.</span>
            </h2>
            <p className="mt-4 text-slate-400">Outils puissants pour gérer efficacement vos opérations fiscales au quotidien.</p>
            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                  <f.icon className="h-4 w-4 shrink-0 text-brand-400" />
                  {f.text}
                </li>
              ))}
            </ul>
            <Button onClick={onLogin} size="lg" className="mt-8 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-8 text-white shadow-xl shadow-brand-600/25">
              Accéder à la plateforme <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl">
              <div className="space-y-3">
                {['Déclaration TVA en cours de validation', 'Nouvelle créance IRSA détectée', 'Paiement reçu — 2 500 000 Ar', 'Contrôle fiscal planifié'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-xs text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ForTaxpayers({ onRequestAccess }: { onRequestAccess: () => void }) {
  const features = [
    'Déclarations fiscales',
    'Échéances à venir',
    'Paiements en ligne',
    'Quittances téléchargeables',
    'Messagerie avec l\'administration',
    'Réclamations',
  ]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3">
                {features.map((f) => (
                  <div key={f} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    <span className="text-xs text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Un accès plus simple
              <span className="block text-brand-400">à vos obligations fiscales.</span>
            </h2>
            <p className="mt-4 text-slate-400">Consultez vos déclarations, échéances et paiements depuis une interface intuitive.</p>
            <Button onClick={onRequestAccess} size="lg" variant="secondary" className="mt-8 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10">
              Demander un accès <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Transparency() {
  const items = [
    'Chaque action est traçable.',
    'Chaque opération est historisée.',
    'Chaque paiement peut être vérifié.',
  ]
  const steps = ['Action', 'Audit', 'Historique', 'Vérification']

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Chaque action est traçable.
            </h2>
            <p className="mt-4 text-slate-400">Journal d'audit complet pour chaque opération effectuée dans le système.</p>
            <ul className="mt-8 space-y-4">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-brand-400">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-white">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
