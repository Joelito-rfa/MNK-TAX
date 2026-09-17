import { AlertTriangle, Clock, CreditCard, Wallet } from 'lucide-react'
import { fmtMGA } from '../../../lib/format'
import { useI18n } from '../../../lib/i18n'
import type { PaymentStats } from '../../../types'

function MiniCard({ iconBg, iconColor, icon, label, value, sub }: {
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="card fx-spot group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
      {sub && <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  )
}

export function PaymentStatsCards({ stats }: { stats: PaymentStats }) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MiniCard
        iconBg="bg-emerald-50" iconColor="text-emerald-600"
        icon={<Wallet className="h-5 w-5" />}
        label={t('payments.stats.month')} value={stats.monthCount}
        sub={`${fmtMGA(stats.monthAmount)} ${t('payments.stats.collected')}`}
      />
      <MiniCard
        iconBg="bg-blue-50" iconColor="text-blue-600"
        icon={<CreditCard className="h-5 w-5" />}
        label={t('payments.stats.today')} value={stats.todayCount}
        sub={t('payments.stats.todaySub')}
      />
      <MiniCard
        iconBg="bg-amber-50" iconColor="text-amber-600"
        icon={<Clock className="h-5 w-5" />}
        label={t('payments.stats.pending')} value={stats.pendingCount}
        sub={stats.unallocatedAmount > 0 ? `${fmtMGA(stats.unallocatedAmount)} ${t('payments.stats.unallocated')}` : t('payments.stats.toProcess')}
      />
      <MiniCard
        iconBg="bg-rose-50" iconColor="text-rose-600"
        icon={<AlertTriangle className="h-5 w-5" />}
        label={t('payments.stats.rejected')} value={stats.rejectedCount + stats.cancelledCount}
        sub={`${stats.allocatedCount} ${t('payments.stats.allocated')}`}
      />
    </div>
  )
}
