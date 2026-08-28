import {
  BarChart3, ClipboardList, CreditCard, FileText, Fingerprint,
  MessageSquare, ShieldCheck, TrendingDown, Wallet,
} from 'lucide-react'

const modules = [
  { icon: Fingerprint, title: 'Contribuables', desc: 'Registre NIF et gestion des entreprises.', color: 'text-brand-400 bg-brand-500/10' },
  { icon: FileText, title: 'Déclarations', desc: 'Saisie et validation des déclarations fiscales.', color: 'text-violet-400 bg-violet-500/10' },
  { icon: TrendingDown, title: 'Créances', desc: 'Suivi des impayés et relances automatiques.', color: 'text-rose-400 bg-rose-500/10' },
  { icon: Wallet, title: 'Paiements', desc: 'Enregistrement et rapprochement bancaire.', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: CreditCard, title: 'Quittances', desc: 'Génération et vérification des quittances.', color: 'text-amber-400 bg-amber-500/10' },
  { icon: ShieldCheck, title: 'Recouvrement', desc: 'Actions de recouvrement et suivi.', color: 'text-sky-400 bg-sky-500/10' },
  { icon: MessageSquare, title: 'Messages', desc: 'Communication interne et notifications.', color: 'text-indigo-400 bg-indigo-500/10' },
  { icon: ClipboardList, title: 'Contrôles', desc: 'Planification des contrôles fiscaux.', color: 'text-orange-400 bg-orange-500/10' },
  { icon: BarChart3, title: 'Rapports', desc: 'Statistiques et exports personnalisés.', color: 'text-cyan-400 bg-cyan-500/10' },
]

export default function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tout votre cycle fiscal,
            <span className="block text-brand-400">dans une seule plateforme.</span>
          </h2>
          <p className="mt-4 text-slate-400">Neuf modules intégrés pour couvrir l'ensemble de vos opérations fiscales.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.title}
              className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-brand-500/20 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-brand-500/5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
