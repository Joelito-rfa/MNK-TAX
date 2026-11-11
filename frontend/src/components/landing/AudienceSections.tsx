import { ArrowRight, CheckCircle2, Search, ShieldCheck, FileText, MessageSquare, ClipboardList, BarChart3 } from 'lucide-react'
import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

export function ForAgents({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n()
  const features = [
    { icon: Search, textKey: 'landing.agents.feature.search' },
    { icon: FileText, textKey: 'landing.agents.feature.validate' },
    { icon: ShieldCheck, textKey: 'landing.agents.feature.debts' },
    { icon: ClipboardList, textKey: 'landing.agents.feature.control' },
    { icon: MessageSquare, textKey: 'landing.agents.feature.messaging' },
    { icon: BarChart3, textKey: 'landing.agents.feature.reporting' },
  ]
  const notifications = [
    'landing.agents.notification.vat',
    'landing.agents.notification.debt',
    'landing.agents.notification.payment',
    'landing.agents.notification.control',
  ]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <ScrollReveal animation="blur-up">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('landing.agents.titleLine1')}
                <span className="block text-brand-400">{t('landing.agents.titleLine2')}</span>
              </h2>
              <p className="mt-4 text-slate-400">{t('landing.agents.description')}</p>
              <ul className="mt-8 space-y-3">
                {features.map((f, i) => (
                  <ScrollReveal key={f.textKey} animation="blur-up" delay={100 + i * 60}>
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <f.icon className="h-4 w-4 shrink-0 text-brand-400" />
                      {t(f.textKey)}
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
              <Button onClick={onLogin} size="lg" className="mt-8 rounded-2xl bg-brand-600 px-8 text-white shadow-xl shadow-brand-600/25">
                {t('landing.agents.cta')} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="slide-left" delay={200}>
            <div className="hidden lg:block">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl">
                <div className="space-y-3">
                  {notifications.map((key, i) => (
                    <ScrollReveal key={key} animation="blur-up" delay={300 + i * 80}>
                      <div className="notif-row flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3"
                        style={{ ['--d' as string]: `${i * 1.5}s` }}>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="text-xs text-slate-300">{t(key)}</span>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export function ForTaxpayers({ onRequestAccess }: { onRequestAccess: () => void }) {
  const { t } = useI18n()
  const featureKeys = [
    'landing.taxpayers.feature.declarations',
    'landing.taxpayers.feature.deadlines',
    'landing.taxpayers.feature.payments',
    'landing.taxpayers.feature.receipts',
    'landing.taxpayers.feature.messages',
    'landing.taxpayers.feature.complaints',
  ]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <ScrollReveal animation="slide-right" delay={100}>
            <div className="hidden lg:block">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-3">
                  {featureKeys.map((key, i) => (
                    <ScrollReveal key={key} animation="blur-up" delay={200 + i * 70}>
                      <div className="notif-row flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3"
                        style={{ ['--d' as string]: `${i * 1.2}s` }}>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                        <span className="text-xs text-slate-300">{t(key)}</span>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="blur-up">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('landing.taxpayers.titleLine1')}
                <span className="block text-brand-400">{t('landing.taxpayers.titleLine2')}</span>
              </h2>
              <p className="mt-4 text-slate-400">{t('landing.taxpayers.description')}</p>
              <Button onClick={onRequestAccess} size="lg" variant="secondary" className="mt-8 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10">
                {t('landing.taxpayers.cta')} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export function Transparency() {
  const { t } = useI18n()
  const itemKeys = [
    'landing.transparency.item1',
    'landing.transparency.item2',
    'landing.transparency.item3',
  ]
  const stepKeys = [
    'landing.transparency.step.action',
    'landing.transparency.step.audit',
    'landing.transparency.step.history',
    'landing.transparency.step.verification',
  ]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <ScrollReveal animation="blur-up">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('landing.transparency.title')}
              </h2>
              <p className="mt-4 text-slate-400">{t('landing.transparency.description')}</p>
              <ul className="mt-8 space-y-4">
                {itemKeys.map((key, i) => (
                  <ScrollReveal key={key} animation="blur-up" delay={100 + i * 80}>
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      {t(key)}
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="slide-left" delay={150}>
            <div className="flex flex-col items-start gap-3">
              {stepKeys.map((key, i) => (
                <ScrollReveal key={key} animation="blur-up" delay={200 + i * 90}>
                  <div className="flex items-center gap-4">
                    <div className="audit-step flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-brand-400"
                      style={{ ['--d' as string]: `${i * 1.2}s` }}>
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-white">{t(key)}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
