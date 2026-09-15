import {
  CircleCheck, Database, KeyRound, Lock, Network, ScrollText, Server, ShieldCheck, ShieldHalf, Workflow,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'

const authItems = ['JWT', 'Access token', 'Refresh token', 'BCrypt', 'Sessions']

const roles = ['SUPER_ADMIN', 'ADMIN', 'TAX_AGENT', 'COLLECTION_AGENT', 'ACCOUNTANT', 'TAXPAYER']

const accessChain = ['Rôles', 'Permissions', 'Scope', 'Ownership']

const audited = ['Création', 'Modification', 'Validation', 'Paiement', 'Annulation', 'Connexion']

const dataProtection = ['Validation', 'Contrôle d’accès', 'Isolation', 'Journalisation']

const criticalOps = [
  'Validation déclaration',
  'Création dette',
  'Paiement',
  'Annulation',
  'Remboursement',
  'Attribution de rôle',
]

const criticalGuards = ['Permission', 'Validation métier', 'Transaction', 'Audit']

const stack = ['Spring Boot', 'PostgreSQL', 'Redis', 'Nginx', 'Docker']

const badges = [
  'JWT',
  'RBAC',
  'BCrypt',
  'Audit trail',
  'Rate limiting',
  'CORS whitelist',
]

export default function Security() {
  const navigate = useNavigate()

  return (
    <section id="security" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              Sécurité
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Sécurité, contrôle
              <span className="block text-brand-400">et traçabilité.</span>
            </h2>
            <p className="mt-4 text-slate-400">
              MNK-TAX intègre plusieurs mécanismes techniques pour protéger les accès et tracer les
              opérations sensibles du prototype.
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
              <h3 className="mt-4 text-base font-semibold text-white">Authentification sécurisée</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                La connexion repose sur une authentification sécurisée et une gestion contrôlée des sessions.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {authItems.map((a) => (
                  <span key={a} className="rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2 py-1 text-[10px] font-mono font-medium text-emerald-300">
                    {a}
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
              <h3 className="mt-4 text-base font-semibold text-white">Accès par rôles et permissions</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Chaque utilisateur dispose de droits adaptés à son rôle et à son périmètre d’accès.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-slate-400">
                    {r}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                {accessChain.map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span>{s}</span>
                    {i < accessChain.length - 1 && <span className="text-brand-500/40">→</span>}
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
              <h3 className="mt-4 text-base font-semibold text-white">Audit des opérations</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Les opérations sensibles peuvent être historisées afin de renforcer la traçabilité du système.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {audited.map((a) => (
                  <span key={a} className="rounded-md border border-amber-500/15 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-200">
                    {a}
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
              <h3 className="mt-4 text-base font-semibold text-white">Protection des données</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Les données fiscales sont accessibles selon les permissions, le périmètre et les relations
                métier définis par le système.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {dataProtection.map((d) => (
                  <span key={d} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-300">
                    {d}
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
              <h3 className="mt-4 text-base font-semibold text-white">API protégées</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Les opérations métier passent par une couche backend sécurisée plutôt que par des contrôles
                uniquement côté interface.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400">
                {['Frontend', 'HTTPS', 'Spring Security', 'API', 'Service métier', 'Database'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">{s}</span>
                    {i < 5 && <span className="text-brand-500/40">↓</span>}
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
                  <h3 className="text-base font-semibold text-white">Protection des opérations sensibles</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Les actions les plus sensibles sont encadrées côté serveur par une combinaison de contrôles.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex flex-wrap gap-1.5">
                  {criticalOps.map((o) => (
                    <span key={o} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400">
                      {o}
                    </span>
                  ))}
                </div>
                <div className="h-px w-8 bg-brand-500/25 sm:h-12 sm:w-px sm:rotate-0" />
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-brand-300">
                  {criticalGuards.map((g, i) => (
                    <span key={g} className="flex items-center gap-2">
                      <span className="rounded-md border border-brand-500/15 bg-brand-500/5 px-2 py-1">{g}</span>
                      {i < criticalGuards.length - 1 && <span className="text-brand-500/40">+</span>}
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
                <h3 className="text-base font-semibold text-white">Infrastructure du prototype</h3>
                <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-500">
                  Une architecture séparant l’interface, les services métier, les données et les composants
                  d’infrastructure.
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
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-200">
                <CircleCheck className="h-3 w-3 text-emerald-400" />
                {b}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
              89 permissions distinctes
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
              Accéder à la plateforme
            </Button>
            <p className="text-xs text-slate-500">L’authentification est requise pour consulter les données.</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}