import { AlertTriangle, AlertCircle, Clock, Send, FileText, Wallet } from 'lucide-react'
import { useI18n } from '../../../lib/i18n'
import { KpiCard } from '../../../components/collection/KpiCard'
import type { CollectionStats } from '../../../types'

export function KpiStrip({ stage, stats, fmtMGA }: { stage:'all'|'overdue'|'reminders'|'notices', stats: CollectionStats, fmtMGA:(n:number)=>string }) {
  const { t } = useI18n()
  if (stage==='overdue') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('collection.kpi.overdueFiles')} value={stats.overdueDebts} icon={<AlertTriangle className="h-5 w-5 text-rose-500"/>} wrap="bg-rose-500/10" bar="bg-rose-500" sub={stats.overdueBalance>0?t('collection.kpi.overdueBalance',{amount:fmtMGA(stats.overdueBalance)}):t('collection.kpi.noBalance')} />
        <KpiCard label={t('collection.kpi.over30')} value={stats.overdue30} icon={<Clock className="h-5 w-5 text-amber-500"/>} wrap="bg-amber-500/10" bar="bg-amber-500" />
        <KpiCard label={t('collection.kpi.over60')} value={stats.overdue60} icon={<Clock className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
        <KpiCard label={t('collection.kpi.over90')} value={stats.overdue90} icon={<Clock className="h-5 w-5 text-red-500"/>} wrap="bg-red-500/10" bar="bg-red-500" />
      </div>
    )
  }
  if (stage==='reminders') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('collection.kpi.reminders')} value={stats.reminderActions} icon={<Send className="h-5 w-5 text-violet-500"/>} wrap="bg-violet-500/10" bar="bg-violet-500" />
        <KpiCard label={t('collection.kpi.notices')} value={stats.noticeCount} icon={<FileText className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
        <KpiCard label={t('collection.kpi.totalActions')} value={stats.actionCount} icon={<Send className="h-5 w-5 text-blue-500"/>} wrap="bg-blue-500/10" bar="bg-blue-500" />
        <KpiCard label={t('collection.kpi.outstanding')} value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-amber-500"/>} wrap="bg-amber-500/10" bar="bg-amber-500" />
      </div>
    )
  }
  if (stage==='notices') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('collection.kpi.notices')} value={stats.noticeCount} icon={<FileText className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
        <KpiCard label={t('collection.kpi.disputes')} value={stats.disputedDebts} icon={<AlertCircle className="h-5 w-5 text-red-500"/>} wrap="bg-red-500/10" bar="bg-red-500" />
        <KpiCard label={t('collection.kpi.suspended')} value={stats.suspendedDebts} icon={<AlertCircle className="h-5 w-5 text-amber-500"/>} wrap="bg-amber-500/10" bar="bg-amber-500" />
        <KpiCard label={t('collection.kpi.outstanding')} value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
      </div>
    )
  }
  // all — Vue d'ensemble : 8 KPI fiscaux complets
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label={t('collection.kpi.rate')} value={`${stats.collectionRate.toFixed(1)} %`} icon={<Clock className="h-5 w-5 text-violet-500"/>} wrap="bg-violet-500/10" bar="bg-violet-500" sub={t('collection.kpi.rateSub')} />
      <KpiCard label={t('collection.kpi.collected')} value={fmtMGA(stats.totalCollected)} icon={<Wallet className="h-5 w-5 text-emerald-500"/>} wrap="bg-emerald-500/10" bar="bg-emerald-500" sub={t('collection.kpi.exigible',{amount:fmtMGA(stats.totalExigible)})} />
      <KpiCard label={t('collection.kpi.outstanding')} value={fmtMGA(stats.totalOutstanding)} icon={<AlertCircle className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
      <KpiCard label={t('collection.kpi.overdueFiles')} value={stats.overdueDebts} icon={<AlertTriangle className="h-5 w-5 text-rose-500"/>} wrap="bg-rose-500/10" bar="bg-rose-500" sub={stats.overdueBalance>0?t('collection.kpi.overdueBalance',{amount:fmtMGA(stats.overdueBalance)}):t('collection.kpi.noOverdueBalance')} />
      <KpiCard label={t('collection.kpi.overdueAging')} value={`${stats.overdue30} · ${stats.overdue60} · ${stats.overdue90}`} icon={<Clock className="h-5 w-5 text-amber-500"/>} wrap="bg-amber-500/10" bar="bg-amber-500" sub={t('collection.kpi.aging')} />
      <KpiCard label={t('collection.kpi.reminders')} value={stats.reminderActions} icon={<Send className="h-5 w-5 text-violet-500"/>} wrap="bg-violet-500/10" bar="bg-violet-500" />
      <KpiCard label={t('collection.kpi.notices')} value={stats.noticeCount} icon={<FileText className="h-5 w-5 text-orange-500"/>} wrap="bg-orange-500/10" bar="bg-orange-500" />
      <KpiCard label={t('collection.kpi.disputes')} value={stats.disputedDebts} icon={<AlertCircle className="h-5 w-5 text-red-500"/>} wrap="bg-red-500/10" bar="bg-red-500" sub={t('collection.kpi.suspendedPartial',{s:stats.suspendedDebts,p:stats.partialDebts})} />
    </div>
  )
}
