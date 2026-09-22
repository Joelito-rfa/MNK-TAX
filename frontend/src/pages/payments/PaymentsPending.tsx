import { useI18n } from '../../lib/i18n'
import { PageHeader } from '../../components/ui'
import { PaymentsList } from './PaymentsList'

/** Sous-module « Paiements en attente » : suivi et confirmation des encaissements non encore validés. */
export default function PaymentsPending() {
  const { t } = useI18n()

  return (
    <div className="fx-page space-y-6">
      <PageHeader title={t('payments.pending')} subtitle={t('payments.pending.hint')} />
      <PaymentsList initialStatus="PENDING" pendingMode />
    </div>
  )
}
