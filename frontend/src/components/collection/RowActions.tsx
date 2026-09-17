import { useState } from 'react'
import {
  CalendarDays,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileWarning,
  History,
  Mail,
  MoreHorizontal,
  PhoneCall,
  Send,
} from 'lucide-react'
import type { CollectionDebtRow, DebtStatus } from '../../types'
import { useI18n } from '../../lib/i18n'
import { TERMINAL_STATUSES } from './constants'

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
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const isTerminal = TERMINAL_STATUSES.includes(debt.debtStatus as DebtStatus)
  const canPay = debt.balance > 0 && !isTerminal

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label={t('collection.row.actionsOnDebt')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
            <div className="space-y-0.5">
              <button
                onClick={() => { onView(); setOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('collection.row.view')}
              </button>
              {!isTerminal && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={() => { onCall(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <PhoneCall className="h-4 w-4 shrink-0 text-blue-500" /> {t('collection.row.logCall')}
                  </button>
                  <button
                    onClick={() => { onReminder(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Send className="h-4 w-4 shrink-0 text-violet-500" /> {t('collection.row.sendReminder')}
                  </button>
                  <button
                    onClick={() => { onNotice(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-orange-500" /> {t('collection.row.notice')}
                  </button>
                  <button
                    onClick={() => { onCommandment(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <FileWarning className="h-4 w-4 shrink-0 text-red-500" /> {t('collection.row.commandment')}
                  </button>
                  <button
                    onClick={() => { onAtd(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-indigo-500" /> {t('collection.row.atd')}
                  </button>
                  <button
                    onClick={() => { onPaymentPlan(); setOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 text-sky-500" /> {t('collection.row.plan')}
                  </button>
                  {canPay && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                      <button
                        onClick={() => { onPayment(); setOpen(false) }}
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
                onClick={() => { onHistory(); setOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <History className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('collection.row.history')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
