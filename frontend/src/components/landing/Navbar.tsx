import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui'

const navLinks = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Sécurité', href: '#security' },
  { label: 'À propos', href: '#about' },
]

export default function Navbar({ onLogin, onRequestAccess }: { onLogin: () => void; onRequestAccess: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'border-b border-white/10 bg-[#0f1117]/85 backdrop-blur-xl shadow-lg shadow-black/10'
        : 'bg-transparent'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <img src="/logo.webp" alt="MNK-TAX" className="h-9 w-9 rounded-xl object-contain shadow-lg shadow-brand-800/20 transition-transform duration-200 group-hover:scale-105" />
          <div>
            <p className="text-lg font-bold tracking-tight text-white">MNK-TAX</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Gestion des impôts</p>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <button onClick={onRequestAccess}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            Demander un accès
          </button>
          <Button onClick={onLogin} size="sm" className="rounded-xl">
            Se connecter
          </Button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0f1117]/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-6 py-4">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
              <button onClick={() => { onRequestAccess(); setMobileOpen(false) }}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white text-left">
                Demander un accès
              </button>
              <Button onClick={() => { onLogin(); setMobileOpen(false) }} size="sm" className="w-full rounded-xl">
                Se connecter
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
