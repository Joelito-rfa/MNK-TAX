import { Button, Select } from '../../../../components/ui'
import { ACTION_KEYS } from '../../../../components/collection/constants'
import { useI18n } from '../../../../lib/i18n'

export function ActionModal({ open, onClose, actionType, form, setForm, debts, onSubmit, pending, error }: {
  open:boolean; onClose:()=>void; actionType:string;
  form:{ debtId:string; type:string; description:string; actionDate:string; outcome:string; nextAction:string; nextActionDate:string };
  setForm:(f:any)=>void; debts:any[]; onSubmit:()=>void; pending:boolean; error:boolean
}) {
  const { t } = useI18n()
  if (!open) return null
  const title = actionType==='call'?t('collection.modal.action.titleCall'):actionType==='reminder'?t('collection.modal.action.titleReminder'):actionType==='commandment'?t('collection.modal.action.titleCommandment'):actionType==='atd'?t('collection.modal.action.titleAtd'):actionType==='payment_plan'?t('collection.modal.action.titlePlan'):actionType==='suspension'?t('collection.modal.action.titleSuspension'):t('collection.modal.action.titleDefault')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h3>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{t('collection.modal.action.saveError')}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.debt')}</label>
              <Select value={form.debtId} onChange={e=>setForm({...form,debtId:e.target.value})}>
                <option value="">{t('collection.modal.action.selectShort')}</option>
                {debts.map((d:any)=><option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} — {d.taxTypeCode} {d.period}</option>)}
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.type')}</label>
              <Select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                {Object.entries(ACTION_KEYS).map(([k,key])=>[k,t(key as any)]).map(([k,v])=><option key={k as string} value={k as string}>{v as string}</option>)}
              </Select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.description')}</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.actionDate')}</label><input type="date" value={form.actionDate} onChange={e=>setForm({...form,actionDate:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.outcomeOpt')}</label><input value={form.outcome} onChange={e=>setForm({...form,outcome:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.nextOpt')}</label><input value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('collection.modal.action.nextDate')}</label><input type="date" value={form.nextActionDate} onChange={e=>setForm({...form,nextActionDate:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>{t('collection.modal.action.cancel')}</Button><Button onClick={onSubmit} disabled={pending || !form.debtId || !form.description}>{pending?t('collection.modal.action.saving'):t('collection.modal.action.save')}</Button></div>
        </div>
      </div>
    </div>
  )
}
