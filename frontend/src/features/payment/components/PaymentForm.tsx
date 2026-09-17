import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../../../lib/api'
import { fmtDate, fmtMGA } from '../../../lib/format'
import type { Page, TaxDebt } from '../../../types'
import { Button, Field, Input, Select } from '../../../components/ui'
import { useToast } from '../../../components/Toast'
import { useI18n } from '../../../lib/i18n'
import { METHOD_CODES, methodLabel } from '../lib/methods'

const STEP_KEYS = ['payments.create.step1', 'payments.create.step2', 'payments.create.step3']

/** Formulaire de saisie d'un paiement en 3 étapes, réutilisable en pleine page. */
export function PaymentForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [debtId, setDebtId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [transactionRef, setTransactionRef] = useState('')
  const [observations, setObservations] = useState('')

  const { data: debts } = useQuery({
    queryKey: ['debts-open'],
    queryFn: () => apiGet<Page<TaxDebt>>('/debts?size=200'),
    select: (d) => d.content.filter((x) => ['ISSUED', 'OVERDUE', 'IN_COLLECTION', 'PARTIALLY_PAID'].includes(x.status)),
  })

  const create = useMutation({
    mutationFn: (payload: {
      debtId: number; amount: number; paymentDate: string; method: string
      transactionReference?: string; observations?: string
    }) => apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('payments.created'))
      onSaved()
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const selectedDebt = debts?.find((d) => d.id === Number(debtId))
  const amountNum = Number(amount)
  const amountValid = !!amount && amountNum > 0 && (!selectedDebt || amountNum <= selectedDebt.balance)
  const canNext = step === 0 ? !!selectedDebt : step === 1 ? amountValid : true

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (step < 2) return
        create.mutate({ debtId: Number(debtId), amount: amountNum, paymentDate, method, transactionReference: transactionRef || undefined, observations: observations || undefined })
      }}
      className="space-y-4"
      noValidate
    >
      {create.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {apiErrorMessage(create.error)}
        </div>
      )}
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 transition dark:bg-slate-700">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wide">
          {STEP_KEYS.map((k) => t(k)).map((label, i) => (
            <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}>{label}</span>
          ))}
        </div>
      </div>
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <Field label={t('payments.create.debt')}>
            <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
              <option value="">{t('payments.create.selectDebt')}</option>
              {(debts ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.reference} — {d.taxpayerName} ({fmtMGA(d.balance)} {t('payments.create.balanceLeft')})</option>
              ))}
            </Select>
            {(!debts || debts.length === 0) && <p className="mt-1 text-xs text-amber-600">{t('payments.create.noOpenDebt')}</p>}
          </Field>
          {selectedDebt && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.create.totalDebt')}</span><strong className="text-slate-900 dark:text-slate-100">{fmtMGA(selectedDebt.totalAmount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.create.paid')}</span><strong className="text-slate-900 dark:text-slate-100">{fmtMGA(selectedDebt.paidAmount)}</strong></div>
                <div className="flex justify-between text-brand-700 dark:text-brand-400"><span>{t('payments.create.remaining')}</span><strong>{fmtMGA(selectedDebt.balance)}</strong></div>
                <div className="border-t border-slate-200 pt-2 text-xs text-slate-400 dark:border-slate-700">{selectedDebt.taxTypeCode} · {selectedDebt.period}</div>
              </div>
            </div>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('payments.create.amount')}>
              <Input type="number" min="1" max={selectedDebt?.balance} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
              {selectedDebt && amount && amountNum > selectedDebt.balance && <p className="mt-1 text-xs text-rose-600">{t('payments.create.exceeds')}</p>}
            </Field>
            <Field label={t('payments.create.mode')}>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHOD_CODES.map((k) => (
                  <option key={k} value={k}>{methodLabel(k, t)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t('payments.create.date')}>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </Field>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('payments.create.txRef')}>
              <Input type="text" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder={t('payments.bankRefPlaceholder')} />
            </Field>
          </div>
          <Field label={t('payments.create.observations')}>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" rows={2} placeholder={t('payments.create.notesPlaceholder')} />
          </Field>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('payments.create.summary')}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.detail.debt')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{selectedDebt?.reference ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.detail.taxpayer')}</span><span className="font-medium text-slate-900 dark:text-slate-100">{selectedDebt?.taxpayerName ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.amount')}</span><strong className="text-slate-900 dark:text-slate-100">{amountValid ? fmtMGA(amountNum) : '—'}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.detail.mode')}</span><strong className="text-slate-900 dark:text-slate-100">{methodLabel(method, t)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('payments.detail.payDate')}</span><strong className="text-slate-900 dark:text-slate-100">{fmtDate(paymentDate)}</strong></div>
              {selectedDebt && (
                <div className="flex justify-between border-t border-slate-200 pt-2 text-brand-700 dark:border-slate-700 dark:text-brand-400">
                  <span>{t('payments.create.balanceAfter')}</span><strong>{fmtMGA(Math.max(0, selectedDebt.balance - amountNum))}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <div>
          {step > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronRight className="h-4 w-4 rotate-180" /> {t('payments.create.previous')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{t('payments.create.cancel')}</Button>
          {step < 2 ? (
            <Button type="button" size="sm" disabled={!canNext} onClick={() => setStep(step + 1)} className="bg-brand-600 text-white">
              {t('payments.create.next')} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="sm" loading={create.isPending} disabled={!debtId || !amountValid} className="bg-brand-600 text-white shadow-lg shadow-violet-500/25">
              <Check className="h-4 w-4" /> {t('payments.create.save')}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
