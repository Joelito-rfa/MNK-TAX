import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { BadgeCheck, SearchX } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA } from '../lib/format'
import type { ReceiptVerification } from '../types'
import { Card, Spinner } from '../components/ui'

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

export default function ReceiptVerify() {
  const { reference } = useParams<{ reference: string }>()
  const [input, setInput] = useState(reference ?? '')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', input],
    queryFn: () => apiGet<ReceiptVerification>(`/receipts/verify/${input}`),
    enabled: !!input,
    retry: false,
  })

  return (
    <div className="flex min-h-full animate-page-in flex-col items-center bg-slate-100 px-4 py-12">
      <div className="flex items-center gap-2.5">
        <img src="/logo.webp" alt="MNK-TAX" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-lg font-bold text-slate-900">MNK-TAX</span>
      </div>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Vérification d’une quittance</h1>
      <p className="mt-1 max-w-md text-center text-sm text-slate-500">
        Page publique : saisissez la référence portée sur le QR code de la quittance.
      </p>

      <form
        className="mt-6 flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          window.location.hash = `/verify/receipt/${input}`
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex : REC-20260814090705-7210"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
      </form>

      <div className="mt-6 w-full max-w-md">
        {isLoading && <Spinner />}
        {isError && !data && (
          <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-4">
            <SearchX className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-700">Quittance introuvable</p>
              <p className="text-sm text-red-500">Vérifiez la référence saisie.</p>
            </div>
          </Card>
        )}
        {data && (
          <Card className="p-6">
            <div className={`flex items-center gap-2 ${data.valid ? 'text-emerald-700' : 'text-red-700'}`}>
              <BadgeCheck className="h-6 w-6" />
              <p className="text-lg font-semibold">{data.valid ? 'Quittance valide' : 'Quittance invalide'}</p>
            </div>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <Row k="Numéro" v={data.receiptNumber} />
              <Row k="Référence" v={data.reference} mono />
              <Row k="Contribuable" v={data.taxpayerName} />
              <Row k="NIF" v={data.nif} mono />
              <Row k="Impôt" v={data.taxTypeCode} />
              <Row k="Période" v={data.period} />
              <Row k="Montant" v={fmtMGA(data.amount)} />
              <Row k="Mode de paiement" v={methodLabels[data.method] ?? data.method} />
              <Row k="Émise le" v={fmtDate(data.issuedAt)} />
              <Row k="Statut" v={data.status} />
            </dl>
            <p className="mt-4 text-xs text-slate-400">
              Prototype académique — données fictives. Cette vérification ne constitue pas une attestation officielle.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-slate-500">{k}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  )
}
