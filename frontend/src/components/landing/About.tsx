import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlignHorizontalSpaceAround, ArrowRight, BadgeAlert, Building2, CircleDot,
  FileText, GraduationCap, Landmark, LayoutGrid, Network, ShieldCheck, UserRound, Wallet,
} from 'lucide-react'

import { Button } from '../ui'
import ScrollReveal from './ScrollReveal'

const contextItems = ['NIF', 'MGA', 'Centres fiscaux', 'Périodes fiscales', 'Déclarations', 'Créances', 'Recouvrement']

const actors = [
  {
    icon: UserRound, label: 'Contribuable', to: '/taxpayers', role: 'TAXPAYER', color: 'text-sky-400 bg-sky-500/10',
    missions: ['Déclarer ses revenus en ligne', 'Payer ses impôts et suivre ses soldes', 'Télécharger ses quittances PDF', 'Consulter ses échéances fiscales'],
  },
  {
    icon: Building2, label: 'Agent fiscal', to: '/users', role: 'TAX_AGENT', color: 'text-brand-400 bg-brand-500/10',
    missions: ['Immatriculer et suivre les contribuables', 'Vérifier et valider les déclarations', 'Calculer les créances fiscales', 'Planifier les contrôles fiscaux'],
  },
  {
    icon: Wallet, label: 'Agent de recouvrement', to: '/users', role: 'COLLECTION_AGENT', color: 'text-emerald-400 bg-emerald-500/10',
    missions: ['Relancer les créances en retard', 'Émettre les mises en demeure', 'Suivre les actions de recouvrement', 'Clôturer les dossiers recouvrés'],
  },
  {
    icon: FileText, label: 'Comptable', to: '/users', role: 'ACCOUNTANT', color: 'text-violet-400 bg-violet-500/10',
    missions: ['Enregistrer les paiements reçus', 'Allouer les règlements aux créances', 'Générer les quittances vérifiables', 'Traiter les remboursements'],
  },
  {
    icon: ShieldCheck, label: 'Administrateur', to: '/users', role: 'SUPER_ADMIN', color: 'text-amber-400 bg-amber-500/10',
    missions: ['Gérer utilisateurs, rôles et permissions', 'Configurer règles et échéances fiscales', 'Superviser le journal d’audit', 'Paramétrer le système'],
  },
]

const flow = [
  { label: 'Contribuable', to: '/taxpayers' },
  { label: 'Administration fiscale', to: '/users' },
  { label: 'Système MNK-TAX', to: '/dashboard' },
]

const cycle = [
  { label: 'Immatriculation', to: '/registrations' },
  { label: 'Régime fiscal', to: '/taxpayers' },
  { label: 'Obligation', to: '/deadlines' },
  { label: 'Déclaration', to: '/declarations' },
  { label: 'Évaluation', to: '/tax-rules' },
  { label: 'Créance', to: '/debts' },
  { label: 'Paiement', to: '/payments' },
  { label: 'Quittance', to: '/receipts' },
  { label: 'Recouvrement', to: '/collection' },
  { label: 'Audit', to: '/audit' },
]

const limits = ['Données fictives', 'Règles configurables', 'Paiements simulés', 'Aucune valeur juridique officielle']

type CycleView = 'ligne' | 'grille' | 'cercles'

const viewOptions: { id: CycleView; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'ligne', icon: AlignHorizontalSpaceAround, label: 'Ligne' },
  { id: 'grille', icon: LayoutGrid, label: 'Grille' },
  { id: 'cercles', icon: CircleDot, label: 'Cercles' },
]

