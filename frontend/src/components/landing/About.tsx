import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlignHorizontalSpaceAround, ArrowRight, BadgeAlert, Building2, CircleDot,
  FileText, GraduationCap, Landmark, LayoutGrid, Network, ShieldCheck, UserRound, Wallet,
} from 'lucide-react'

import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

const contextItemKeys = [
  'landing.about.context.nif',
  'landing.about.context.currency',
  'landing.about.context.taxCenters',
  'landing.about.context.taxPeriods',
  'landing.about.context.declarations',
  'landing.about.context.debts',
  'landing.about.context.collection',
]

const actors = [
  {
    icon: UserRound, labelKey: 'landing.about.actors.taxpayer.label', to: '/taxpayers', role: 'TAXPAYER', color: 'text-sky-400 bg-sky-500/10',
    missionKeys: [
      'landing.about.actors.taxpayer.mission1',
      'landing.about.actors.taxpayer.mission2',
      'landing.about.actors.taxpayer.mission3',
      'landing.about.actors.taxpayer.mission4',
    ],
  },
  {
    icon: Building2, labelKey: 'landing.about.actors.agent.label', to: '/users', role: 'TAX_AGENT', color: 'text-brand-400 bg-brand-500/10',
    missionKeys: [
      'landing.about.actors.agent.mission1',
      'landing.about.actors.agent.mission2',
      'landing.about.actors.agent.mission3',
      'landing.about.actors.agent.mission4',
    ],
  },
  {
    icon: Wallet, labelKey: 'landing.about.actors.collectionAgent.label', to: '/users', role: 'COLLECTION_AGENT', color: 'text-emerald-400 bg-emerald-500/10',
    missionKeys: [
      'landing.about.actors.collectionAgent.mission1',
      'landing.about.actors.collectionAgent.mission2',
      'landing.about.actors.collectionAgent.mission3',
      'landing.about.actors.collectionAgent.mission4',
    ],
  },
  {
    icon: FileText, labelKey: 'landing.about.actors.accountant.label', to: '/users', role: 'ACCOUNTANT', color: 'text-violet-400 bg-violet-500/10',
    missionKeys: [
      'landing.about.actors.accountant.mission1',
      'landing.about.actors.accountant.mission2',
      'landing.about.actors.accountant.mission3',
      'landing.about.actors.accountant.mission4',
    ],
  },
  {
    icon: ShieldCheck, labelKey: 'landing.about.actors.admin.label', to: '/users', role: 'SUPER_ADMIN', color: 'text-amber-400 bg-amber-500/10',
    missionKeys: [
      'landing.about.actors.admin.mission1',
      'landing.about.actors.admin.mission2',
      'landing.about.actors.admin.mission3',
      'landing.about.actors.admin.mission4',
    ],
  },
]

const flow = [
  { labelKey: 'landing.about.flow.taxpayer', to: '/taxpayers' },
  { labelKey: 'landing.about.flow.administration', to: '/users' },
  { labelKey: 'landing.about.flow.system', to: '/dashboard' },
]

const cycle = [
  { labelKey: 'landing.about.cycle.step.registration', to: '/registrations' },
  { labelKey: 'landing.about.cycle.step.regime', to: '/taxpayers' },
  { labelKey: 'landing.about.cycle.step.obligation', to: '/deadlines' },
  { labelKey: 'landing.about.cycle.step.declaration', to: '/declarations' },
  { labelKey: 'landing.about.cycle.step.assessment', to: '/tax-rules' },
  { labelKey: 'landing.about.cycle.step.debt', to: '/debts' },
  { labelKey: 'landing.about.cycle.step.payment', to: '/payments' },
  { labelKey: 'landing.about.cycle.step.receipt', to: '/receipts' },
  { labelKey: 'landing.about.cycle.step.collection', to: '/collection' },
  { labelKey: 'landing.about.cycle.step.audit', to: '/audit' },
]

const limitKeys = [
  'landing.about.limits.fakeData',
  'landing.about.limits.configurableRules',
  'landing.about.limits.simulatedPayments',
  'landing.about.limits.noLegalValue',
]

type CycleView = 'ligne' | 'grille' | 'cercles'

const viewOptions: { id: CycleView; icon: typeof LayoutGrid; labelKey: string }[] = [
  { id: 'ligne', icon: AlignHorizontalSpaceAround, labelKey: 'landing.about.cycle.view.line' },
  { id: 'grille', icon: LayoutGrid, labelKey: 'landing.about.cycle.view.grid' },
  { id: 'cercles', icon: CircleDot, labelKey: 'landing.about.cycle.view.circles' },
]

