import {
  CalendarDays,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileWarning,
  History,
  Mail,
  PhoneCall,
  Send,
} from 'lucide-react'
import type { CollectionDebtRow, DebtStatus } from '../../types'
import { useI18n } from '../../lib/i18n'
import { TERMINAL_STATUSES } from './constants'
import RowActionPortal from '../RowActionPortal'

export function RowActions({
  debt,
  onView,
  onPayment,
  onCall,
  onReminder,
  onNotice,
  onCommandment,
  onAtd,
  onPaymentPlan,
  onHistory,
}: {
  debt: CollectionDebtRow
  onView: () => void
  onPayment: () => void
  onCall: () => void
  onReminder: () => void
  onNotice: () => void
  onCommandment: () => void
  onAtd: () => void
  onPaymentPlan: () => void
  onHistory: () => void
}) {
  const { t } = useI18n()
  const isTerminal = TERMINAL_STATUSES.includes(debt.debtStatus as DebtStatus)
  const canPay = debt.balance > 0 && !isTerminal

  return (
    <RowActionPortal width={256} ariaLabel={t('collection.row.actionsOnDebt')}>
      <button
        onClick={() => { onView() }}
        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('collection.row.view')}
      </button>
      {!isTerminal && (
        <>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <button
            onClick={() => { onCall() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <PhoneCall className="h-4 w-4 shrink-0 text-blue-500" /> {t('collection.row.logCall')}
          </button>
          <button
            onClick={() => { onReminder() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Send className="h-4 w-4 shrink-0 text-violet-500" /> {t('collection.row.sendReminder')}
          </button>
          <button
            onClick={() => { onNotice() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Mail className="h-4 w-4 shrink-0 text-orange-500" /> {t('collection.row.notice')}
          </button>
          <button
            onClick={() => { onCommandment() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileWarning className="h-4 w-4 shrink-0 text-red-500" /> {t('collection.row.commandment')}
          </button>
          <button
            onClick={() => { onAtd() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-indigo-500" /> {t('collection.row.atd')}
          </button>
          <button
            onClick={() => { onPaymentPlan() }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-sky-500" /> {t('collection.row.plan')}
          </button>
          {canPay && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
              <button
                onClick={() => { onPayment() }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              >
                <CreditCard className="h-4 w-4 shrink-0" /> {t('collection.row.recordPayment')}
              </button>
            </>
          )}
        </>
      )}
      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
      <button
        onClick={() => { onHistory() }}
        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <History className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('collection.row.history')}
      </button>
    </RowActionPortal>
  )
}
