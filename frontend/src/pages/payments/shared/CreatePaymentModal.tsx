import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../../../lib/api'
import { fmtDate, fmtMGA } from '../../../lib/format'
import type { Page, TaxDebt } from '../../../types'
import { Button, Field, Input, Modal, Select } from '../../../components/ui'
import { useToast } from '../../../components/Toast'

export const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
}

const STEPS = ['Créance', 'Montant & mode', 'Récapitulatif']

export function CreatePaymentModal({ onClose }: { onClose: () => void }) {
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
      debtId: number; amount: number; paymentDate: string; method: string;
      transactionReference?: string; observations?: string;
    }) => apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
      toast.success('Paiement enregistré')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const selectedDebt = debts?.find((d) => d.id === Number(debtId))
  const amountNum = Number(amount)
  const amountValid = !!amount && amountNum > 0 && (!selectedDebt || amountNum <= selectedDebt.balance)
  const canNext =
    step === 0 ? !!selectedDebt : step === 1 ? amountValid : true

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouveau paiement"
      subtitle={`Étape ${step + 1}/3 — ${STEPS[step]}`}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (step < 2) return
          create.mutate({
            debtId: Number(debtId), amount: amountNum, paymentDate, method,
            transactionReference: transactionRef || undefined,
            observations: observations || undefined,
          })
        }}
        className="space-y-4"
        noValidate
      >
        {create.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            {apiErrorMessage(create.error)}
          </div>
        )}

        {/* Barre de progression continue */}
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 transition dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wide">
            {STEPS.map((label, i) => (
              <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Étape 1 : Créance */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Créance à régler *">
              <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
                <option value="">— Sélectionner une créance —</option>
                {(debts ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference} — {d.taxpayerName} ({fmtMGA(d.balance)} restants)
                  </option>
                ))}
              </Select>
              {(!debts || debts.length === 0) && (
                <p className="mt-1 text-xs text-amber-600">Aucune créance ouverte à régler pour le moment.</p>
              )}
            </Field>

            {selectedDebt && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Total créance :</span>
                    <strong className="text-slate-900 dark:text-slate-100">{fmtMGA(selectedDebt.totalAmount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Déjà payé :</span>
                    <strong className="text-slate-900 dark:text-slate-100">{fmtMGA(selectedDebt.paidAmount)}</strong>
                  </div>
                  <div className="flex justify-between text-brand-700 dark:text-brand-400">
                    <span>Solde restant :</span>
                    <strong>{fmtMGA(selectedDebt.balance)}</strong>
                  </div>
                  <div className="border-t border-slate-200 pt-2 text-xs text-slate-400 dark:border-slate-700">
                    {selectedDebt.taxTypeCode} · {selectedDebt.period}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Étape 2 : Montant & mode */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Montant (MGA) *">
                <Input
                  type="number"
                  min="1"
                  max={selectedDebt?.balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100000"
                />
                {selectedDebt && amount && amountNum > selectedDebt.balance && (
                  <p className="mt-1 text-xs text-rose-600">Le montant dépasse le solde restant.</p>
                )}
              </Field>
              <Field label="Mode de paiement *">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {Object.entries(methodLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Date de paiement *">
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </Field>
          </div>
        )}

        {/* Étape 3 : Récapitulatif */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Référence transaction">
                <Input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Référence bancaire / Mobile Money"
                />
              </Field>
            </div>
            <Field label="Observations">
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                rows={2}
                placeholder="Notes ou observations..."
              />
            </Field>

            {/* Résumé */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Résumé
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Créance</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{selectedDebt?.reference ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Contribuable</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{selectedDebt?.taxpayerName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Montant</span>
                  <strong className="text-slate-900 dark:text-slate-100">{amountValid ? fmtMGA(amountNum) : '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Mode</span>
                  <strong className="text-slate-900 dark:text-slate-100">{methodLabels[method] ?? method}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Date</span>
                  <strong className="text-slate-900 dark:text-slate-100">{fmtDate(paymentDate)}</strong>
                </div>
                {selectedDebt && (
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-brand-700 dark:border-slate-700 dark:text-brand-400">
                    <span>Solde après paiement :</span>
                    <strong>{fmtMGA(Math.max(0, selectedDebt.balance - amountNum))}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <div>
            {step > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronRight className="h-4 w-4 rotate-180" /> Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            {step < 2 ? (
              <Button
                type="button"
                size="sm"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="bg-brand-600 text-white"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                loading={create.isPending}
                disabled={!debtId || !amountValid}
                className="bg-brand-600 text-white shadow-lg shadow-violet-500/25"
              >
                <Check className="h-4 w-4" /> Enregistrer le paiement
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
