import { ArrowRight } from 'lucide-react'
import { Button } from '../ui'

export default function FinalCTA({ onLogin, onRequestAccess }: { onLogin: () => void; onRequestAccess: () => void }) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-brand-600/20 via-indigo-600/15 to-violet-600/10 p-12 text-center shadow-2xl backdrop-blur-xl sm:p-16">
          {/* Glow */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-brand-500/20 to-indigo-500/10 blur-2xl opacity-50" />

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
      </div>
    </section>
  )
}
