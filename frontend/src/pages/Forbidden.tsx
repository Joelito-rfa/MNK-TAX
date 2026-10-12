import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui'
import { homeRouteFor } from '../lib/navigation'

export default function Forbidden() {
  const { t } = useI18n()
  const { user } = useAuth()
  const home = homeRouteFor(user?.permissions ?? [])

  return (
    <div className="flex animate-fade-in flex-col items-center justify-center py-24">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="mt-4 animate-slide-up text-xl font-semibold text-slate-900 dark:text-slate-100">
        {t('error.forbidden')}
      </h1>
      <p className="mt-1 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
        {t('error.forbidden.text')}
      </p>
      <Link to={home} className="mt-6">
        <Button>
          <ArrowLeft className="h-4 w-4" /> {t('error.backToApp')}
        </Button>
      </Link>
    </div>
  )
}