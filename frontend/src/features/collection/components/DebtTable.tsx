import { Table, Td, Th } from '../../../components/ui'
import { StatusBadge } from '../../../components/collection/StatusBadge'
import { PriorityBadge } from '../../../components/collection/PriorityBadge'
import { PaymentProgress } from '../../../components/collection/PaymentProgress'
import { RowActions } from '../../../components/collection/RowActions'
import { TERMINAL_STATUSES, ACTION_ICONS, ACTION_KEYS, daysUntil } from '../../../components/collection/constants'
import type { CollectionDebtRow, DebtStatus } from '../../../types'
import { useI18n } from '../../../lib/i18n'

type Stage = 'all'|'overdue'|'reminders'|'notices'

export function DebtTable({ stage, debts, onView, onPayment, onAction, onNotice, onPlan, onHistory, fmtMGA, fmtDate }: {
  stage: Stage
  debts: CollectionDebtRow[]
  onView:(d:CollectionDebtRow)=>void
  onPayment:(d:CollectionDebtRow)=>void
  onAction:(d:CollectionDebtRow,type:'call'|'reminder'|'commandment'|'atd'|'payment_plan'|'suspension')=>void
  onNotice:(d:CollectionDebtRow)=>void
  onPlan:(d:CollectionDebtRow)=>void
  onHistory:(d:CollectionDebtRow)=>void
  fmtMGA:(n:number)=>string
  fmtDate:(s:string)=>string
}) {
  const { t } = useI18n()
  const cols = stage==='all' ? 'full' : 'compact'
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <Table>
        <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <tr>
            <Th>{t('common.reference')}</Th><Th>NIF</Th><Th>{t('collection.table.taxpayer')}</Th><Th>{t('collection.table.tax')}</Th>
            {cols==='full' && <><Th>{t('collection.table.period')}</Th><Th>{t('collection.table.amountDue')}</Th><Th>{t('collection.table.paid')}</Th></>}
            <Th>{t('collection.table.remaining')}</Th><Th>{t('collection.table.dueDate')}</Th>{cols==='full'&&<Th>{t('collection.table.status')}</Th>}<Th>{t('collection.table.priority')}</Th><Th>{t('collection.table.lastAction')}</Th>{cols==='full'&&<Th>{t('collection.table.agent')}</Th>}<Th className="w-12"></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
          {debts.map((d)=>{
            const isTerminal = TERMINAL_STATUSES.includes(d.debtStatus as DebtStatus)
            const isOverdue = d.daysOverdue>0 && !isTerminal
            const daysLeft = daysUntil(d.dueDate)
            const nearDue = !isTerminal && !isOverdue && daysLeft!==null && daysLeft>=0 && daysLeft<=7
            return (
              <tr key={d.id} className="group cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/40" onClick={()=>onView(d)}>
                <Td><span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{d.reference}</span></Td>
                <Td><span className="font-mono text-xs">{d.nif}</span></Td>
                <Td><span className="block max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200">{d.taxpayerName}</span></Td>
                <Td><span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{d.taxTypeCode}</span></Td>
                {cols==='full' && <>
                  <Td><span className="text-sm text-slate-600 dark:text-slate-400">{d.period}</span></Td>
                  <Td><span className="font-medium text-slate-800 dark:text-slate-200">{fmtMGA(d.totalAmount)}</span></Td>
                  <Td><span className="text-emerald-600 dark:text-emerald-400">{fmtMGA(d.paidAmount)}</span></Td>
                </>}
                <Td>
                  <span className={`font-semibold ${isOverdue?'text-red-500':d.balance>0?'text-amber-600':'text-emerald-600'}`}>{fmtMGA(d.balance)}</span>
                  {cols==='full' && <div className="mt-1"><PaymentProgress paid={d.paidAmount} total={d.totalAmount} /></div>}
                </Td>
                <Td>
                  <span className={`text-sm ${isOverdue?'font-semibold text-red-500':nearDue?'font-medium text-amber-600':'text-slate-600'}`}>{fmtDate(d.dueDate)}</span>
                  {!isTerminal && <p className="text-[10px] text-slate-400">{isOverdue?t('collection.table.daysLate',{count:d.daysOverdue}):daysLeft===0?t('collection.table.today'):daysLeft!==null?t('collection.table.inDays',{count:daysLeft}):''}</p>}
                </Td>
                {cols==='full' && <Td><StatusBadge status={d.debtStatus} /></Td>}
                <Td><PriorityBadge priority={d.collectionPriority} /></Td>
                <Td>
                  <div className="max-w-[170px]">
                    {d.lastAction ? <><p className="truncate text-xs text-slate-600 dark:text-slate-400">{ACTION_ICONS[d.lastActionType??'']??''} {t(ACTION_KEYS[d.lastActionType??'']??'common.unknown')??d.lastAction}</p>{d.lastActionDate&&<p className="text-[10px] text-slate-400">{t('collection.table.on')} {fmtDate(d.lastActionDate)}</p>}</> : <span className="text-xs text-slate-400">—</span>}
                  </div>
                </Td>
                {cols==='full' && <Td><span className="text-xs text-slate-500">{d.lastResponsible??'—'}</span></Td>}
                <Td><div onClick={e=>e.stopPropagation()}><RowActions debt={d} onView={()=>onView(d)} onPayment={()=>onPayment(d)} onCall={()=>onAction(d,'call')} onReminder={()=>onAction(d,'reminder')} onNotice={()=>onNotice(d)} onCommandment={()=>onAction(d,'commandment')} onAtd={()=>onAction(d,'atd')} onPaymentPlan={()=>onPlan(d)} onHistory={()=>onHistory(d)} /></div></Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}
