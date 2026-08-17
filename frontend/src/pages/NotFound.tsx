import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center py-24">
      <p className="animate-pop-in bg-gradient-to-br from-brand-600 to-brand-800 bg-clip-text text-6xl font-bold text-transparent">404</p>
      <h1 className="mt-3 animate-slide-up text-xl font-semibold text-slate-900" style={{ animationDelay: '0.1s' }}>Page introuvable</h1>
      <p className="mt-1 animate-slide-up text-sm text-slate-500" style={{ animationDelay: '0.2s' }}>La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <Link to="/" className="mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button>
          <ArrowLeft className="h-4 w-4" /> Retour à l’accueil
        </Button>
      </Link>
    </div>
  )
}
