import { TrendingDown, TrendingUp } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { PageHeader } from '../../components/ui'
import { usePaymentStats } from '../../features/payment/api/queries'
import { PaymentStatsCards } from '../../features/payment/components/PaymentStatsCards'

export default function PaymentsStats() {
  const { t } = useI18n()
  const { data: stats, isLoading } = usePaymentStats()

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">{t('common.loading')}</div>
  }

  if (!stats) {
    return <div className="text-center py-20 text-slate-500">{t('payments.stats.noData')}</div>
  }

  return (
    <div className="fx-page space-y-6">
      <PageHeader title={t('payments.title') + ' — ' + t('sidebar.payments.stats')} subtitle={t('payments.stats.summarySub')} />
      {stats && <PaymentStatsCards stats={stats} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('payments.stats.summary')}</h3>
              <p className="text-xs text-slate-500">{t('payments.stats.summarySub')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.totalMonth')}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stats.monthCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.totalToday')}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stats.todayCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.pendingCount')}</span>
              <span className="text-sm font-semibold text-amber-600">{stats.pendingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.allocatedCount')}</span>
              <span className="text-sm font-semibold text-emerald-600">{stats.allocatedCount}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('payments.stats.alerts')}</h3>
              <p className="text-xs text-slate-500">{t('payments.stats.alertsSub')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.rejectedCount')}</span>
              <span className="text-sm font-semibold text-rose-600">{stats.rejectedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.cancelledCount')}</span>
              <span className="text-sm font-semibold text-rose-600">{stats.cancelledCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('payments.stats.unallocatedAmount')}</span>
              <span className="text-sm font-semibold text-amber-600">{stats.unallocatedAmount.toLocaleString()} MGA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
