import { Spinner } from '../../../../components/ui'
import { ACTION_ICONS, ACTION_KEYS } from '../../../../components/collection/constants'
import { useI18n } from '../../../../lib/i18n'

export function HistoryModal({ open, onClose, history, fmtDate }: any) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('collection.modal.history.title')}</h3>
        {history ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('collection.modal.history.actions',{count:history.actions.length})}</p>
              {history.actions.length===0?<p className="text-sm text-slate-500">{t('collection.modal.history.noActions')}</p>:<ul className="space-y-2">{history.actions.map((a:any)=><li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700/50"><div className="flex items-center justify-between gap-2"><span className="font-medium">{ACTION_ICONS[a.type]??''} {t((ACTION_KEYS as Record<string,string>)[a.type] ?? 'common.unknown')}</span><span className="text-xs text-slate-500">{fmtDate(a.actionDate)}</span></div><p className="mt-0.5 text-slate-600 dark:text-slate-400">{a.description}</p>{a.outcome&&<p className="text-xs text-emerald-600">{t('collection.modal.history.result',{result:a.outcome})}</p>}</li>)}</ul>}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('collection.modal.history.notices',{count:history.notices.length})}</p>
              {history.notices.length===0?<p className="text-sm text-slate-500">{t('collection.modal.history.noNotices')}</p>:<ul className="space-y-2">{history.notices.map((n:any)=><li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700/50"><div className="flex items-center justify-between"><span className="font-mono font-medium">{n.noticeNumber}</span><span className="text-xs text-slate-500">{fmtDate(n.noticeDate)}</span></div><p className="mt-0.5 text-slate-600">{n.content||n.noticeType}</p></li>)}</ul>}
            </div>
          </div>
        ):<Spinner/>}
      </div>
    </div>
  )
}
