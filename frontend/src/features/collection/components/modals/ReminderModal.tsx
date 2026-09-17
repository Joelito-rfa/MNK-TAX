import { Button, Field, Input, Select, Textarea } from '../../../../components/ui'
import { TERMINAL_STATUSES } from '../../../../components/collection/constants'
import { apiErrorMessage } from '../../../../lib/api'
import { useI18n } from '../../../../lib/i18n'

/**
 * Relance amiable — échelle fiscale : contact amiable enregistré par l'agent
 * avant tout acte formel. La relance alimente le journal (REMINDER_CREATED) et
 * ne change jamais la phase du dossier ; la mise en demeure reste un acte
 * formel explicite.
 */
export type ReminderForm = {
  debtId: string
  description: string
  actionDate: string
  outcome: string
  nextAction: string
  nextActionDate: string
}

export function emptyReminderForm(debtId = ''): ReminderForm {
  return {
    debtId,
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  }
}

export function ReminderModal({
  open,
  onClose,
  form,
  setForm,
  debts,
  debt,
  onSubmit,
  pending,
  error,
  fmtMGA,
}: {
  open: boolean
  onClose: () => void
  form: ReminderForm
  setForm: (f: ReminderForm) => void
  debts: any[]
  debt?: { id: number; reference: string; taxpayerName: string; balance: number } | null
  onSubmit: () => void
  pending: boolean
  error: unknown
  fmtMGA: (n: number) => string
}) {
  const { t } = useI18n()
  if (!open) return null
  const selectable = debts ?? []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('collection.modal.reminder.title')}</h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('collection.modal.reminder.subtitle')}
        </p>
        {error != null && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {apiErrorMessage(error)}
          </div>
        )}
        <div className="space-y-4">
          {debt ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
              {t('collection.modal.reminder.debtLine', { ref: debt.reference, name: debt.taxpayerName, amount: fmtMGA(debt.balance) })}
            </div>
          ) : (
            <Field label={t('collection.modal.reminder.debt')}>
              <Select value={form.debtId} onChange={(e) => setForm({ ...form, debtId: e.target.value })}>
                <option value="">{t('collection.modal.reminder.selectDebt')}</option>
                {selectable
                  .filter((d: any) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus))
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.reference} — {d.taxpayerName} — {t('collection.modal.action.remaining', { amount: fmtMGA(d.balance) })}
                    </option>
                  ))}
              </Select>
            </Field>
          )}

          <Field label={t('collection.modal.reminder.reason')}>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('collection.modal.reminder.reasonPh')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('collection.modal.reminder.date')}>
              <Input type="date" value={form.actionDate} onChange={(e) => setForm({ ...form, actionDate: e.target.value })} />
            </Field>
            <Field label={t('collection.modal.reminder.outcomeOpt')}>
              <Input
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                placeholder={t('collection.modal.reminder.outcomePh')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('collection.modal.reminder.nextOpt')}>
              <Input
                value={form.nextAction}
                onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                placeholder={t('collection.modal.reminder.nextPh')}
              />
            </Field>
            <Field label={t('collection.modal.reminder.nextDateOpt')}>
              <Input type="date" value={form.nextActionDate} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>{t('collection.modal.reminder.cancel')}</Button>
            <Button onClick={onSubmit} disabled={pending || !form.debtId || !form.description.trim()}>
              {pending ? t('collection.modal.reminder.saving') : t('collection.modal.reminder.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