export default function About({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate()
  const [view, setView] = useState<CycleView>('ligne')
  const [activeActor, setActiveActor] = useState<number | null>(null)

  const go = (to: string) => navigate(to)

  return (
    <section id="about" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-300">
              À propos
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              À propos de MNK-TAX
            </h2>
            <p className="mt-4 text-slate-400">
              Un prototype académique pour modéliser la modernisation de la gestion fiscale.
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
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Prototype académique</p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-slate-400">
                MNK-TAX est un prototype académique de gestion fiscale conçu pour modéliser le cycle de
                l’administration fiscale à travers une plateforme web moderne.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Le projet couvre notamment la gestion des contribuables, les obligations fiscales, les
                déclarations, les créances, les paiements, les quittances, le recouvrement, les contrôles et
                la traçabilité des opérations.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                L’objectif est de montrer comment les différents acteurs et processus fiscaux peuvent être
                regroupés dans un système numérique cohérent.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="blur-up" delay={120}>
            <div className="h-full rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Pensé pour le contexte fiscal malgache</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Le prototype utilise des concepts et des données de démonstration adaptés au contexte
                malgache, tout en restant un environnement académique fictif.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {contextItems.map((c) => (
                  <span key={c} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] font-mono text-slate-400">
                    {c}
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
                <h3 className="text-base font-semibold text-white">Les acteurs du système</h3>
                <p className="mt-1 text-xs text-slate-500">Survolez un profil pour découvrir son rôle — cliquez pour ouvrir son module.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2" onMouseLeave={() => setActiveActor(null)}>
                {actors.map((a, i) => (
                  <button
                    key={a.label}
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
                    {a.label}
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
                      <p className="text-sm font-bold text-white">{actors[activeActor].label}</p>
                      <p className="font-mono text-[10px] font-medium tracking-wider text-brand-300">{actors[activeActor].role}</p>
                    </div>
                  </div>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {actors[activeActor].missions.map((m, j) => (
                      <li
                        key={m}
                        className="actor-mission flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300"
                        style={{ ['--d' as string]: `${j * 70}ms` }}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-400">✓</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="actor-hint flex h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] text-center">
                  <p className="text-xs font-medium text-slate-400">Survolez un acteur ci-dessus…</p>
                  <p className="text-[11px] text-slate-600">Contribuable · Agent fiscal · Recouvrement · Comptable · Administrateur</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate-400 sm:flex-row sm:justify-center">
            {flow.map((f, i) => (
              <div key={f.label} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2">
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
                  {f.label}
                </button>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Cycle fiscal timeline */}
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
            <div className="mb-8 text-center">
              <h3 className="text-xl font-bold text-white">Une vision intégrée du cycle fiscal</h3>
              <p className="mt-2 text-sm text-slate-500">
                De l’immatriculation du contribuable jusqu’au recouvrement et à l’audit. Cliquez sur une étape pour ouvrir son module.
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
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Vue : Cercles (pipeline) */}
            {view === 'cercles' && (
              <ol className="flex flex-col gap-3">
                {cycle.map((step, i) => (
                  <li key={step.label}>
                    <button
                      type="button"
                      onClick={() => go(step.to)}
                      className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-500/25 bg-brand-500/10 text-sm font-bold text-brand-300 transition-transform group-hover:scale-105">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{step.label}</p>
                        <p className="text-[11px] text-slate-500">Ouvrir le module</p>
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
                    key={step.label}
                    type="button"
                    onClick={() => go(step.to)}
                    className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-colors hover:border-brand-500/30 hover:bg-brand-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <p className="mt-2 text-[11px] font-medium text-slate-300">{step.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Vue : Ligne (horizontale) */}
            {view === 'ligne' && (
              <div className="overflow-x-auto pb-2">
                <ol className="flex min-w-max items-start gap-2">
                  {cycle.map((step, i) => (
                    <li key={step.label} className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => go(step.to)}
                        className="group flex w-36 cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300 transition-transform group-hover:scale-105">
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300">{step.label}</span>
                      </button>
                      {i < cycle.length - 1 && <span aria-hidden="true" className="mt-2 h-px w-12 bg-gradient-to-r from-brand-500/30 to-brand-500/10" />}
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
                  <h3 className="text-base font-semibold text-white">Prototype académique</h3>
                  <p className="text-xs text-slate-500">Pour éviter toute confusion avec un système officiel.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {limits.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400">
                    <BadgeAlert className="h-3 w-3 text-amber-400/70" />
                    {l}
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
              className="group rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-8 text-white shadow-xl shadow-brand-600/25"
            >
              Découvrir la plateforme
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
            <a
              href="#security"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Network className="h-4 w-4" />
              Voir la sécurité
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
