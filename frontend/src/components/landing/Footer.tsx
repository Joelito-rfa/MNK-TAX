import ScrollReveal from './ScrollReveal'

interface FooterProps {
  onLogin: () => void
  onRequestAccess: () => void
}

export default function Footer({ onLogin, onRequestAccess }: FooterProps) {
  return (
    <footer className="relative border-t border-white/[0.06] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.webp" alt="MNK-TAX" className="h-7 w-7 rounded-lg" />
                <span className="text-sm font-bold text-white">MNK-TAX</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Gestion des impôts<br />nouvelle génération.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Navigation</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a></li>
                <li><a href="#security" className="transition-colors hover:text-white">Sécurité</a></li>
                <li><a href="#about" className="transition-colors hover:text-white">À propos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Plateforme</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><button onClick={onLogin} className="transition-colors hover:text-white text-left">Connexion</button></li>
                <li><button onClick={onRequestAccess} className="transition-colors hover:text-white text-left">Demander un accès</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">À propos</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Projet académique</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Données fictives</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Prototype de gestion fiscale</li>
              </ul>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-10 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600">
              © {new Date().getFullYear()} MNK-TAX — Prototype académique, données fictives.
            </p>
            <p className="text-[11px] text-slate-600">
              Gestion des impôts à Madagascar
            </p>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  )
}
