import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FilePlus2, Upload, Wallet } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost, api } from '../lib/api'
import { fmtBytes, fmtDate, fmtMGA } from '../lib/format'
import type {
  Declaration,
  DocumentItem,
  Obligation,
  Page,
  Payment,
  Receipt,
  TaxDebt,
  TaxpayerDetail,
} from '../types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

type Tab = 'overview' | 'obligations' | 'declarations' | 'debts' | 'payments' | 'receipts' | 'documents'

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Fiche' },
  { id: 'obligations', label: 'Obligations' },
  { id: 'declarations', label: 'Déclarations' },
  { id: 'debts', label: 'Créances' },
  { id: 'payments', label: 'Paiements' },
  { id: 'receipts', label: 'Quittances' },
  { id: 'documents', label: 'Documents' },
]

export default function TaxpayerDetail() {
  const { id } = useParams<{ id: string }>()
  const taxpayerId = Number(id)
  const [tab, setTab] = useState<Tab>('overview')

  const { data: taxpayer, isLoading } = useQuery({
    queryKey: ['taxpayer', taxpayerId],
    queryFn: () => apiGet<TaxpayerDetail>(`/taxpayers/${taxpayerId}`),
  })

  if (isLoading) return <Spinner />
  if (!taxpayer) return <EmptyState title="Contribuable introuvable" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/taxpayers" className="text-sm text-brand-700 hover:underline">
            ← Contribuables
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            {taxpayer.name}
            <span className="font-mono text-sm font-normal text-slate-400">{taxpayer.nif}</span>
            <StatusBadge value={taxpayer.status} />
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-card ring-1 ring-slate-200/60">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-page-in">
        {tab === 'overview' && <Overview taxpayer={taxpayer} />}
        {tab === 'obligations' && <ObligationsTab taxpayerId={taxpayerId} />}
        {tab === 'declarations' && <DeclarationsTab taxpayerId={taxpayerId} />}
        {tab === 'debts' && <DebtsTab taxpayerId={taxpayerId} />}
        {tab === 'payments' && <PaymentsTab taxpayerId={taxpayerId} />}
        {tab === 'receipts' && <ReceiptsTab taxpayerId={taxpayerId} />}
        {tab === 'documents' && <DocumentsTab taxpayerId={taxpayerId} />}
      </div>
    </div>
  )
}

