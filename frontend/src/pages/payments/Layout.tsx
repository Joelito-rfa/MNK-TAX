import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, CalendarDays, PlusCircle, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

interface PaymentsTab {
  to: string
  labelKey: string
  icon: ReactNode
  permission: string
  end?: boolean
}

const TABS: PaymentsTab[] = [
  { to: '/payments', labelKey: 'sidebar.payments.list', icon: <Wallet className="h-4 w-4" />, permission: 'PAYMENT_READ', end: true },
  { to: '/payments/pending', labelKey: 'sidebar.payments.pending', icon: <CalendarDays className="h-4 w-4" />, permission: 'PAYMENT_READ' },
  { to: '/payments/stats', labelKey: 'sidebar.payments.stats', icon: <BarChart3 className="h-4 w-4" />, permission: 'PAYMENT_READ' },
  { to: '/payments/new', labelKey: 'sidebar.payments.new', icon: <PlusCircle className="h-4 w-4" />, permission: 'PAYMENT_WRITE' },
]

/** Ossature du module Paiements : en-tête commun, navigation par sous-module et point de sortie. */
export default function PaymentsLayout() {
  const { t } = useI18n()
  const { can } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = TABS.filter((tab) => can(tab.permission))
  const onCreatePage = pathname === '/payments/new'

  return (
    <div className="fx-page space-y-6">
      <PageHeader
        title={t('payments.title')}
        subtitle={t('payments.subtitleLong')}
        actions={
          can('PAYMENT_WRITE') && !onCreatePage ? (
            <Button onClick={() => navigate('/payments/new')}>
              <PlusCircle className="h-4 w-4" /> {t('payments.new')}
            </Button>
          ) : undefined
        }
      />
      {tabs.length > 1 && (
        <nav
          aria-label={t('payments.title')}
          className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700/60 dark:bg-slate-800"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`
              }
            >
              {tab.icon}
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </div>
  )
}
