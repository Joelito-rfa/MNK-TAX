import { Table, Td, Th } from '../../../components/ui'
import { StatusBadge } from '../../../components/collection/StatusBadge'
import { useI18n } from '../../../lib/i18n'
import type { Payment } from '../../../types'
import { fmtDate, fmtMGA } from '../../../lib/format'
import { methodLabel } from '../lib/methods'
import RowActionPortal from '../../../components/RowActionPortal'
import { Eye, Ban, Check, CheckCircle2 } from 'lucide-react'

export function PaymentTable({ payments, onView, onCancel, onAllocate, onConfirm }: {
  payments: Payment[]
  onView: (p: Payment) => void
  onCancel?: (p: Payment) => void
  onAllocate?: (p: Payment) => void
  onConfirm?: (p: Payment) => void
}) {
  const { t } = useI18n()
  return (
    <Table>
      <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
        <tr>
          <Th>{t('payments.table.reference')}</Th>
          <Th>{t('payments.table.taxpayer')}</Th>
          <Th>{t('payments.table.nif')}</Th>
          <Th>{t('payments.table.date')}</Th>
          <Th>{t('payments.table.amount')}</Th>
          <Th>{t('payments.table.mode')}</Th>
          <Th>{t('payments.table.allocated')}</Th>
          <Th>{t('payments.table.remaining')}</Th>
          <Th>{t('payments.table.status')}</Th>
          <Th>{t('payments.table.receipt')}</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
        {payments.map((p) => (
          <tr key={p.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
            <Td className="font-mono text-brand-700 text-xs">{p.reference}</Td>
            <Td className="max-w-40 truncate">
              <button onClick={() => onView(p)} className="font-medium text-slate-900 dark:text-slate-100 hover:text-brand-700 hover:underline">{p.taxpayerName}</button>
            </Td>
            <Td className="text-xs text-slate-500">{p.nif}</Td>
            <Td>{fmtDate(p.paymentDate)}</Td>
            <Td className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(p.amount)}</Td>
            <Td className="text-xs">{methodLabel(p.method, t)}</Td>
            <Td>{fmtMGA(p.allocatedAmount)}</Td>
            <Td>
              <span className={p.unpaidAmount > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                {fmtMGA(p.unpaidAmount)}
              </span>
            </Td>
            <Td><StatusBadge status={p.status} /></Td>
            <Td className="text-xs font-mono">{p.receiptReference ?? '—'}</Td>
            <Td>
              <div className="relative">
                <RowActionPortal width={224}>
                  <button onClick={(e) => { e.stopPropagation(); onView(p) }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                    <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> {t('payments.actions.viewDetail')}
                  </button>
                  {onConfirm && p.status === 'PENDING' && (
                    <button onClick={(e) => { e.stopPropagation(); onConfirm(p) }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('payments.actions.confirm')}
                    </button>
                  )}
                  {onCancel && ['PENDING', 'CONFIRMED'].includes(p.status) && (
                    <button onClick={(e) => { e.stopPropagation(); onCancel(p) }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                      <Ban className="h-4 w-4 shrink-0" /> {t('payments.actions.cancel')}
                    </button>
                  )}
                  {onAllocate && p.status !== 'ALLOCATED' && p.status !== 'REFUNDED' && p.status !== 'CANCELLED' && (
                    <button onClick={(e) => { e.stopPropagation(); onAllocate(p) }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                      <Check className="h-4 w-4 shrink-0" /> {t('payments.actions.allocateManual')}
                    </button>
                  )}
                </RowActionPortal>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
