import {
  CircleCheck, Database, KeyRound, Lock, Network, ScrollText, Server, ShieldCheck, ShieldHalf, Workflow,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

const authItemKeys = [
  'landing.security.auth.jwt',
  'landing.security.auth.accessToken',
  'landing.security.auth.refreshToken',
  'landing.security.auth.bcrypt',
  'landing.security.auth.sessions',
]

const roles = ['SUPER_ADMIN', 'ADMIN', 'TAX_AGENT', 'COLLECTION_AGENT', 'ACCOUNTANT', 'TAXPAYER']

const accessChainKeys = [
  'landing.security.rbac.roles',
  'landing.security.rbac.permissions',
  'landing.security.rbac.scope',
  'landing.security.rbac.ownership',
]

const auditedKeys = [
  'landing.security.audit.create',
  'landing.security.audit.update',
  'landing.security.audit.validation',
  'landing.security.audit.payment',
  'landing.security.audit.cancel',
  'landing.security.audit.login',
]

const dataProtectionKeys = [
  'landing.security.data.validation',
  'landing.security.data.accessControl',
  'landing.security.data.isolation',
  'landing.security.data.logging',
]

const criticalOpKeys = [
  'landing.security.critical.declarationValidation',
  'landing.security.critical.debtCreation',
  'landing.security.critical.payment',
  'landing.security.critical.cancel',
  'landing.security.critical.refund',
  'landing.security.critical.roleAssignment',
]

const criticalGuardKeys = [
  'landing.security.critical.permission',
  'landing.security.critical.businessValidation',
  'landing.security.critical.transaction',
  'landing.security.critical.audit',
]

const stack = ['Spring Boot', 'PostgreSQL', 'Redis', 'Nginx', 'Docker']

const badgeKeys = [
  'landing.security.badges.jwt',
  'landing.security.badges.rbac',
  'landing.security.badges.bcrypt',
  'landing.security.badges.auditTrail',
  'landing.security.badges.rateLimiting',
  'landing.security.badges.cors',
]

const apiChainKeys = [
  'landing.security.api.frontend',
  'landing.security.api.https',
  'landing.security.api.springSecurity',
  'landing.security.api.api',
  'landing.security.api.service',
  'landing.security.api.database',
]

export default function Security() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <section id="security" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              {t('landing.security.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('landing.security.titleLine1')}
              <span className="block text-brand-400">{t('landing.security.titleLine2')}</span>
            </h2>
            <p className="mt-4 text-slate-400">
              {t('landing.security.description')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Authentification */}
          <ScrollReveal animation="blur-up">
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.security.auth.title')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('landing.security.auth.description')}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {authItemKeys.map((key) => (
                  <span key={key} className="rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2 py-1 text-[10px] font-mono font-medium text-emerald-300">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* RBAC */}
          <ScrollReveal animation="blur-up" delay={70}>
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/25 hover:shadow-xl hover:shadow-brand-500/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <ShieldHalf className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.security.rbac.title')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('landing.security.rbac.description')}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-slate-400">
                    {r}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                {accessChainKeys.map((key, i) => (
                  <span key={key} className="flex items-center gap-2">
                    <span>{t(key)}</span>
                    {i < accessChainKeys.length - 1 && <span className="text-brand-500/40">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Audit */}
          <ScrollReveal animation="blur-up" delay={140}>
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ScrollText className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.security.audit.title')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('landing.security.audit.description')}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {auditedKeys.map((key) => (
                  <span key={key} className="rounded-md border border-amber-500/15 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-200">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Protection des données + API */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ScrollReveal animation="blur-up" delay={80}>
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.security.data.title')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('landing.security.data.description')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {dataProtectionKeys.map((key) => (
                  <span key={key} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-300">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="blur-up" delay={160}>
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Network className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t('landing.security.api.title')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('landing.security.api.description')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400">
                {apiChainKeys.map((key, i) => (
                  <span key={key} className="flex items-center gap-2">
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">{t(key)}</span>
                    {i < apiChainKeys.length - 1 && <span className="text-brand-500/40">↓</span>}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Opérations critiques */}
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{t('landing.security.critical.title')}</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {t('landing.security.critical.description')}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex flex-wrap gap-1.5">
                  {criticalOpKeys.map((key) => (
                    <span key={key} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400">
                      {t(key)}
                    </span>
                  ))}
                </div>
                <div className="h-px w-8 bg-brand-500/25 sm:h-12 sm:w-px sm:rotate-0" />
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-brand-300">
                  {criticalGuardKeys.map((key, i) => (
                    <span key={key} className="flex items-center gap-2">
                      <span className="rounded-md border border-brand-500/15 bg-brand-500/5 px-2 py-1">{t(key)}</span>
                      {i < criticalGuardKeys.length - 1 && <span className="text-brand-500/40">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Infrastructure */}
        <ScrollReveal animation="blur-up" delay={80}>
          <div className="mt-6 flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 lg:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{t('landing.security.infra.title')}</h3>
                <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-500">
                  {t('landing.security.infra.description')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stack.map((s) => (
                <span key={s} className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] font-mono text-slate-300">
                  {s === 'Redis' ? <Database className="h-3 w-3 text-slate-500" /> : <ShieldCheck className="h-3 w-3 text-emerald-400/70" />}
                  {s}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Badges */}
        <ScrollReveal animation="blur-up" delay={120}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {badgeKeys.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-200">
                <CircleCheck className="h-3 w-3 text-emerald-400" />
                {t(key)}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
              {t('landing.security.permissions', { count: 89 })}
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="blur-up" delay={160}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="rounded-2xl bg-brand-600 px-8 text-white shadow-xl shadow-brand-600/25"
            >
              {t('landing.security.cta')}
            </Button>
            <p className="text-xs text-slate-500">{t('landing.security.note')}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}