import { Button, Select } from '../../../../components/ui'
import { useI18n } from '../../../../lib/i18n'
import { methodLabel } from '../../../payment/lib/methods'

const METHOD_CODES = ['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY', 'CARD']

export function PaymentModal({ open, onClose, debt, form, setForm, onSubmit, pending, error, fmtMGA }: any) {
  const { t } = useI18n()
  if (!open || !debt) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('collection.modal.payment.title')}</h3>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{t('collection.modal.payment.saveError')}</div>}
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 mb-4">{t('collection.modal.payment.debtBalanceShort', { ref: debt.reference, amount: fmtMGA(debt.balance) })}</div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.amount')}</label><input type="number" min="1" max={debt.balance} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.date')}</label><input type="date" value={form.paymentDate} onChange={e=>setForm({...form,paymentDate:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.payment.mode')}</label><Select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}>{METHOD_CODES.map((c)=><option key={c} value={c}>{methodLabel(c, t)}</option>)}</Select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>{t('collection.modal.payment.cancel')}</Button><Button onClick={onSubmit} disabled={pending || !form.amount}>{pending?t('collection.modal.payment.saving'):t('collection.modal.payment.save')}</Button></div>
        </div>
      </div>
    </div>
  )
}
