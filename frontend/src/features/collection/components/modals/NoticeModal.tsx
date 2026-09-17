import { Button, Select } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../lib/api'
import { useI18n } from '../../../../lib/i18n'

export function NoticeModal({ open, onClose, debtId, setDebtId, content, setContent, debts, onSubmit, pending, error }: any) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('collection.modal.notice.title')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('collection.modal.notice.subtitle')}</p>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{apiErrorMessage(error)}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.notice.debt')}</label>
            <Select value={debtId} onChange={e=>setDebtId(e.target.value)}><option value="">{t('collection.modal.notice.selectDebt')}</option>{debts.map((d:any)=><option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName}</option>)}</Select>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.notice.contentOpt')}</label><textarea rows={4} value={content} onChange={e=>setContent(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>{t('collection.modal.notice.cancel')}</Button><Button onClick={onSubmit} disabled={pending || !debtId}>{pending?t('collection.modal.notice.issuing'):t('collection.modal.notice.issue')}</Button></div>
        </div>
      </div>
    </div>
  )
}
