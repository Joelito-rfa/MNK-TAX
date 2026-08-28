import { FileText, Receipt, TrendingDown, Users } from 'lucide-react'

const reasons = [
  { icon: Users, title: 'Contribuables', description: 'Gestion centralisée des contribuables et entreprises assujetties.', color: 'bg-brand-500/10 text-brand-400' },
  { icon: FileText, title: 'Déclarations', description: 'Cycle complet de déclaration, validation et suivi en temps réel.', color: 'bg-violet-500/10 text-violet-400' },
  { icon: Receipt, title: 'Paiements', description: 'Enregistrement des paiements et génération automatique des quittances.', color: 'bg-emerald-500/10 text-emerald-400' },
  { icon: TrendingDown, title: 'Recouvrement', description: 'Suivi des créances, relances et actions de recouvrement efficaces.', color: 'bg-sky-500/10 text-sky-400' },
]

export default function WhySection() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Une plateforme pensée
            <span className="block text-brand-400">pour simplifier chaque étape fiscale.</span>
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <div key={r.title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:border-brand-500/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${r.color}`}>
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
