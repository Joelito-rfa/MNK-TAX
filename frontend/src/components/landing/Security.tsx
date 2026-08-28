import { Shield, Key, Lock, Eye, Clock, Globe, Fingerprint, FileCheck } from 'lucide-react'

const guarantees = [
  { icon: Key, title: 'JWT', desc: 'Tokens d\'accès sécurisés avec expiration' },
  { icon: Shield, title: 'RBAC', desc: 'Contrôle d\'accès par rôle et permission' },
  { icon: Fingerprint, title: '31+ permissions', desc: 'Granularité fine des accès' },
  { icon: Eye, title: 'Audit trail', desc: 'Chaque action est historisée' },
  { icon: Clock, title: 'Rate limiting', desc: 'Protection contre les abus' },
  { icon: Globe, title: 'CORS sécurisé', desc: 'Origines autorisées strictes' },
  { icon: Lock, title: 'BCrypt', desc: 'Mots de passe hashés et salés' },
  { icon: FileCheck, title: 'Validation', desc: 'Entrées validées côté serveur' },
]

export default function Security() {
  return (
    <section id="security" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Une infrastructure pensée
            <span className="block text-brand-400">pour la sécurité.</span>
          </h2>
          <p className="mt-4 text-slate-400">Garanties techniques intégrées pour protéger vos données fiscales.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guarantees.map((g) => (
            <div key={g.title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-emerald-500/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{g.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