export default function About({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [view, setView] = useState<CycleView>('ligne')
  const [activeActor, setActiveActor] = useState<number | null>(null)

  const go = (to: string) => navigate(to)

  return (
    <section id="about" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-300">
              {t('landing.about.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('landing.about.title')}
            </h2>
            <p className="mt-4 text-slate-400">
              {t('landing.about.description')}
            </p>
          </div>
        </ScrollReveal>

        {/* Texte principal + contexte malgache */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ScrollReveal animation="blur-up">
            <div className="h-full rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
              <div className="flex items-center gap-3">
                <img src="/logo.webp" alt="MNK-TAX" className="h-10 w-10 rounded-xl" />
                <div>
                  <p className="text-lg font-bold text-white">MNK-TAX</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">{t('landing.about.prototypeLabel')}</p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-slate-400">
                {t('landing.about.paragraph1')}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {t('landing.about.paragraph2')}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {t('landing.about.paragraph3')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="blur-up" delay={120}>
            <div className="h-full rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.about.context.title')}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t('landing.about.context.description')}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {contextItemKeys.map((key) => (
                  <span key={key} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] font-mono text-slate-400">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Acteurs */}
        <ScrollReveal animation="blur-up" delay={80}>
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{t('landing.about.actors.title')}</h3>
                <p className="mt-1 text-xs text-slate-500">{t('landing.about.actors.hint')}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2" onMouseLeave={() => setActiveActor(null)}>
                {actors.map((a, i) => (
                  <button
                    key={a.labelKey}
                    type="button"
                    onClick={() => go(a.to)}
                    onMouseEnter={() => setActiveActor(i)}
                    onFocus={() => setActiveActor(i)}
                    aria-expanded={activeActor === i}
                    className={`actor-btn inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      activeActor === i
                        ? 'border-brand-400/50 bg-brand-500/15 text-brand-100 shadow-lg shadow-brand-500/20'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200'
                    }`}
                  >
                    <a.icon className="h-4 w-4 text-brand-400" />
                    {t(a.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Panneau rôle : s'anime à chaque survol */}
            <div className="actor-detail-wrap mt-5 min-h-[132px]">
              {activeActor !== null ? (
                <div key={activeActor} className="actor-detail rounded-xl border border-brand-400/20 bg-brand-500/[0.07] p-4 sm:p-5">
                  <div className="actor-detail-head flex flex-wrap items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${actors[activeActor].color}`}>
                      {(() => { const Icon = actors[activeActor].icon; return <Icon className="h-4.5 w-4.5" /> })()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{t(actors[activeActor].labelKey)}</p>
                      <p className="font-mono text-[10px] font-medium tracking-wider text-brand-300">{actors[activeActor].role}</p>
                    </div>
                  </div>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {actors[activeActor].missionKeys.map((missionKey, j) => (
                      <li
                        key={missionKey}
                        className="actor-mission flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300"
                        style={{ ['--d' as string]: `${j * 70}ms` }}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-400">✓</span>
                        {t(missionKey)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="actor-hint flex h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] text-center">
                  <p className="text-xs font-medium text-slate-400">{t('landing.about.actors.placeholder')}</p>
                  <p className="text-[11px] text-slate-600">{t('landing.about.actors.placeholderList')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate-400 sm:flex-row sm:justify-center">
            {flow.map((f, i) => (
              <div key={f.labelKey} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2">
                {i > 0 && <span className="text-brand-500/50 text-lg">↕</span>}
                <button
                  type="button"
                  onClick={() => go(f.to)}
                  className={`cursor-pointer rounded-lg border px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    i === flow.length - 1
                      ? 'border-brand-400/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-brand-400/30 hover:text-brand-200'
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Cycle fiscal timeline */}
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
            <div className="mb-8 text-center">
              <h3 className="text-xl font-bold text-white">{t('landing.about.cycle.title')}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('landing.about.cycle.description')}
              </p>

              {/* Sélecteur de forme */}
              <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                {viewOptions.map((opt) => {
                  const Icon = opt.icon
                  const active = view === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setView(opt.id)}
                      aria-pressed={active}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                        active
                          ? 'bg-brand-500/20 text-brand-200 shadow-sm'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(opt.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Vue : Cercles (pipeline) */}
            {view === 'cercles' && (
              <ol className="flex flex-col gap-3">
                {cycle.map((step, i) => (
                  <li key={step.labelKey}>
                    <button
                      type="button"
                      onClick={() => go(step.to)}
                      className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-500/25 bg-brand-500/10 text-sm font-bold text-brand-300 transition-transform group-hover:scale-105">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{t(step.labelKey)}</p>
                        <p className="text-[11px] text-slate-500">{t('landing.about.cycle.openModule')}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {/* Vue : Grille */}
            {view === 'grille' && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {cycle.map((step, i) => (
                  <button
                    key={step.labelKey}
                    type="button"
                    onClick={() => go(step.to)}
                    className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-colors hover:border-brand-500/30 hover:bg-brand-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <p className="mt-2 text-[11px] font-medium text-slate-300">{t(step.labelKey)}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Vue : Ligne (horizontale) */}
            {view === 'ligne' && (
              <div className="overflow-x-auto pb-2">
                <ol className="flex min-w-max items-start gap-2">
                  {cycle.map((step, i) => (
                    <li key={step.labelKey} className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => go(step.to)}
                        className="group flex w-36 cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300 transition-transform group-hover:scale-105">
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300">{t(step.labelKey)}</span>
                      </button>
                      {i < cycle.length - 1 && <span aria-hidden="true" className="mt-2 h-px w-12 bg-brand-500/20" />}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Prototype académique — limites */}
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{t('landing.about.limits.title')}</h3>
                  <p className="text-xs text-slate-500">{t('landing.about.limits.description')}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {limitKeys.map((key) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400">
                    <BadgeAlert className="h-3 w-3 text-amber-400/70" />
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal animation="blur-up" delay={120}>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              onClick={onLogin}
              size="lg"
              className="group rounded-2xl bg-brand-600 px-8 text-white shadow-xl shadow-brand-600/25"
            >
              {t('landing.about.cta.discover')}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
            <a
              href="#security"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Network className="h-4 w-4" />
              {t('landing.about.cta.security')}
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
