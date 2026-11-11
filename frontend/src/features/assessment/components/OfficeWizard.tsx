import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Calculator,
  User,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../../../lib/api'
import type { Page, TaxpayerSummary } from '../../../types'
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from '../../../components/ui'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import { useTaxTypesRef } from '../api/queries'

interface OfficeWizardProps {
  open: boolean
  onClose: () => void
}

interface OfficeForm {
  taxpayerId: number
  taxTypeCode: string
  period: string
  taxBase: number
  credit: number
  adjustment: number
  observations: string
}

function emptyForm(): OfficeForm {
  return {
    taxpayerId: 0,
    taxTypeCode: '',
    period: '',
    taxBase: 0,
    credit: 0,
    adjustment: 0,
    observations: '',
  }
}

const STEP_TITLE_KEYS = ['assessments.page.office.step1', 'assessments.page.office.step2', 'assessments.page.office.step3']

export function OfficeWizard({ open, onClose }: OfficeWizardProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OfficeForm>(emptyForm())

  const { data: taxpayers } = useQuery({
    queryKey: ['taxpayers-for-office'],
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/taxpayers?size=9999&status=ACTIVE'),
    enabled: open,
  })

  const { data: taxTypes } = useTaxTypesRef()

  const selectedTaxpayer = taxpayers?.content?.find((tp) => tp.id === form.taxpayerId)
  const selectedTaxType = taxTypes?.find((tt) => tt.code === form.taxTypeCode)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm(emptyForm())
  }, [open])

  const createOffice = useMutation({
    mutationFn: () =>
      apiPost('/assessments/office', {
        taxpayerId: form.taxpayerId,
        taxTypeCode: form.taxTypeCode,
        period: form.period,
        taxBase: form.taxBase,
        credit: form.credit || null,
        adjustment: form.adjustment || null,
        observations: form.observations || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      toast.success(t('assessments.page.office.success'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const validateStep = () => {
    switch (step) {
      case 0:
        return !!form.taxpayerId && !!form.taxTypeCode
      case 1:
        return !!form.period && form.taxBase > 0
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
    createOffice.mutate()
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('assessments.page.office.title', { step: step + 1 })}
      subtitle={t(STEP_TITLE_KEYS[step])}
      size="full"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <User className="h-4 w-4" /> {t('assessments.page.office.taxpayerTax')}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('common.taxpayer')}>
                <Select
                  value={String(form.taxpayerId)}
                  onChange={(e) => setForm({ ...form, taxpayerId: Number(e.target.value) || 0 })}
                >
                  <option value="0">{t('assessments.page.selectTaxpayer')}</option>
                  {taxpayers?.content?.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.nif} — {tp.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('assessments.page.office.taxType')}>
                <Select
                  value={form.taxTypeCode}
                  onChange={(e) => setForm({ ...form, taxTypeCode: e.target.value })}
                >
                  <option value="">{t('assessments.page.selectTax')}</option>
                  {taxTypes?.map((tt) => (
                    <option key={tt.id} value={tt.code}>
                      {tt.code} — {tt.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {selectedTaxpayer && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                <p className="font-medium">{selectedTaxpayer.nif} — {selectedTaxpayer.name}</p>
                {selectedTaxpayer.taxCenterCode && (
                  <p className="text-slate-500">{t('assessments.page.taxCenter')}{' '}{selectedTaxpayer.taxCenterCode}</p>
                )}
                {selectedTaxpayer.taxRegimeCode && (
                  <p className="text-slate-500">{t('assessments.page.regime')}{' '}{selectedTaxpayer.taxRegimeCode}</p>
                )}
              </div>
            )}
            {selectedTaxType && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                <p className="font-medium">{selectedTaxType.code} — {selectedTaxType.name}</p>
                {selectedTaxType.description && (
                  <p className="text-slate-500">{selectedTaxType.description}</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Calculator className="h-4 w-4" /> {t('assessments.page.office.calculationParams')}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t('common.period')}>
                <Input
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  placeholder="2026-01"
                  maxLength={10}
                />
              </Field>
              <Field label={t('assessments.page.office.taxBase')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxBase}
                  onChange={(e) => setForm({ ...form, taxBase: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </Field>
              <Field label={t('assessments.page.office.creditOptional')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.credit}
                  onChange={(e) => setForm({ ...form, credit: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </Field>
              <Field label={t('assessments.page.office.adjustmentOptional')}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.adjustment}
                  onChange={(e) => setForm({ ...form, adjustment: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <Field label={t('assessments.page.office.observations')}>
              <Textarea
                rows={3}
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                placeholder={t('assessments.page.office.reasonPlaceholder')}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="h-4 w-4" /> {t('assessments.page.office.summary')}
            </h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.taxpayer')}</p>
                  <p className="font-medium">
                    {selectedTaxpayer ? `${selectedTaxpayer.nif} — ${selectedTaxpayer.name}` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('assessments.page.office.taxType')}</p>
                  <p className="font-medium">
                    {selectedTaxType ? `${selectedTaxType.code} — ${selectedTaxType.name}` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.period')}</p>
                  <p className="font-medium">{form.period || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('assessments.page.office.taxBase')}</p>
                  <p className="font-medium">
                    {form.taxBase.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('assessments.page.credit')}</p>
                  <p className="font-medium">
                    {form.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('assessments.page.adjustment')}</p>
                  <p className="font-medium">
                    {form.adjustment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA
                  </p>
                </div>
              </div>
              {form.observations && (
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('assessments.page.office.observations')}</p>
                  <p className="font-medium">{form.observations}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t('common.previous')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {step < 2 ? (
              <Button onClick={handleSubmit} disabled={!validateStep()} className="bg-brand-600 text-white">
                {t('common.next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={createOffice.isPending} disabled={!validateStep()}>
                {t('assessments.page.office.emit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
