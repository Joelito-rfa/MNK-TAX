export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.webp" alt="MNK-TAX" className="h-7 w-7 rounded-lg" />
              <span className="text-sm font-bold text-white">MNK-TAX</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">Gestion des impôts<br />nouvelle génération.</p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Produit</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a></li>
              <li><a href="#security" className="transition-colors hover:text-white">Sécurité</a></li>
              <li><a href="#about" className="transition-colors hover:text-white">Documentation</a></li>
            </ul>
          </div>

          {/* Plateforme */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Plateforme</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="/login" className="transition-colors hover:text-white">Connexion</a></li>
              <li><a href="/" className="transition-colors hover:text-white">Demander un accès</a></li>
            </ul>
          </div>

          {/* À propos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">À propos</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Projet académique</li>
              <li>Données fictives</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} MNK-TAX — Prototype académique — données fictives.
          </p>
          <p className="text-[11px] text-slate-600">
            Gestion des impôts à Madagascar
          </p>
        </div>
      </div>
    </footer>
  )
}
