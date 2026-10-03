import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useI18n } from '../../../../lib/i18n'
import { apiErrorMessage, apiGet, apiPost } from '../../../../lib/api'
import type { CollectionDebtRow, Page } from '../../../../types'
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from '../../../../components/ui'
import { useToast } from '../../../../components/Toast'
import { ACTION_KEYS, ACTION_ICONS, TERMINAL_STATUSES } from '../../../../components/collection/constants'

interface ActionWizardProps {
  open: boolean
  onClose: () => void
  presetDebtId?: string
  debts?: CollectionDebtRow[]
}

export type ActionFormData = {
  debtId: string
  type: string
  description: string
  actionDate: string
  outcome: string
  nextAction: string
  nextActionDate: string
}

function emptyForm(): ActionFormData {
  return {
    debtId: '',
    type: 'PHONE_CONTACT',
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  }
}

export function ActionWizard({ open, onClose, presetDebtId, debts: externalDebts }: ActionWizardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const today = new Date().toISOString().slice(0, 10)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ActionFormData>(emptyForm())
  const [debtId, setDebtId] = useState(presetDebtId || '')
  const [type, setType] = useState('PHONE_CONTACT')

  const { data: debtsData } = useQuery({
    queryKey: ['collection-action-debts'],
    queryFn: () => apiGet<Page<CollectionDebtRow>>('/collection/debts?size=9999'),
    enabled: open,
  })

  const debts = externalDebts ?? debtsData?.content ?? []
  const selectableDebts = debts.filter(
    (d) => d.balance > 0 && !TERMINAL_STATUSES.includes(d.debtStatus as any)
  )

  const selectedDebt = debts.find((d) => String(d.id) === debtId)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm(emptyForm())
    setDebtId(presetDebtId || '')
    setType('PHONE_CONTACT')
  }, [open, presetDebtId])

  const createAction = useMutation({
    mutationFn: () =>
      apiPost('/collection/actions', {
        debtId: Number(form.debtId),
        type: form.type as any,
        description: form.description,
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
      toast.success(t('collection.actionSaved'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const validateStep = () => {
    switch (step) {
      case 0:
        return !!form.debtId && !!form.type
      case 1:
        return !!form.description.trim() && !!form.actionDate
      case 2:
        return true
      default:
        return false
    }
  }

  const handleSubmit = () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }
    createAction.mutate()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`${t('collection.newAction')} — Étape ${step + 1}/3`} subtitle={t('collection.wizard.action.subtitle')} size="full">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <Field label={t('collection.wizard.action.debt')}>
              <Select value={debtId} onChange={(e) => { setDebtId(e.target.value); setForm({ ...form, debtId: e.target.value }) }}>
                <option value="">{t('collection.wizard.action.selectDebt')}</option>
                {selectableDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference} — {d.taxpayerName} — {d.taxTypeCode} {d.period} — {t('collection.wizard.action.remaining', { amount: d.balance })}
                  </option>
                ))}
              </Select>
              {selectableDebts.length === 0 && <p className="mt-1 text-xs text-amber-500">{t('collection.wizard.action.noDebts')}</p>}
            </Field>

            <Field label={t('collection.wizard.action.type')}>
              <Select value={type} onChange={(e) => { setType(e.target.value); setForm({ ...form, type: e.target.value }) }}>
                {Object.entries(ACTION_KEYS).map(([k, key]) => (
                  <option key={k} value={k}>{ACTION_ICONS[k] ?? ''} {t(key)}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <Field label={t('collection.wizard.action.description')}>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('collection.wizard.action.descriptionPh')}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('collection.wizard.action.actionDate')}>
                <Input type="date" value={form.actionDate} onChange={(e) => setForm({ ...form, actionDate: e.target.value })} max={today} />
              </Field>
              <Field label={t('collection.wizard.action.outcomeOpt')}>
                <Input
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                  placeholder={t('collection.wizard.action.outcomePh')}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <Field label={t('collection.wizard.action.nextActionOpt')}>
              <Input
                value={form.nextAction}
                onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                placeholder={t('collection.wizard.action.nextActionPh')}
              />
            </Field>

            <Field label={t('collection.wizard.action.nextDateOpt')}>
              <Input type="date" value={form.nextActionDate} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="font-semibold mb-3">{t('collection.wizard.action.review')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.debt')}</span><span className="font-medium">{selectedDebt ? `${selectedDebt.reference} — ${selectedDebt.taxpayerName}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.type')}</span><span className="font-medium">{ACTION_ICONS[type] ?? ''} {t(ACTION_KEYS[type] ?? 'common.unknown')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.description')}</span><span className="font-medium">{form.description}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.actionDate')}</span><span className="font-medium">{form.actionDate}</span></div>
                {form.outcome && <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.outcome')}</span><span className="font-medium">{form.outcome}</span></div>}
                {form.nextAction && <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.action.nextAction')}</span><span className="font-medium">{form.nextAction}{form.nextActionDate ? ` — ${form.nextActionDate}` : ''}</span></div>}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('common.previous')}</Button>}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            {step < 2 ? (
              <Button onClick={handleSubmit} disabled={!validateStep()} className="bg-brand-600 text-white">
                {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={createAction.isPending} disabled={!validateStep()}>
                {t('collection.wizard.action.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}