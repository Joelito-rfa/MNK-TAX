import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Button } from '../components/ui'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center py-24">
      <p className="animate-pop-in bg-brand-700 bg-clip-text text-6xl font-bold text-transparent">404</p>
      <h1 className="mt-3 animate-slide-up text-xl font-semibold text-slate-900 dark:text-slate-100" style={{ animationDelay: '0.1s' }}>{t('error.notFound')}</h1>
      <p className="mt-1 animate-slide-up text-sm text-slate-500 dark:text-slate-400" style={{ animationDelay: '0.2s' }}>{t('error.notFound.text')}</p>
      <Link to="/" className="mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button>
          <ArrowLeft className="h-4 w-4" /> {t('error.backHome')}
        </Button>
      </Link>
    </div>
  )
}
