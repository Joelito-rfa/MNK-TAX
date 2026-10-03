import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Calculator,
  User,
  CreditCard,
  FileText,
} from 'lucide-react'
import { useI18n } from '../../../../lib/i18n'
import { apiErrorMessage, apiGet, apiPost } from '../../../../lib/api'
import type { TaxType, Page } from '../../../../types'
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from '../../../../components/ui'
import { useToast } from '../../../../components/Toast'

interface CollectionCreateWizardProps {
  open: boolean
  onClose: () => void
}

interface TaxpayerOption {
  id: number
  nif: string
  name: string
  taxCenterCode?: string
  taxCenterName?: string
  taxRegimeCode?: string
}

interface CreateCollectionRequest {
  taxpayerId: number
  taxTypeCode: string
  period: string
  principalAmount: number
  penaltyAmount: number
  interestAmount: number
  dueDate: string
  collectionPriority: 'HIGH' | 'NORMAL' | 'LOW'
  assignedTo?: number
  observations?: string
  origin: 'DECLARATION' | 'CONTROL' | 'MANUAL' | 'OTHER'
}

function emptyForm(): CreateCollectionRequest {
  return {
    taxpayerId: 0,
    taxTypeCode: '',
    period: '',
    principalAmount: 0,
    penaltyAmount: 0,
    interestAmount: 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    collectionPriority: 'NORMAL',
    assignedTo: undefined,
    observations: '',
    origin: 'MANUAL',
  }
}

