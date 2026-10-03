import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { useI18n } from '../../../../lib/i18n'
import { apiErrorMessage, apiGet, apiPost } from '../../../../lib/api'
import type { CollectionDebtRow, Page } from '../../../../types'
import {
  Button,
  Field,
  Modal,
  Select,
  Textarea,
} from '../../../../components/ui'
import { useToast } from '../../../../components/Toast'
import { TERMINAL_STATUSES } from '../../../../components/collection/constants'

interface NoticeWizardProps {
  open: boolean
  onClose: () => void
  presetDebtId?: string
  debts?: CollectionDebtRow[]
}

export function NoticeWizard({ open, onClose, presetDebtId, debts: externalDebts }: NoticeWizardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  const [step, setStep] = useState(0)
  const [debtId, setDebtId] = useState(presetDebtId || '')
  const [content, setContent] = useState('')

  const { data: debtsData } = useQuery({
    queryKey: ['collection-notice-debts'],
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
    setDebtId(presetDebtId || '')
    setContent('')
  }, [open, presetDebtId])

  const createNotice = useMutation({
    mutationFn: () =>
      apiPost('/collection/notices', {
        debtId: Number(debtId),
        noticeType: 'MISE_EN_DEMEURE',
        content: content.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-debts'] })
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] })
      queryClient.invalidateQueries({ queryKey: ['collection-history'] })
      queryClient.invalidateQueries({ queryKey: ['collection-notices'] })
      toast.success(t('collection.noticeIssued'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const validateStep = () => {
    switch (step) {
      case 0:
        return !!debtId
      case 1:
        return true
      default:
        return false
    }
  }

  const handleSubmit = () => {
    if (step < 1) {
      setStep(step + 1)
      return
    }
    createNotice.mutate()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`${t('collection.modal.notice.title')} — Étape ${step + 1}/2`} subtitle={t('collection.wizard.notice.subtitle')} size="wide">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          {[0, 1].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <Field label={t('collection.wizard.notice.debt')}>
              <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
                <option value="">{t('collection.wizard.notice.selectDebt')}</option>
                {selectableDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference} — {d.taxpayerName} — {d.taxTypeCode} {d.period} — {t('collection.wizard.notice.remaining', { amount: d.balance })}
                  </option>
                ))}
              </Select>
              {selectableDebts.length === 0 && <p className="mt-1 text-xs text-amber-500">{t('collection.wizard.notice.noDebts')}</p>}
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <Field label={t('collection.wizard.notice.content')}>
              <Textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('collection.wizard.notice.contentPh')}
              />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" /> {t('collection.wizard.notice.review')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.notice.debt')}</span><span className="font-medium">{selectedDebt ? `${selectedDebt.reference} — ${selectedDebt.taxpayerName}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.notice.type')}</span><span className="font-medium text-amber-600">Mise en demeure</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t('collection.wizard.notice.content')}</span><span className="font-medium">{content || t('collection.wizard.notice.noContent')}</span></div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('collection.wizard.notice.hint')}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div>{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('common.previous')}</Button>}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            {step < 1 ? (
              <Button onClick={handleSubmit} disabled={!validateStep()} className="bg-brand-600 text-white">
                {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={createNotice.isPending} disabled={!validateStep()}>
                {t('collection.wizard.notice.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}