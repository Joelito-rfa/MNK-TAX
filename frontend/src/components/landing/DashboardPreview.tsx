import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Users, FileText, Wallet, BarChart3, CreditCard } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const kpis = [
  { icon: Users, label: 'Contribuables', value: '12 500+', trend: '+8%', color: 'text-brand-400 bg-brand-500/10' },
  { icon: FileText, label: 'Déclarations', value: '3 200', trend: '+12%', color: 'text-violet-400 bg-violet-500/10' },
  { icon: Wallet, label: 'Recettes', value: '45 M Ar', trend: '+15%', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: TrendingUp, label: 'Recouvrement', value: '87%', trend: '+3%', color: 'text-sky-400 bg-sky-500/10' },
  { icon: CreditCard, label: 'Paiements', value: '1 245', trend: '+22%', color: 'text-amber-400 bg-amber-500/10' },
  { icon: BarChart3, label: 'Créances', value: '12 M Ar', trend: '-5%', color: 'text-rose-400 bg-rose-500/10' },
]

const chartData = [30, 45, 38, 62, 48, 70, 55, 78, 65, 85, 72, 92]

export default function DashboardPreview() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className={`dash-scope relative py-24${visible ? ' is-visible' : ''}`}>
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Une vision claire
              <span className="block text-brand-400">de votre activité fiscale.</span>
            </h2>
            <p className="mt-4 text-slate-400 text-sm">Données de démonstration — prototype académique.</p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="blur-in" delay={200}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500/10 to-indigo-500/5 blur-2xl" />
            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <img src="/logo.webp" alt="MNK-TAX" className="h-8 w-8 rounded-lg" />
                  <div>
                    <p className="text-sm font-semibold text-white">MNK-TAX Dashboard</p>
                    <p className="text-[11px] text-slate-500">Vue globale — Janvier 2026</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  En ligne
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
                {kpis.map((kpi, i) => (
                  <ScrollReveal key={kpi.label} animation="blur-up" delay={300 + i * 50}>
                    <div className="dash-kpi rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 transition-all duration-300 hover:border-white/[0.12]"
                      style={{ ['--d' as string]: `${i * 70}ms` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${kpi.color}`}>
                          <kpi.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">{kpi.label}</span>
                      </div>
                      <p className="text-xl font-bold text-white">{kpi.value}</p>
                      <span className={`text-[10px] font-medium ${kpi.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {kpi.trend} ce mois
                      </span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-slate-300">Recettes mensuelles</p>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <TrendingUp className="h-3.5 w-3.5" /> +12% vs année précédente
                  </div>
                </div>
                <div className="relative">
                  <div className="dash-grid" aria-hidden="true">
                    <span /><span /><span /><span /><span />
                  </div>
                  <div className="relative flex items-end gap-2 h-32 sm:h-40">
                    {chartData.map((h, i) => (
                      <div key={i} className="dash-bar group/bar relative flex-1 self-stretch"
                        style={{ ['--d' as string]: `${i * 80}ms` }}>
                        <span className="dash-tip">{h} M Ar</span>
                        <div className={`dash-bar-fill absolute inset-x-0 bottom-0 rounded-t-md transition-all duration-500 ease-out${i === chartData.length - 1 ? ' dash-bar-max' : ''}`}
                          style={{
                            height: `${h}%`,
                            background: i === chartData.length - 1
                              ? 'linear-gradient(to top, #6366f1, #818cf8)'
                              : 'linear-gradient(to top, rgba(99,102,241,0.12), rgba(99,102,241,0.25))',
                          }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                  <span>Jan</span><span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Jun</span>
                  <span>Jul</span><span>Aoû</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Déc</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
