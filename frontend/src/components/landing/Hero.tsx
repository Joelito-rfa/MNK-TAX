import { ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react'
import { Button } from '../ui'

export default function Hero({ onLogin, onRequestAccess }: { onLogin: () => void; onRequestAccess: () => void }) {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-24 pb-20">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

      <div className="relative mx-auto max-w-7xl px-6 w-full">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — Text */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-700 backdrop-blur-sm dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              Gestion fiscale nouvelle génération
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              La gestion fiscale,
              <span className="mt-2 block bg-gradient-to-r from-brand-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-brand-400 dark:via-violet-400 dark:to-indigo-400">
                simplifiée et connectée.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Pilotez vos impôts avec précision. Centralisez contribuables, déclarations, paiements et recouvrements dans une seule plateforme sécurisée.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Button onClick={onLogin} size="lg"
                className="group rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-8 text-white shadow-xl shadow-brand-600/25 transition-all duration-200 hover:shadow-2xl hover:shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98]">
                Commencer
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
              <Button onClick={onRequestAccess} variant="secondary" size="lg"
                className="rounded-2xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                Demander un accès
              </Button>
            </div>

            {/* Trust */}
            <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sécurisé
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Traçable
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Responsive
              </span>
            </div>
          </div>

          {/* Right — Dashboard Preview */}
          <div className="relative animate-slide-in-right hidden lg:block">
            {/* Glow behind card */}
            <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-brand-500/20 to-indigo-500/10 blur-3xl" />

            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <img src="/logo.webp" alt="" className="h-6 w-6 rounded-lg" />
                  <span className="text-sm font-semibold text-white">MNK-TAX</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">Dashboard</span>
              </div>

              {/* KPI cards */}
              <div className="hero-kpi-grid grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Contribuables', value: '12 500+', color: 'text-brand-400' },
                  { label: 'Déclarations', value: '3 200+', color: 'text-emerald-400' },
                  { label: 'Recettes', value: '45 M Ar', color: 'text-violet-400' },
                  { label: 'Recouvrement', value: '87%', color: 'text-sky-400' },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                    <p className="text-[10px] font-medium text-slate-500">{kpi.label}</p>
                    <p className={`mt-1 text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400">Recettes mensuelles</p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <TrendingUp className="h-3 w-3" /> +12%
                  </div>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {[35, 55, 42, 68, 52, 75, 60, 82, 70, 88, 78, 95].map((h, i) => (
                    <div key={i} className="dash-bar-fill hero-bar flex-1 rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${h}%`,
                        background: i === 11
                          ? 'linear-gradient(to top, #6366f1, #818cf8)'
                          : 'rgba(99,102,241,0.15)',
                        animationDelay: `${0.5 + i * 0.06}s`,
                        ['--d' as string]: `${0.5 + i * 0.06}s`,
                      }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
