import {
  BadgeCheck, Calculator, CalendarDays, ClipboardList, FileText, FolderCog, HandCoins, Landmark, MessageSquare, Receipt, SearchCheck, Settings2, Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'

const featured = {
  icon: FileText,
  title: 'Déclarations fiscales',
  subtitle: 'Le cœur du cycle déclaratif',
  desc: 'Gérez le cycle complet des déclarations : brouillon, soumission, vérification, validation, rejet et correction — avec un historique traçable de chaque statut.',
  path: '/declarations',
  visual: ['Brouillon', 'Soumise', 'Validée'],
}

const tranches = [
  {
    id: 'gestion',
    icon: Settings2,
    title: 'Gestion',
    tag: 'Le cycle opérationnel',
    desc: 'Contribuables, déclarations, paiements et créances : le quotidien de la gestion fiscale.',
    color: 'text-brand-400 bg-brand-500/10',
    cards: [
      {
        icon: Users,
        title: 'Contribuables',
        tag: 'NIF',
        desc: 'Registre centralisé des particuliers et entreprises : NIF, régime fiscal, centre fiscal et situation administrative.',
        color: 'text-brand-400 bg-brand-500/10',
        chips: ['NIF', 'Régime', 'Centre', 'Statut'],
        path: '/taxpayers',
      },
      {
        icon: HandCoins,
        title: 'Paiements',
        tag: 'Encaissements',
        desc: 'Enregistrement des paiements, allocation sur les créances et suivi des soldes restants.',
        color: 'text-emerald-400 bg-emerald-500/10',
        chips: ['Paiement', 'Allocation', 'Solde'],
        path: '/payments',
      },
      {
        icon: Landmark,
        title: 'Créances',
        tag: 'Dettes',
        desc: 'Suivi du principal, des pénalités, des intérêts, des montants payés et du solde restant à recouvrer.',
        color: 'text-rose-400 bg-rose-500/10',
        chips: ['Principal', 'Pénalités', 'Intérêts', 'Solde'],
        path: '/debts',
      },
    ],
  },
  {
    id: 'referentiels',
    icon: FolderCog,
    title: 'Référentiels',
    tag: 'Paramètres & données de base',
    desc: 'Les règles, échéances et justificatifs qui encadrent le calcul et le suivi fiscal.',
    color: 'text-violet-400 bg-violet-500/10',
    cards: [
      {
        icon: Calculator,
        title: 'Calcul fiscal',
        tag: 'Règles',
        desc: 'Règles configurables selon le type d’impôt, l’assiette, les seuils, les déductions et les taux du prototype.',
        color: 'text-violet-400 bg-violet-500/10',
        chips: ['Assiette', 'Règle', 'Impôt calculé'],
        path: '/tax-rules',
      },
      {
        icon: CalendarDays,
        title: 'Calendrier fiscal',
        tag: 'Échéances',
        desc: 'Périodes fiscales, dates limites de déclaration, échéances de paiement et détection des retards.',
        color: 'text-amber-400 bg-amber-500/10',
        chips: ['Période', 'Date limite', 'Statut', 'Retard'],
        path: '/deadlines',
      },
      {
        icon: Receipt,
        title: 'Quittances',
        tag: 'Vérification',
        desc: 'Quittances PDF avec référence et QR Code pour vérifier une opération enregistrée dans le système.',
        color: 'text-sky-400 bg-sky-500/10',
        chips: ['Référence', 'QR Code', 'PDF'],
        path: '/receipts',
      },
    ],
  },
  {
    id: 'administration',
    icon: ClipboardList,
    title: 'Administration',
    tag: 'Contrôle & communication',
    desc: 'Le suivi des recouvrements, des contrôles et des échanges avec les contribuables.',
    color: 'text-indigo-400 bg-indigo-500/10',
    cards: [
      {
        icon: SearchCheck,
        title: 'Recouvrement',
        tag: 'Créances en retard',
        desc: 'Suivi des créances en retard, actions de recouvrement, dossiers transmis et évolution des dossiers.',
        color: 'text-indigo-400 bg-indigo-500/10',
        chips: ['Retard', 'Action', 'Clôture'],
        path: '/collection',
      },
      {
        icon: BadgeCheck,
        title: 'Contrôle fiscal',
        tag: 'Suivi',
        desc: 'Contrôles, observations, anomalies et éventuels redressements dans un dossier fiscal traçable.',
        color: 'text-orange-400 bg-orange-500/10',
        chips: ['Contrôle', 'Anomalie', 'Redressement', 'Suivi'],
        path: '/controls',
      },
      {
        icon: MessageSquare,
        title: 'Communication',
        tag: 'Messagerie',
        desc: 'Échanges avec les contribuables dans le contexte d’une déclaration, d’une dette, d’un paiement ou d’un contrôle.',
        color: 'text-cyan-400 bg-cyan-500/10',
        chips: ['Agent fiscal', 'Contribuable'],
        path: '/messages',
      },
    ],
  },
]

const workflow = [
  'Contribuable',
  'Régime fiscal',
  'Obligation',
  'Déclaration',
  'Validation',
  'Créance',
  'Paiement',
  'Quittance',
  'Recouvrement',
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

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-300">
              Fonctionnalités
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tout le cycle fiscal,
              <span className="block text-brand-400">dans une seule plateforme.</span>
            </h2>
            <p className="mt-4 text-slate-400">
              MNK-TAX centralise les principales étapes de la gestion fiscale, de l’identification du
              contribuable au paiement et au recouvrement.
            </p>
          </div>
        </ScrollReveal>

        {/* Tranche Gestion : carte vedette Déclarations */}
        <ScrollReveal animation="blur-up">
          <button
            type="button"
            onClick={() => navigate(featured.path)}
            className="group mb-4 w-full cursor-pointer rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                    <featured.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">{featured.title}</p>
                    <h3 className="text-xl font-bold text-white sm:text-2xl">{featured.subtitle}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{featured.desc}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                {featured.visual.map((v, i) => (
                  <div key={v} className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <BadgeCheck className={`h-8 w-8 ${i === 2 ? 'text-emerald-400' : i === 1 ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${i === 2 ? 'text-emerald-400' : i === 1 ? 'text-sky-400' : 'text-slate-500'}`}>
                        {v}
                      </span>
                    </div>
                    {i < featured.visual.length - 1 && <span className="text-xl text-brand-500/40">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </button>
        </ScrollReveal>

        {/* Tranches de modules */}
        {tranches.map((t, idx) => (
          <div key={t.id} className="mt-12">
            {/* En-tête de tranche */}
            <ScrollReveal animation="blur-up" delay={idx * 80}>
              <div className="flex items-center gap-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.color}`}>
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <h3 className="text-lg font-bold text-white">{t.title}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.tag}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
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
              {t.cards.map((m) => (
                <ScrollReveal key={m.title} animation="blur-up">
                  <ModuleCard m={m} navigate={navigate} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        ))}

        {/* Mini workflow */}
        <ScrollReveal animation="blur-up" delay={120}>
          <div className="mt-16">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Comment fonctionne MNK-TAX ?
            </p>
            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] lg:flex-wrap lg:justify-center lg:overflow-visible">
              {workflow.map((step, i) => (
                <div key={step} className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-colors duration-200 hover:border-brand-500/25 hover:bg-white/[0.06]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-slate-300">{step}</span>
                  </div>
                  {i < workflow.length - 1 && (
                    <span aria-hidden="true" className="h-px w-5 bg-gradient-to-r from-brand-500/40 to-brand-500/10" />
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