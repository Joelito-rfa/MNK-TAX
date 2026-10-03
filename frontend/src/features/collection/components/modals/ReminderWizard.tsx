import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../../../../lib/i18n'
import { apiErrorMessage, apiGet, apiPost } from '../../../../lib/api'
import type { CollectionDebtRow, Page } from '../../../../types'
import { Button, Field, Input, Modal, Select, Textarea } from '../../../../components/ui'
import { useToast } from '../../../../components/Toast'
import { TERMINAL_STATUSES } from '../../../../components/collection/constants'

/**
 * Relance amiable en 3 étapes — même pattern que ActionWizard / NoticeWizard.
 * Étape 1 : créance · Étape 2 : motif + date/résultat · Étape 3 : suivi + récapitulatif.
 * Enregistrée comme action REMINDER, sans changement de phase du dossier.
 */
interface ReminderWizardProps {
  open: boolean
  onClose: () => void
  presetDebtId?: string
  presetDebt?: { id: number; reference: string; taxpayerName: string; balance: number } | null
  debts?: CollectionDebtRow[]
}

type ReminderWizardForm = {
  debtId: string
  description: string
  actionDate: string
  outcome: string
  nextAction: string
  nextActionDate: string
}

function emptyForm(debtId = ''): ReminderWizardForm {
  return {
    debtId,
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  }
}

export function ReminderWizard({ open, onClose, presetDebtId, presetDebt, debts: externalDebts }: ReminderWizardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ReminderWizardForm>(emptyForm(presetDebtId ?? ''))

  const { data: debtsData } = useQuery({
    queryKey: ['collection-reminder-debts'],
    queryFn: () => apiGet<Page<CollectionDebtRow>>('/collection/debts?size=9999'),
    enabled: open && !externalDebts,
  })

  const debts = externalDebts ?? debtsData?.content ?? []
  const selectable = debts.filter((d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus as any))
  const selected = presetDebt ?? debts.find((d) => String(d.id) === form.debtId)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm(emptyForm(presetDebtId ?? ''))
  }, [open, presetDebtId])

  const createReminder = useMutation({
    mutationFn: () =>
      apiPost('/collection/actions', {
        debtId: Number(form.debtId),
        type: 'REMINDER',
        description: form.description.trim(),
        actionDate: form.actionDate,
        outcome: form.outcome || undefined,
        nextAction: form.nextAction || undefined,
        nextActionDate: form.nextActionDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
      queryClient.invalidateQueries({ queryKey: ['collection-history'] })
      queryClient.invalidateQueries({ queryKey: ['collection-action-debts'] })
      toast.success(t('collection.reminderSaved'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const stepValid = [!!form.debtId, !!form.description.trim() && !!form.actionDate, true][step] ?? false

  function next() {
    if (step < 2 && stepValid) setStep(step + 1)
  }

  function submit() {
    if (step < 2) { next(); return }
    createReminder.mutate()
  }

  if (!open) return null
  const stepLabels = [t('collection.modal.reminder.debt'), t('collection.modal.reminder.reason'), t('common.review')]

  return (
    <Modal open={open} onClose={onClose} title={`${t('collection.modal.reminder.title')} — Étape ${step + 1}/3`} subtitle={t('collection.modal.reminder.subtitle')} size="full">
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wide">
            {stepLabels.map((label, i) => (
              <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>{label}</span>
            ))}
          </div>
        </div>

        {createReminder.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {apiErrorMessage(createReminder.error)}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            {presetDebt ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                {presetDebt.reference} — {presetDebt.taxpayerName}
              </div>
            ) : (
              <Field label={t('collection.modal.reminder.debt')}>
                <Select value={form.debtId} onChange={(e) => setForm({ ...form, debtId: e.target.value })}>
                  <option value="">{t('collection.modal.reminder.selectDebt')}</option>
                  {selectable.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.reference} — {d.taxpayerName} — {d.balance}
                    </option>
                  ))}
                </Select>
                {selectable.length === 0 && (
                  <p className="mt-1 text-xs text-amber-500">{t('collection.modal.action.noDebts')}</p>
                )}
              </Field>
            )}
            {!form.debtId && (
              <p className="text-xs text-slate-400">{t('collection.modal.reminder.selectDebt')}</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Field label={`${t('collection.modal.reminder.reason')} *`}>
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="mb-3 font-semibold">{t('common.review')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('collection.modal.reminder.debt')}</span><span className="font-medium">{selected ? `${selected.reference} — ${selected.taxpayerName}` : '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('collection.modal.reminder.reason')}</span><span className="max-w-72 truncate font-medium">{form.description || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">{t('collection.modal.reminder.date')}</span><span className="font-medium">{form.actionDate || '—'}</span></div>
                {form.outcome && <div className="flex justify-between gap-4"><span className="text-slate-500">{t('collection.modal.reminder.outcome')}</span><span className="font-medium">{form.outcome}</span></div>}
                {(form.nextAction || form.nextActionDate) && <div className="flex justify-between gap-4"><span className="text-slate-500">{t('collection.modal.reminder.next')}</span><span className="font-medium">{form.nextAction}{form.nextActionDate ? ` — ${form.nextActionDate}` : ''}</span></div>}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ChevronLeft className="mr-1 h-4 w-4" /> {t('common.previous')}</Button>}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('collection.modal.reminder.cancel')}</Button>
            {step < 2 ? (
              <Button onClick={next} disabled={!stepValid} className="bg-brand-600 text-white">
                {t('common.next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={createReminder.isPending} disabled={!form.debtId || !form.description.trim()}>
                {t('collection.modal.reminder.save')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
