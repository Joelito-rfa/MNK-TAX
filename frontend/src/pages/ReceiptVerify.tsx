import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, SearchX, CalendarDays, Wallet, FileCheck } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { ReceiptVerification } from '../types'
import { Card, Spinner } from '../components/ui'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
}

const statusLabels: Record<string, string> = {
  GENERATED: 'Générée',
  ISSUED: 'Émise',
  VALID: 'Valide',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  REPLACED: 'Remplacée',
  VOID: 'Annulée',
}

export default function ReceiptVerify() {
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', input],
    queryFn: () => apiGet<ReceiptVerification>(`/receipts/verify/${input}`),
    enabled: !!input && searched,
    retry: false,
  })

  return (
    <div className="flex min-h-full animate-page-in flex-col items-center bg-slate-100 px-4 py-12 dark:bg-[#0f1117]">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <img src="/logo.webp" alt="MNK-TAX" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-lg font-bold text-slate-900">MNK-TAX</span>
      </div>

      <h1 className="mt-4 text-xl font-semibold text-slate-900">Vérification de quittance</h1>
      <p className="mt-1 max-w-md text-center text-sm text-slate-500">
        Saisissez le token de vérification inscrit sur la quittance ou scannez le QR code.
      </p>

      {/* Formulaire */}
      <form
        className="mt-6 flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearched(true)
        }}
      >
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setSearched(false) }}
          placeholder="ex : VRF-A1B2C3D4E5F6G7H8"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Vérifier
        </button>
      </form>

      {/* Résultat */}
      <div className="mt-6 w-full max-w-md">
        {isLoading && <Spinner />}

        {isError && searched && !data && (
          <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-4">
            <SearchX className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-700">Quittance introuvable</p>
              <p className="text-sm text-red-500">Le token saisi ne correspond à aucune quittance enregistrée.</p>
            </div>
          </Card>
        )}

        {data && (
          <Card className="overflow-hidden p-0">
            {/* En-tête statut */}
            <div className={`flex items-center gap-3 px-6 py-4 ${data.valid ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${data.valid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {data.valid ? <BadgeCheck className="h-6 w-6" /> : <SearchX className="h-6 w-6" />}
              </div>
              <div>
                <p className={`text-lg font-semibold ${data.valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {data.valid ? '✓ QUITTANCE VALIDE' : '⚠ QUITTANCE INVALIDE'}
                </p>
                <p className="text-sm text-slate-500">{statusLabels[data.status] ?? data.status}</p>
              </div>
            </div>

            {/* Détails */}
            <div className="px-6 py-4">
              {/* Numéro et référence */}
              <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Numéro de quittance</p>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{data.receiptNumber}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{data.reference}</p>
              </div>

              {/* Contribuable */}
              <dl className="space-y-2">
                <Row icon={<FileCheck className="h-4 w-4 text-violet-500" />} k="Contribuable" v={data.taxpayerName} />
                <Row k="NIF" v={data.nif} mono />
                <Row icon={<FileCheck className="h-4 w-4 text-blue-500" />} k="Impôt" v={data.taxTypeCode} />
                <Row k="Période" v={data.period} />
                <Row icon={<Wallet className="h-4 w-4 text-emerald-500" />} k="Montant" v={fmtMGA(data.amount)} bold />
                <Row icon={<CalendarDays className="h-4 w-4 text-amber-500" />} k="Mode de paiement" v={methodLabels[data.method] ?? data.method} />
                {data.paymentReference && <Row k="Réf. paiement" v={data.paymentReference} mono />}
                {data.centerCode && <Row k="Centre fiscal" v={data.centerCode} />}
                <Row k="Émise le" v={fmtDate(data.issuedAt)} />
              </dl>
            </div>

            {/* Pied de page */}
            <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-700/50">
              <p className="text-xs text-slate-400">
                Prototype académique MNK-TAX — Données fictives de démonstration. Cette vérification ne constitue pas une attestation officielle de la DGI.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Row({ icon, k, v, mono, bold }: { icon?: React.ReactNode; k: string; v: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {k}
      </dt>
      <dd className={`text-right text-sm ${bold ? 'font-semibold' : 'font-medium'} text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>
        {v}
      </dd>
    </div>
  )
}
