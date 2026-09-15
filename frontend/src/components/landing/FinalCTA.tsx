import { ArrowRight } from 'lucide-react'
import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'

export default function FinalCTA({ onLogin, onRequestAccess }: { onLogin: () => void; onRequestAccess: () => void }) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <ScrollReveal animation="blur-in">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-brand-600/10 p-12 text-center shadow-2xl backdrop-blur-xl sm:p-16">
            <div className="absolute -inset-1 rounded-3xl bg-brand-500/5 blur-2xl opacity-50" />
            <span className="cta-orb -left-16 -top-16 h-64 w-64 bg-brand-500/25" aria-hidden="true" />
            <span className="cta-orb -bottom-20 -right-12 h-72 w-72 bg-violet-500/20" style={{ animationDelay: '-7s' }} aria-hidden="true" />
            <span className="cta-orb left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 bg-emerald-400/10" style={{ animationDelay: '-3.5s' }} aria-hidden="true" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Prêt à moderniser
                <span className="block text-brand-300">votre gestion fiscale ?</span>
              </h2>
              <p className="mt-4 max-w-lg mx-auto text-slate-400">
                Centralisez vos données. Suivez vos obligations. Maîtrisez vos recouvrements.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button onClick={onLogin} size="lg"
                  className="group rounded-2xl bg-white px-8 text-brand-700 shadow-xl shadow-black/10 transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]">
                  Commencer
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
                <Button onClick={onRequestAccess} variant="secondary" size="lg"
                  className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20">
                  Demander un accès
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