function Overview({ taxpayer }: { taxpayer: TaxpayerDetail }) {
  const rows: [string, string][] = [
    ['NIF', taxpayer.nif],
    ['Type', taxpayer.type === 'COMPANY' ? 'Entreprise' : 'Particulier'],
    ['Nom commercial', taxpayer.businessName || '—'],
    ['Contact', [taxpayer.phone, taxpayer.email].filter(Boolean).join(' · ') || '—'],
    ['Adresse', taxpayer.address || '—'],
    ['Centre fiscal', taxpayer.taxCenterName || '—'],
    ['Régime', taxpayer.taxRegimeName || '—'],
    ['Nombre d’obligations', String(taxpayer.obligationsCount)],
  ]
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Informations générales" />
        <dl className="divide-y divide-slate-100 px-5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd className="text-right text-sm font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Activités" subtitle={`${taxpayer.activities.length} activité(s) enregistrée(s)`} />
        <div className="px-5 py-4">
          {taxpayer.activities.length === 0 ? (
            <EmptyState title="Aucune activité" />
          ) : (
            <ul className="space-y-2">
              {taxpayer.activities.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand-700">{a.code}</span>
                    {a.primary && <Badge tone="blue">Principale</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">{a.label}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}

function ObligationsTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['obligations', taxpayerId],
    queryFn: () => apiGet<Obligation[]>(`/obligations?taxpayerId=${taxpayerId}`),
  })
  if (isLoading) return <Spinner />
  return (
    <Card>
      {!data || data.length === 0 ? (
        <EmptyState title="Aucune obligation fiscale" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>Impôt</Th>
              <Th>Périodicité</Th>
              <Th>Début</Th>
              <Th>Fin</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((o) => (
              <tr key={o.id}>
                <Td className="font-medium text-slate-900">{o.taxTypeName}</Td>
                <Td>{o.periodicity}</Td>
                <Td>{fmtDate(o.startDate)}</Td>
                <Td>{o.endDate ? fmtDate(o.endDate) : '—'}</Td>
                <Td>
                  <StatusBadge value={o.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

function DeclarationsTab({ taxpayerId }: { taxpayerId: number }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['declarations', taxpayerId],
    queryFn: () => apiGet<Page<Declaration>>(`/declarations?taxpayerId=${taxpayerId}&size=50`),
  })
  const create = useMutation({
    mutationFn: (payload: { taxpayerId: number; taxTypeCode: string; period: string; taxBase: number }) =>
      apiPost('/declarations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declarations'] })
      setOpen(false)
      toast.success('Déclaration créée')
    },
  })
  const [form, setForm] = useState({ taxTypeCode: 'TVA', period: '', taxBase: '' })

  return (
    <Card>
      <CardHeader
        title="Déclarations"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <FilePlus2 className="h-4 w-4" /> Nouvelle déclaration
          </Button>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucune déclaration" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>Référence</Th>
              <Th>Impôt</Th>
              <Th>Période</Th>
              <Th>Assiette</Th>
              <Th>Montant déclaré</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.content.map((d) => (
              <tr key={d.id}>
                <Td className="font-mono text-brand-700">{d.reference}</Td>
                <Td>{d.taxTypeCode}</Td>
                <Td>{d.period}</Td>
                <Td>{fmtMGA(d.taxBase)}</Td>
                <Td>{fmtMGA(d.declaredAmount)}</Td>
                <Td>
                  <StatusBadge value={d.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle déclaration">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ taxpayerId, taxTypeCode: form.taxTypeCode, period: form.period, taxBase: Number(form.taxBase) })
          }}
          className="space-y-4"
        >
          {create.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(create.error)}
            </div>
          )}
          <Field label="Impôt">
            <Select value={form.taxTypeCode} onChange={(e) => setForm({ ...form, taxTypeCode: e.target.value })}>
              <option value="TVA">TVA</option>
              <option value="IRSA">IRSA</option>
              <option value="IS">IS</option>
            </Select>
          </Field>
          <Field label="Période (AAAA-MM)">
            <Input placeholder="2026-08" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
          </Field>
          <Field label="Assiette (MGA)">
            <Input type="number" min="0" placeholder="1000000" value={form.taxBase} onChange={(e) => setForm({ ...form, taxBase: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function DebtsTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['debts', taxpayerId],
    queryFn: () => apiGet<Page<TaxDebt>>(`/debts?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucune créance" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>Référence</Th>
              <Th>Impôt</Th>
              <Th>Période</Th>
              <Th>Principal</Th>
              <Th>Pénalités</Th>
              <Th>Intérêts</Th>
              <Th>Total</Th>
              <Th>Solde</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.content.map((d) => (
              <tr key={d.id}>
                <Td className="font-mono text-brand-700">{d.reference}</Td>
                <Td>{d.taxTypeCode}</Td>
                <Td>{d.period}</Td>
                <Td>{fmtMGA(d.principalAmount)}</Td>
                <Td>{fmtMGA(d.penaltyAmount)}</Td>
                <Td>{fmtMGA(d.interestAmount)}</Td>
                <Td className="font-medium">{fmtMGA(d.totalAmount)}</Td>
                <Td className="font-medium">{fmtMGA(d.balance)}</Td>
                <Td>
                  <StatusBadge value={d.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

function PaymentsTab({ taxpayerId }: { taxpayerId: number }) {
  const [open, setOpen] = useState(false)
  const [debtId, setDebtId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['payments', taxpayerId],
    queryFn: () => apiGet<Page<Payment>>(`/payments?taxpayerId=${taxpayerId}&size=50`),
  })
  const create = useMutation({
    mutationFn: (payload: { debtId: number; amount: number; paymentDate: string; method: string }) =>
      apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setOpen(false)
      toast.success('Paiement enregistré')
    },
  })
  return (
    <Card>
      <CardHeader
        title="Paiements"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Wallet className="h-4 w-4" /> Enregistrer un paiement
          </Button>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucun paiement" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>Référence</Th>
              <Th>Date</Th>
              <Th>Montant</Th>
              <Th>Mode</Th>
              <Th>Alloué</Th>
              <Th>Statut</Th>
              <Th>Quittance</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.content.map((p) => (
              <tr key={p.id}>
                <Td className="font-mono text-brand-700">{p.reference}</Td>
                <Td>{fmtDate(p.paymentDate)}</Td>
                <Td className="font-medium">{fmtMGA(p.amount)}</Td>
                <Td>{p.method}</Td>
                <Td>{fmtMGA(p.allocatedAmount)}</Td>
                <Td>
                  <StatusBadge value={p.status} />
                </Td>
                <Td>{p.receiptReference ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Enregistrer un paiement">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ debtId: Number(debtId), amount: Number(amount), paymentDate: new Date().toISOString().slice(0, 10), method })
          }}
          className="space-y-4"
        >
          {create.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(create.error)}
            </div>
          )}
          <Field label="Créance (ID)">
            <Input type="number" placeholder="ID de la créance" value={debtId} onChange={(e) => setDebtId(e.target.value)} />
          </Field>
          <Field label="Montant (MGA)">
            <Input type="number" min="1" placeholder="100000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Mode de paiement">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Espèces</option>
              <option value="BANK_TRANSFER">Virement</option>
              <option value="CHECK">Chèque</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function ReceiptsTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['receipts', taxpayerId],
    queryFn: () => apiGet<Page<Receipt>>(`/receipts?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucune quittance" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>N°</Th>
              <Th>Référence</Th>
              <Th>Impôt</Th>
              <Th>Période</Th>
              <Th>Montant</Th>
              <Th>Mode</Th>
              <Th>Émise le</Th>
              <Th>PDF</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.content.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono">{r.receiptNumber}</Td>
                <Td className="font-mono text-brand-700">{r.reference}</Td>
                <Td>{r.taxTypeCode}</Td>
                <Td>{r.period}</Td>
                <Td className="font-medium">{fmtMGA(r.amount)}</Td>
                <Td>{r.method}</Td>
                <Td>{fmtDate(r.issuedAt)}</Td>
                <Td>
                  <a
                    href={`/api/receipts/${r.id}/pdf`}
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

function DocumentsTab({ taxpayerId }: { taxpayerId: number }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['documents', taxpayerId],
    queryFn: () => apiGet<DocumentItem[]>(`/documents?taxpayerId=${taxpayerId}`),
  })

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post(`/documents?taxpayerId=${taxpayerId}&title=${encodeURIComponent(title || file.name)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setFile(null)
      setTitle('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Documents" subtitle="Pièces jointes du dossier" />
      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-40 flex-1">
          <Field label="Titre">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex : Registre de commerce" />
          </Field>
        </div>
        <div className="min-w-52 flex-1">
          <Field label="Fichier">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-700"
            />
          </Field>
        </div>
        <Button type="submit" disabled={!file || uploading}>
          <Upload className="h-4 w-4" /> Téléverser
        </Button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Aucun document" />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <Th>Titre</Th>
              <Th>Type</Th>
              <Th>Taille</Th>
              <Th>Déposé par</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((d) => (
              <tr key={d.id}>
                <Td className="font-medium text-slate-900">{d.title}</Td>
                <Td>{d.documentType ?? '—'}</Td>
                <Td>{fmtBytes(d.size)}</Td>
                <Td>{d.uploadedBy ?? '—'}</Td>
                <Td>{fmtDate(d.createdAt)}</Td>
                <Td>
                  <a
                    href={`/api/documents/${d.id}/content`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
