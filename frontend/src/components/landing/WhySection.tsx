import { FileText, Receipt, TrendingDown, Users } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

const reasons = [
  { icon: Users, titleKey: 'landing.why.taxpayers.title', descriptionKey: 'landing.why.taxpayers.description', color: 'bg-brand-500/10 text-brand-400' },
  { icon: FileText, titleKey: 'landing.why.declarations.title', descriptionKey: 'landing.why.declarations.description', color: 'bg-violet-500/10 text-violet-400' },
  { icon: Receipt, titleKey: 'landing.why.payments.title', descriptionKey: 'landing.why.payments.description', color: 'bg-emerald-500/10 text-emerald-400' },
  { icon: TrendingDown, titleKey: 'landing.why.collection.title', descriptionKey: 'landing.why.collection.description', color: 'bg-sky-500/10 text-sky-400' },
]

export default function WhySection() {
  const { t } = useI18n()

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('landing.why.titleLine1')}
              <span className="block text-brand-400">{t('landing.why.titleLine2')}</span>
            </h2>
          </div>
        </ScrollReveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => (
            <ScrollReveal key={r.titleKey} animation="blur-up" delay={i * 90}>
              <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:border-brand-500/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${r.color}`}>
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{t(r.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(r.descriptionKey)}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
