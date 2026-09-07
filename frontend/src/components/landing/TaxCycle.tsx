import { ArrowDown, ArrowRight } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const steps = [
  { label: 'Contribuable', sub: 'Inscription NIF' },
  { label: 'Déclaration', sub: 'Saisie & validation' },
  { label: 'Calcul fiscal', sub: 'Taux & barèmes' },
  { label: 'Validation', sub: 'Contrôle & approbation' },
  { label: 'Créance', sub: 'Génération dette' },
  { label: 'Paiement', sub: 'Enregistrement' },
  { label: 'Quittance', sub: 'Preuve de paiement' },
  { label: 'Recouvrement', sub: 'Suivi & relance' },
]

export default function TaxCycle() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Un workflow clair
              <span className="block text-brand-400">du début à la fin.</span>
            </h2>
            <p className="mt-4 text-slate-400">Chaque étape du cycle fiscal est traçable et gérée dans la plateforme.</p>
          </div>
        </ScrollReveal>

        {/* Desktop — horizontal */}
        <div className="hidden lg:flex items-center justify-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <ScrollReveal animation="blur-up" delay={i * 70}>
                <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/20 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-brand-500/5 w-32">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 text-sm font-bold">
                    {i + 1}
                  </div>
                  <p className="text-xs font-semibold text-white">{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{step.sub}</p>
                </div>
              </ScrollReveal>
              {i < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-500/30" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile — vertical */}
        <div className="lg:hidden flex flex-col items-center gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center">
              <ScrollReveal animation="blur-up" delay={i * 65}>
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 w-full max-w-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/20">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="text-[11px] text-slate-500">{step.sub}</p>
                  </div>
                </div>
              </ScrollReveal>
              {i < steps.length - 1 && (
                <ArrowDown className="h-4 w-4 my-1 text-brand-500/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
