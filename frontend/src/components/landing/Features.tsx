import {
  BadgeCheck, Calculator, CalendarDays, ClipboardList, FileText, FolderCog, HandCoins, Landmark, MessageSquare, Receipt, SearchCheck, Settings2, Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

const featured = {
  icon: FileText,
  titleKey: 'landing.features.featured.title',
  subtitleKey: 'landing.features.featured.subtitle',
  descKey: 'landing.features.featured.description',
  path: '/declarations',
  visualKeys: [
    'landing.features.featured.visual.draft',
    'landing.features.featured.visual.submitted',
    'landing.features.featured.visual.validated',
  ],
}

const tranches = [
  {
    id: 'gestion',
    icon: Settings2,
    titleKey: 'landing.features.gestion.title',
    tagKey: 'landing.features.gestion.tag',
    descKey: 'landing.features.gestion.description',
    color: 'text-brand-400 bg-brand-500/10',
    cards: [
      {
        icon: Users,
        titleKey: 'landing.features.gestion.taxpayers.title',
        tagKey: 'landing.features.gestion.taxpayers.tag',
        descKey: 'landing.features.gestion.taxpayers.description',
        color: 'text-brand-400 bg-brand-500/10',
        chipKeys: [
          'landing.features.gestion.taxpayers.chip.nif',
          'landing.features.gestion.taxpayers.chip.regime',
          'landing.features.gestion.taxpayers.chip.center',
          'landing.features.gestion.taxpayers.chip.status',
        ],
        path: '/taxpayers',
      },
      {
        icon: HandCoins,
        titleKey: 'landing.features.gestion.payments.title',
        tagKey: 'landing.features.gestion.payments.tag',
        descKey: 'landing.features.gestion.payments.description',
        color: 'text-emerald-400 bg-emerald-500/10',
        chipKeys: [
          'landing.features.gestion.payments.chip.payment',
          'landing.features.gestion.payments.chip.allocation',
          'landing.features.gestion.payments.chip.balance',
        ],
        path: '/payments',
      },
      {
        icon: Landmark,
        titleKey: 'landing.features.gestion.debts.title',
        tagKey: 'landing.features.gestion.debts.tag',
        descKey: 'landing.features.gestion.debts.description',
        color: 'text-rose-400 bg-rose-500/10',
        chipKeys: [
          'landing.features.gestion.debts.chip.principal',
          'landing.features.gestion.debts.chip.penalties',
          'landing.features.gestion.debts.chip.interest',
          'landing.features.gestion.debts.chip.balance',
        ],
        path: '/debts',
      },
    ],
  },
  {
    id: 'referentiels',
    icon: FolderCog,
    titleKey: 'landing.features.referentiels.title',
    tagKey: 'landing.features.referentiels.tag',
    descKey: 'landing.features.referentiels.description',
    color: 'text-violet-400 bg-violet-500/10',
    cards: [
      {
        icon: Calculator,
        titleKey: 'landing.features.referentiels.taxCalculation.title',
        tagKey: 'landing.features.referentiels.taxCalculation.tag',
        descKey: 'landing.features.referentiels.taxCalculation.description',
        color: 'text-violet-400 bg-violet-500/10',
        chipKeys: [
          'landing.features.referentiels.taxCalculation.chip.base',
          'landing.features.referentiels.taxCalculation.chip.rule',
          'landing.features.referentiels.taxCalculation.chip.calculated',
        ],
        path: '/tax-rules',
      },
      {
        icon: CalendarDays,
        titleKey: 'landing.features.referentiels.calendar.title',
        tagKey: 'landing.features.referentiels.calendar.tag',
        descKey: 'landing.features.referentiels.calendar.description',
        color: 'text-amber-400 bg-amber-500/10',
        chipKeys: [
          'landing.features.referentiels.calendar.chip.period',
          'landing.features.referentiels.calendar.chip.deadline',
          'landing.features.referentiels.calendar.chip.status',
          'landing.features.referentiels.calendar.chip.late',
        ],
        path: '/deadlines',
      },
      {
        icon: Receipt,
        titleKey: 'landing.features.referentiels.receipts.title',
        tagKey: 'landing.features.referentiels.receipts.tag',
        descKey: 'landing.features.referentiels.receipts.description',
        color: 'text-sky-400 bg-sky-500/10',
        chipKeys: [
          'landing.features.referentiels.receipts.chip.reference',
          'landing.features.referentiels.receipts.chip.qr',
          'landing.features.referentiels.receipts.chip.pdf',
        ],
        path: '/receipts',
      },
    ],
  },
  {
    id: 'administration',
    icon: ClipboardList,
    titleKey: 'landing.features.administration.title',
    tagKey: 'landing.features.administration.tag',
    descKey: 'landing.features.administration.description',
    color: 'text-indigo-400 bg-indigo-500/10',
    cards: [
      {
        icon: SearchCheck,
        titleKey: 'landing.features.administration.collection.title',
        tagKey: 'landing.features.administration.collection.tag',
        descKey: 'landing.features.administration.collection.description',
        color: 'text-indigo-400 bg-indigo-500/10',
        chipKeys: [
          'landing.features.administration.collection.chip.late',
          'landing.features.administration.collection.chip.action',
          'landing.features.administration.collection.chip.closure',
        ],
        path: '/collection',
      },
      {
        icon: BadgeCheck,
        titleKey: 'landing.features.administration.control.title',
        tagKey: 'landing.features.administration.control.tag',
        descKey: 'landing.features.administration.control.description',
        color: 'text-orange-400 bg-orange-500/10',
        chipKeys: [
          'landing.features.administration.control.chip.control',
          'landing.features.administration.control.chip.anomaly',
          'landing.features.administration.control.chip.assessment',
          'landing.features.administration.control.chip.followUp',
        ],
        path: '/controls',
      },
      {
        icon: MessageSquare,
        titleKey: 'landing.features.administration.communication.title',
        tagKey: 'landing.features.administration.communication.tag',
        descKey: 'landing.features.administration.communication.description',
        color: 'text-cyan-400 bg-cyan-500/10',
        chipKeys: [
          'landing.features.administration.communication.chip.agent',
          'landing.features.administration.communication.chip.taxpayer',
        ],
        path: '/messages',
      },
    ],
  },
]

const workflowKeys = [
  'landing.features.workflow.taxpayer',
  'landing.features.workflow.regime',
  'landing.features.workflow.obligation',
  'landing.features.workflow.declaration',
  'landing.features.workflow.validation',
  'landing.features.workflow.debt',
  'landing.features.workflow.payment',
  'landing.features.workflow.receipt',
  'landing.features.workflow.collection',
]

function ModuleCard({ m, navigate }: { m: { icon: typeof Users; title: string; tag: string; desc: string; color: string; chips: string[]; path: string }; navigate: (p: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => navigate(m.path)}
      className="group flex h-full w-full cursor-pointer flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/25 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-brand-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.color}`}>
          <m.icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {m.tag}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{m.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{m.desc}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {m.chips.map((c) => (
          <span
            key={c}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] font-mono text-slate-500"
          >
            {c}
          </span>
        ))}
      </div>
    </button>
  )
}

export default function Features() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-300">
              {t('landing.features.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('landing.features.titleLine1')}
              <span className="block text-brand-400">{t('landing.features.titleLine2')}</span>
            </h2>
            <p className="mt-4 text-slate-400">
              {t('landing.features.description')}
            </p>
          </div>
        </ScrollReveal>

        {/* Tranche Gestion : carte vedette Déclarations */}
        <ScrollReveal animation="blur-up">
          <button
            type="button"
            onClick={() => navigate(featured.path)}
            className="group mb-4 w-full cursor-pointer rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                    <featured.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">{t(featured.titleKey)}</p>
                    <h3 className="text-xl font-bold text-white sm:text-2xl">{t(featured.subtitleKey)}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{t(featured.descKey)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                {featured.visualKeys.map((key, i) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <BadgeCheck className={`h-8 w-8 ${i === 2 ? 'text-emerald-400' : i === 1 ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${i === 2 ? 'text-emerald-400' : i === 1 ? 'text-sky-400' : 'text-slate-500'}`}>
                        {t(key)}
                      </span>
                    </div>
                    {i < featured.visualKeys.length - 1 && <span className="text-xl text-brand-500/40">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </button>
        </ScrollReveal>

        {/* Tranches de modules */}
        {tranches.map((tr, idx) => (
          <div key={tr.id} className="mt-12">
            {/* En-tête de tranche */}
            <ScrollReveal animation="blur-up" delay={idx * 80}>
              <div className="flex items-center gap-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tr.color}`}>
                  <tr.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <h3 className="text-lg font-bold text-white">{t(tr.titleKey)}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t(tr.tagKey)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t(tr.descKey)}</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Ligne traversante animée */}
            <ScrollReveal animation="blur-up" delay={idx * 80 + 60}>
              <div className="my-5">
                <div className="module-flow" aria-hidden="true" />
              </div>
            </ScrollReveal>

            {/* Grille de cartes */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tr.cards.map((card) => (
                <ScrollReveal key={card.titleKey} animation="blur-up">
                  <ModuleCard
                    m={{
                      icon: card.icon,
                      title: t(card.titleKey),
                      tag: t(card.tagKey),
                      desc: t(card.descKey),
                      color: card.color,
                      chips: card.chipKeys.map((chipKey) => t(chipKey)),
                      path: card.path,
                    }}
                    navigate={navigate}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        ))}

        {/* Mini workflow */}
        <ScrollReveal animation="blur-up" delay={120}>
          <div className="mt-16">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('landing.features.workflow.title')}
            </p>
            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] lg:flex-wrap lg:justify-center lg:overflow-visible">
              {workflowKeys.map((key, i) => (
                <div key={key} className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-colors duration-200 hover:border-brand-500/25 hover:bg-white/[0.06]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-slate-300">{t(key)}</span>
                  </div>
                  {i < workflowKeys.length - 1 && (
                    <span aria-hidden="true" className="h-px w-5 bg-brand-500/20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}