import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { useI18n } from '../../lib/i18n'
import { PaymentForm } from '../../features/payment/components/PaymentForm'

/** Sous-module « Nouveau paiement » : saisie en pleine page (le module parent fournit l'en-tête et les onglets). */
export default function PaymentsNew() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const backToList = () => navigate('/payments')

  return (
    <Card className="mx-auto w-full max-w-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('payments.create.title')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('payments.create.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={backToList}>
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Button>
      </div>
      <div className="pt-5">
        <PaymentForm onSaved={backToList} onCancel={backToList} />
      </div>
    </Card>
  )
}
