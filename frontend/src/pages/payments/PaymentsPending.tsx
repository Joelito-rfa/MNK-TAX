import { Clock } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { PaymentsList } from './PaymentsList'

/** Sous-module « Paiements en attente » : suivi et confirmation des encaissements non encore validés. */
export default function PaymentsPending() {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('payments.pending')}</p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">{t('payments.pending.hint')}</p>
        </div>
      </div>
      <PaymentsList initialStatus="PENDING" pendingMode />
    </div>
  )
}