export function CollectionCreateWizard({ open, onClose }: CollectionCreateWizardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const today = new Date().toISOString().slice(0, 10)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CreateCollectionRequest>(emptyForm())

  const { data: taxpayers } = useQuery({
    queryKey: ['taxpayers-for-collection'],
    queryFn: () => apiGet<Page<TaxpayerOption>>('/taxpayers?size=9999&status=ACTIVE'),
    enabled: open,
  })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-for-collection'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
    enabled: open,
  })

  const { data: agents } = useQuery({
    queryKey: ['agents-for-collection'],
    queryFn: () => apiGet<Array<{ id: number; username: string; fullName: string }>>('/users?role=AGENT_COLLECTION&size=9999'),
    enabled: open,
  })

  const selectedTaxpayer = taxpayers?.content?.find((tp) => tp.id === form.taxpayerId)
  const selectedTaxType = taxTypes?.find((tt) => tt.code === form.taxTypeCode)
  const totalAmount = (form.principalAmount || 0) + (form.penaltyAmount || 0) + (form.interestAmount || 0)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm(emptyForm())
  }, [open])

  const createCollection = useMutation({
    mutationFn: () =>
      apiPost('/collection/debts', {
        taxpayerId: form.taxpayerId,
        taxTypeCode: form.taxTypeCode,
        period: form.period,
        principalAmount: form.principalAmount,
        penaltyAmount: form.penaltyAmount,
        interestAmount: form.interestAmount,
        dueDate: form.dueDate,
        collectionPriority: form.collectionPriority,
        assignedTo: form.assignedTo || null,
        observations: form.observations || null,
        origin: form.origin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
      queryClient.invalidateQueries({ queryKey: ['debt-stats'] })
      toast.success(t('collection.wizard.create.success'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const validateStep = () => {
    switch (step) {
      case 0:
        return !!form.taxpayerId && !!form.taxTypeCode
      case 1:
        return !!form.period && form.principalAmount > 0 && !!form.dueDate
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  const handleSubmit = () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    createCollection.mutate()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`${t('collection.wizard.create.title')} — Étape ${step + 1}/4`} subtitle={t('collection.wizard.create.subtitle')} size="full">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><User className="h-4 w-4" /> {t('collection.wizard.create.step1Title')}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('collection.wizard.create.taxpayer')}>
                <Select value={String(form.taxpayerId)} onChange={(e) => setForm({ ...form, taxpayerId: Number(e.target.value) || 0 })}>
                  <option value="0">{t('collection.wizard.create.selectTaxpayer')}</option>
                  {taxpayers?.content?.map((tp) => (
                    <option key={tp.id} value={tp.id}>{tp.nif} — {tp.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('collection.wizard.create.taxType')}>
                <Select value={form.taxTypeCode} onChange={(e) => setForm({ ...form, taxTypeCode: e.target.value })}>
                  <option value="">{t('collection.wizard.create.selectTaxType')}</option>
                  {taxTypes?.map((tt) => (
                    <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {selectedTaxpayer && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                <p className="font-medium">{selectedTaxpayer.nif} — {selectedTaxpayer.name}</p>
                {selectedTaxpayer.taxCenterName && <p className="text-slate-500">{selectedTaxpayer.taxCenterName}</p>}
                {selectedTaxpayer.taxRegimeCode && <p className="text-slate-500">Régime : {selectedTaxpayer.taxRegimeCode}</p>}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Calculator className="h-4 w-4" /> {t('collection.wizard.create.step2Title')}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t('collection.wizard.create.period')}>
                <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2024" maxLength={10} />
              </Field>
              <Field label={t('collection.wizard.create.dueDate')}>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} min={today} />
              </Field>
              <Field label={t('collection.wizard.create.origin')}>
                <Select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as any })}>
                  <option value="DECLARATION">{t('collection.wizard.create.origin.DECLARATION')}</option>
                  <option value="CONTROL">{t('collection.wizard.create.origin.CONTROL')}</option>
                  <option value="MANUAL">{t('collection.wizard.create.origin.MANUAL')}</option>
                  <option value="OTHER">{t('collection.wizard.create.origin.OTHER')}</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t('collection.wizard.create.principal')}>
                <Input type="number" min="0" step="0.01" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: Number(e.target.value) || 0 })} placeholder="0.00" />
              </Field>
              <Field label={t('collection.wizard.create.penalty')}>
                <Input type="number" min="0" step="0.01" value={form.penaltyAmount} onChange={(e) => setForm({ ...form, penaltyAmount: Number(e.target.value) || 0 })} placeholder="0.00" />
              </Field>
              <Field label={t('collection.wizard.create.interest')}>
                <Input type="number" min="0" step="0.01" value={form.interestAmount} onChange={(e) => setForm({ ...form, interestAmount: Number(e.target.value) || 0 })} placeholder="0.00" />
              </Field>
            </div>
            <div className="rounded-lg bg-brand-50 p-3 border border-brand-200 dark:bg-brand-900/20 dark:border-brand-800">
              <p className="font-semibold flex justify-between">
                <span>{t('collection.wizard.create.total')}</span>
                <span>{totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA</span>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CreditCard className="h-4 w-4" /> {t('collection.wizard.create.step3Title')}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('collection.wizard.create.priority')}>
                <Select value={form.collectionPriority} onChange={(e) => setForm({ ...form, collectionPriority: e.target.value as any })}>
                  <option value="HIGH">{t('collection.wizard.create.priority.HIGH')}</option>
                  <option value="NORMAL">{t('collection.wizard.create.priority.NORMAL')}</option>
                  <option value="LOW">{t('collection.wizard.create.priority.LOW')}</option>
                </Select>
              </Field>
              <Field label={t('collection.wizard.create.assignedTo')}>
                <Select value={String(form.assignedTo || '')} onChange={(e) => setForm({ ...form, assignedTo: Number(e.target.value) || undefined })}>
                  <option value="">{t('collection.wizard.create.noAgent')}</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>{a.fullName || a.username}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t('collection.wizard.create.observations')}>
              <Textarea
                rows={3}
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                placeholder={t('collection.wizard.create.observationsPh')}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText className="h-4 w-4" /> {t('collection.wizard.create.step4Title')}</h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.taxpayer')}</p>
                    <p className="font-medium">{selectedTaxpayer ? `${selectedTaxpayer.nif} — ${selectedTaxpayer.name}` : '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.taxType')}</p>
                    <p className="font-medium">{selectedTaxType ? `${selectedTaxType.code} — ${selectedTaxType.name}` : '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.period')}</p>
                    <p className="font-medium">{form.period || '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.dueDate')}</p>
                    <p className="font-medium">{form.dueDate}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.origin')}</p>
                    <p className="font-medium">{t(`collection.wizard.create.origin.${form.origin}`)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('collection.wizard.create.priority')}</p>
                    <p className="font-medium">{t(`collection.wizard.create.priority.${form.collectionPriority}`)}</p>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{t('collection.wizard.create.principal')}</p>
                      <p className="font-medium">{form.principalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{t('collection.wizard.create.penalty')}</p>
                      <p className="font-medium">{form.penaltyAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{t('collection.wizard.create.interest')}</p>
                      <p className="font-medium">{form.interestAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t('collection.wizard.create.total')}</span>
                      <span>{totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MGA</span>
                    </div>
                  </div>
                  {form.assignedTo && agents && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{t('collection.wizard.create.assignedTo')}</p>
                      <p className="font-medium">{agents.find(a => a.id === form.assignedTo)?.fullName || form.assignedTo}</p>
                    </div>
                  )}
                  {form.observations && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{t('collection.wizard.create.observations')}</p>
                      <p className="font-medium">{form.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('common.previous')}</Button>}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            {step < 3 ? (
              <Button onClick={handleSubmit} disabled={!validateStep()} className="bg-brand-600 text-white">
                {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={createCollection.isPending} disabled={!validateStep()}>
                {t('collection.wizard.create.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}