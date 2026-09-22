import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Banknote, Download, FilePlus2, FileQuestion, FileSearch, Pause, Pencil, PhoneCall, Play, Plus, Send, Square, Trash2, Upload, Wallet, Wand2 } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost, apiPut, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtBytes, fmtDate, fmtDateTime, fmtMGA } from '../lib/format'
import type {
  Assessment,
  AuditLog,
  CollectionAction,
  Complaint,
  Declaration,
  DocumentItem,
  Message,
  MessagePriority,
  Obligation,
  Page,
  Periodicity,
  Payment,
  Receipt,
  Refund,
  TaxControl,
  TaxDebt,
  TaxpayerDetail,
  TaxType,
  User,
} from '../types'
import { CreateComplaintModal, ComplaintDetailModal, complaintContextLabels } from './Complaints'
import { CreateRefundModal, RefundDetailModal, refundReasonLabels } from './Refunds'
import { CreateControlModal, ControlDetailModal, controlTypeLabels } from './Controls'
import { UserAvatar } from '../components/UserAvatar'
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
  Textarea,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { useObligations } from '../features/obligation/api/queries'
import { useAssessments } from '../features/assessment/api/queries'
import {
  useCreateObligation,
  useDeleteObligation,
  useGenerateObligations,
  useUpdateObligation,
} from '../features/obligation/api/mutations'

type Tab = 'overview' | 'obligations' | 'declarations' | 'assessments' | 'debts' | 'payments' | 'receipts' | 'documents' | 'collection' | 'controls' | 'complaints' | 'refunds' | 'messages' | 'history'

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Fiche' },
  { id: 'obligations', label: 'Obligations' },
  { id: 'declarations', label: 'Déclarations' },
  { id: 'assessments', label: 'Impositions' },
  { id: 'debts', label: 'Créances' },
  { id: 'payments', label: 'Paiements' },
  { id: 'receipts', label: 'Quittances' },
  { id: 'collection', label: 'Recouvrement' },
  { id: 'controls', label: 'Contrôles' },
  { id: 'complaints', label: 'Réclamations' },
  { id: 'refunds', label: 'Remboursements' },
  { id: 'messages', label: 'Messages' },
  { id: 'history', label: 'Historique' },
  { id: 'documents', label: 'Documents' },
]

const auditActionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  ENABLE: 'Activation',
  DISABLE: 'Désactivation',
  PASSWORD_CHANGE: 'Changement mot de passe',
  LOGIN: 'Connexion',
  LOGIN_FAILED: 'Échec connexion',
  VALIDATE: 'Validation',
  REJECT: 'Rejet',
  PAYMENT: 'Paiement',
  MARK_OVERDUE: 'Marquage retard',
}

const statusActions: { status: string; label: string; icon: React.ReactNode; tone: 'primary' | 'danger' | 'secondary' }[] = [
  { status: 'SUSPENDED', label: 'Suspendre', icon: <Pause className="h-3.5 w-3.5" />, tone: 'danger' },
  { status: 'ACTIVE', label: 'Réactiver', icon: <Play className="h-3.5 w-3.5" />, tone: 'primary' },
  { status: 'CLOSED', label: 'Clôturer', icon: <Square className="h-3.5 w-3.5" />, tone: 'danger' },
]

export default function TaxpayerDetail() {
  const { id } = useParams<{ id: string }>()
  const taxpayerId = Number(id)
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)

  const { data: taxpayer, isLoading } = useQuery({
    queryKey: ['taxpayer', taxpayerId],
    queryFn: () => apiGet<TaxpayerDetail>(`/taxpayers/${taxpayerId}`),
  })

  if (isLoading) return <Spinner />
  if (!taxpayer) return <EmptyState title="Contribuable introuvable" />

  const visibleTabs = tabs.filter((t) => {
    if (t.id === 'history') return can('AUDIT_READ')
    if (t.id === 'collection') return can('COLLECTION_READ')
    if (t.id === 'controls') return can('CONTROL_READ')
    if (t.id === 'complaints') return can('COMPLAINT_READ')
    if (t.id === 'refunds') return can('REFUND_READ')
    if (t.id === 'messages') return can('MESSAGE_READ')
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/taxpayers" className="text-sm text-brand-700 hover:underline">
            ← Contribuables
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {taxpayer.name}
            <span className="font-mono text-sm font-normal text-slate-400 dark:text-slate-500">{taxpayer.nif}</span>
            <StatusBadge value={taxpayer.status} />
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {taxpayer.type === 'COMPANY' ? 'Entreprise' : 'Particulier'} — {taxpayer.taxCenterName || 'Centre non assigné'} — {taxpayer.taxRegimeName || 'Régime non défini'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          {statusActions
            .filter((a) => a.status !== taxpayer.status)
            .filter((a) => {
              if (taxpayer.status === 'CLOSED') return a.status === 'ACTIVE'
              if (taxpayer.status === 'SUSPENDED') return a.status === 'ACTIVE' || a.status === 'CLOSED'
              if (taxpayer.status === 'ACTIVE') return a.status === 'SUSPENDED' || a.status === 'CLOSED'
              return false
            })
            .map((a) => (
              <StatusChangeButton key={a.status} taxpayerId={taxpayerId} targetStatus={a.status} label={a.label} icon={a.icon} tone={a.tone} />
            ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-card ring-1 ring-slate-200/60">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-page-in">
        {tab === 'overview' && (
          <div className="space-y-4">
            <QuickActions taxpayerId={taxpayerId} taxpayer={taxpayer} />
            <Overview taxpayer={taxpayer} />
          </div>
        )}
        {tab === 'obligations' && <ObligationsTab taxpayerId={taxpayerId} taxRegimeId={taxpayer.taxRegimeId} />}
        {tab === 'declarations' && <DeclarationsTab taxpayerId={taxpayerId} closed={taxpayer.status === 'CLOSED'} />}
        {tab === 'assessments' && <AssessmentsTab taxpayerId={taxpayerId} />}
        {tab === 'debts' && <DebtsTab taxpayerId={taxpayerId} />}
        {tab === 'payments' && <PaymentsTab taxpayerId={taxpayerId} />}
        {tab === 'receipts' && <ReceiptsTab taxpayerId={taxpayerId} />}
        {tab === 'collection' && <CollectionTab taxpayerId={taxpayerId} />}
        {tab === 'controls' && <ControlsTab taxpayerId={taxpayerId} />}
        {tab === 'complaints' && <ComplaintsTab taxpayerId={taxpayerId} />}
        {tab === 'refunds' && <RefundsTab taxpayerId={taxpayerId} />}
        {tab === 'messages' && <MessagesTab taxpayerId={taxpayerId} />}
        {tab === 'history' && <HistoryTab taxpayerId={taxpayerId} />}
        {tab === 'documents' && <DocumentsTab taxpayerId={taxpayerId} />}
      </div>

      {editOpen && <EditModal taxpayer={taxpayer} onClose={() => setEditOpen(false)} />}
    </div>
  )
}

/* ──────────────────────── Status Change Button ──────────────────────── */

function StatusChangeButton({ taxpayerId, targetStatus, label, icon, tone }: {
  taxpayerId: number; targetStatus: string; label: string; icon: React.ReactNode; tone: 'primary' | 'danger' | 'secondary'
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const mutate = useMutation({
    mutationFn: () => apiPatch(`/taxpayers/${taxpayerId}/status?status=${targetStatus}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayer', taxpayerId] })
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      setConfirmOpen(false)
      toast.success(`Statut changé : ${targetStatus === 'ACTIVE' ? 'Actif' : targetStatus === 'SUSPENDED' ? 'Suspendu' : 'Clôturé'}`)
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <>
      <Button variant={tone} size="sm" onClick={() => setConfirmOpen(true)}>
        {icon} {label}
      </Button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={`${label} ce contribuable ?`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Le statut du contribuable sera changé en{' '}
          <strong>{targetStatus === 'ACTIVE' ? 'Actif' : targetStatus === 'SUSPENDED' ? 'Suspendu' : 'Clôturé'}</strong>.
          {targetStatus === 'CLOSED' && ' Cette action est irréversible.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button variant={tone} onClick={() => mutate.mutate()} disabled={mutate.isPending}>
            Confirmer
          </Button>
        </div>
      </Modal>
    </>
  )
}

/* ──────────────────────── Quick Actions ──────────────────────── */

function QuickActions({ taxpayerId, taxpayer }: { taxpayerId: number; taxpayer: TaxpayerDetail }) {
  const { can } = useAuth()
  const [modal, setModal] = useState<'declaration' | 'payment' | 'collection' | 'message' | null>(null)
  const closed = taxpayer.status === 'CLOSED'

  const actions = [
    {
      key: 'declaration' as const,
      label: 'Nouvelle déclaration',
      desc: 'Déposer une déclaration fiscale',
      icon: <FilePlus2 className="h-4 w-4" />,
      perm: 'DECLARATION_WRITE',
      disabled: closed,
      title: closed ? 'Contribuable clôturé : création de déclaration impossible' : undefined,
    },
    {
      key: 'payment' as const,
      label: 'Enregistrer un paiement',
      desc: 'Allouer un paiement sur une créance',
      icon: <Wallet className="h-4 w-4" />,
      perm: 'PAYMENT_WRITE',
    },
    {
      key: 'collection' as const,
      label: 'Action de recouvrement',
      desc: 'Relance, mise en demeure, visite…',
      icon: <PhoneCall className="h-4 w-4" />,
      perm: 'COLLECTION_WRITE',
    },
    {
      key: 'message' as const,
      label: 'Envoyer un message',
      desc: 'Écrire à un agent au sujet du dossier',
      icon: <Send className="h-4 w-4" />,
      perm: 'MESSAGE_WRITE',
    },
  ]

  const visible = actions.filter((a) => can(a.perm))

  return (
    <Card>
      <CardHeader title="Actions rapides" subtitle="Créer un dossier, enregistrer un paiement, relancer ou contacter" />
      {visible.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-400 dark:text-slate-500">Aucune action disponible avec vos permissions.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((a) => (
            <button
              key={a.key}
              disabled={a.disabled}
              title={a.title}
              onClick={() => setModal(a.key)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-brand-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {a.icon}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{a.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{a.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {modal === 'declaration' && <CreateDeclarationModal taxpayerId={taxpayerId} onClose={() => setModal(null)} />}
      {modal === 'payment' && <CreatePaymentModal taxpayerId={taxpayerId} onClose={() => setModal(null)} />}
      {modal === 'collection' && <CreateCollectionActionModal taxpayerId={taxpayerId} onClose={() => setModal(null)} />}
      {modal === 'message' && <SendMessageModal taxpayerId={taxpayerId} taxpayerName={taxpayer.name} onClose={() => setModal(null)} />}
    </Card>
  )
}

function CreateCollectionActionModal({ taxpayerId, onClose }: { taxpayerId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: debts } = useQuery({
    queryKey: ['quick-debts', taxpayerId],
    queryFn: () => apiGet<Page<TaxDebt>>(`/debts?taxpayerId=${taxpayerId}&size=100`),
  })
  const [form, setForm] = useState({
    debtId: '',
    type: 'REMINDER',
    description: '',
    actionDate: new Date().toISOString().slice(0, 10),
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  })
  const create = useMutation({
    mutationFn: () =>
      apiPost('/collection/actions', {
        debtId: Number(form.debtId),
        type: form.type,
        description: form.description.trim(),
        actionDate: form.actionDate,
        outcome: form.outcome.trim() || undefined,
        nextAction: form.nextAction.trim() || null,
        nextActionDate: form.nextActionDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-actions'] })
      queryClient.invalidateQueries({ queryKey: ['collection'] })
      onClose()
      toast.success('Action de recouvrement enregistrée')
    },
  })
  const openDebts = (debts?.content ?? []).filter((d) => d.balance > 0)
  return (
    <Modal open onClose={onClose} title="Nouvelle action de recouvrement" size="full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <Field label="Créance">
          <Select value={form.debtId} onChange={(e) => setForm({ ...form, debtId: e.target.value })}>
            <option value="">— Sélectionner une créance —</option>
            {openDebts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.reference} — {d.taxTypeCode} {d.period} — solde {fmtMGA(d.balance)}
              </option>
            ))}
          </Select>
        </Field>
        {openDebts.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Aucune créance avec un solde restant : le recouvrement ne s'applique qu'aux créances impayées.
          </p>
        )}
        {(() => {
          const sel = openDebts.find((d) => String(d.id) === form.debtId)
          if (!sel) return null
          return (
            <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Détail de la créance sélectionnée
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Référence</span>
                  <span className="font-mono font-medium text-brand-700 dark:text-brand-400">{sel.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">NIF</span>
                  <span className="font-mono">{sel.nif}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Contribuable</span>
                  <span className="max-w-[180px] truncate font-medium">{sel.taxpayerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Impôt / Période</span>
                  <span>{sel.taxTypeCode} — {sel.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Montant total</span>
                  <span className="font-medium">{fmtMGA(sel.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Payé</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtMGA(sel.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Reste à payer</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{fmtMGA(sel.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Échéance</span>
                  <span>{fmtDate(sel.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Statut</span>
                  <StatusBadge value={sel.status} />
                </div>
              </div>
            </div>
          )
        })()}
        <Field label="Type d'action">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(collectionTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            placeholder="ex : Relance téléphonique effectuée, contribuable s'engage à payer sous 8 jours"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Date d'action">
          <Input type="date" value={form.actionDate} onChange={(e) => setForm({ ...form, actionDate: e.target.value })} />
        </Field>
        <Field label="Résultat (facultatif)">
          <Input
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            placeholder="ex : Promesse de paiement"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Prochaine action (facultatif)">
            <Input placeholder="ex : Relancer par SMS" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
          </Field>
          <Field label="Date de la prochaine action">
            <Input type="date" value={form.nextActionDate} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending || !form.debtId || !form.description.trim()}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function SendMessageModal({ taxpayerId, taxpayerName, onClose }: {
  taxpayerId: number; taxpayerName: string; onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: users } = useQuery({
    queryKey: ['quick-users'],
    queryFn: () => apiGet<Page<User>>('/users?page=0&size=100'),
  })
  const [form, setForm] = useState({
    recipientUsername: '',
    subject: '',
    content: '',
    priority: 'NORMAL' as MessagePriority,
  })
  const send = useMutation({
    mutationFn: () =>
      apiPost('/messages', {
        recipientUsername: form.recipientUsername.trim(),
        subject: form.subject.trim() || null,
        content: form.content.trim(),
        taxpayerId,
        priority: form.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayer-messages'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      onClose()
      toast.success('Message envoyé')
    },
  })
  return (
    <Modal open onClose={onClose} title={`Envoyer un message — ${taxpayerName}`} size="full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send.mutate()
        }}
        className="space-y-4"
      >
        {send.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(send.error)}
          </div>
        )}
        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
          Le dossier {taxpayerName} sera automatiquement rattaché au message.
        </p>
        <Field label="Destinataire *">
          <Input
            list="quick-recipient-usernames"
            placeholder="ex : agent.tax"
            value={form.recipientUsername}
            onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
            autoComplete="off"
          />
          <datalist id="quick-recipient-usernames">
            {(users?.content ?? []).map((u) => (
              <option key={u.id} value={u.username}>{u.firstName} {u.lastName} ({u.username})</option>
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sujet (facultatif)">
            <Input placeholder="ex : Demande de justificatif" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </Field>
          <Field label="Priorité">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as MessagePriority })}>
              <option value="NORMAL">Normale</option>
              <option value="IMPORTANT">Importante</option>
              <option value="URGENT">Urgente</option>
            </Select>
          </Field>
        </div>
        <Field label="Message *">
          <Textarea
            rows={4}
            placeholder="Rédigez votre message..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={send.isPending || !form.recipientUsername.trim() || !form.content.trim()}>
            <Send className="h-4 w-4" /> Envoyer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Edit Modal ──────────────────────── */

function EditModal({ taxpayer, onClose }: { taxpayer: TaxpayerDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [type, setType] = useState(taxpayer.type)
  const [name, setName] = useState(taxpayer.name)
  const [businessName, setBusinessName] = useState(taxpayer.businessName || '')
  const [firstName, setFirstName] = useState(taxpayer.firstName || '')
  const [lastName, setLastName] = useState(taxpayer.lastName || '')
  const [phone, setPhone] = useState(taxpayer.phone || '')
  const [email, setEmail] = useState(taxpayer.email || '')
  const [address, setAddress] = useState(taxpayer.address || '')
  const [birthDate, setBirthDate] = useState(taxpayer.birthDate ?? '')
  const [legalRepresentative, setLegalRepresentative] = useState(taxpayer.legalRepresentative ?? '')
  const [registrationDate, setRegistrationDate] = useState(taxpayer.registrationDate ?? '')
  const [taxCenterId, setTaxCenterId] = useState(taxpayer.taxCenterId?.toString() || '')
  const [taxRegimeId, setTaxRegimeId] = useState(taxpayer.taxRegimeId?.toString() || '')

  const { data: taxCenters } = useQuery({
    queryKey: ['tax-centers'],
    queryFn: () => apiGet<{ id: number; code: string; name: string }[]>('/tax-centers'),
  })

  const { data: taxRegimes } = useQuery({
    queryKey: ['tax-regimes'],
    queryFn: () => apiGet<{ id: number; code: string; name: string }[]>('/tax-regimes'),
  })

  const mutate = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        type,
        name,
        businessName: businessName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        birthDate: birthDate || null,
        legalRepresentative: legalRepresentative || null,
        registrationDate: registrationDate || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        taxCenterId: taxCenterId ? Number(taxCenterId) : null,
        taxRegimeId: taxRegimeId ? Number(taxRegimeId) : null,
        status: taxpayer.status,
      }
      return apiPut(`/taxpayers/${taxpayer.id}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayer', taxpayer.id] })
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      onClose()
      toast.success('Contribuable mis à jour')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title={`Modifier — ${taxpayer.name}`} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as 'COMPANY' | 'PERSON')}>
              <option value="COMPANY">Entreprise</option>
              <option value="PERSON">Particulier</option>
            </Select>
          </Field>
          <Field label="NIF (non modifiable)">
            <Input value={taxpayer.nif} disabled className="bg-slate-50 dark:bg-slate-800/50" />
          </Field>
        </div>
        <Field label="Raison sociale / Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {type === 'COMPANY' && (
          <Field label="Nom commercial">
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </Field>
        )}
        {type === 'PERSON' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Prénom">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="Nom de famille">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>
            <Field label="Date de naissance">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
          </>
        )}
        {type === 'COMPANY' && (
          <Field label="Représentant légal">
            <Input value={legalRepresentative} onChange={(e) => setLegalRepresentative(e.target.value)} />
          </Field>
        )}
        <Field label="Date d'immatriculation">
          <Input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Centre fiscal">
            <Select value={taxCenterId} onChange={(e) => setTaxCenterId(e.target.value)}>
              <option value="">— Non assigné —</option>
              {taxCenters?.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Régime fiscal">
            <Select value={taxRegimeId} onChange={(e) => setTaxRegimeId(e.target.value)}>
              <option value="">— Non assigné —</option>
              {taxRegimes?.map((r) => (
                <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutate.mutate()} disabled={mutate.isPending || !name.trim()}>
            {mutate.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ──────────────────────── Overview Tab ──────────────────────── */

function Overview({ taxpayer }: { taxpayer: TaxpayerDetail }) {
  const infoRows: [string, string][] = [
    ['NIF', taxpayer.nif],
    ['Type', taxpayer.type === 'COMPANY' ? 'Entreprise' : 'Particulier'],
    ['Raison sociale', taxpayer.name],
    ...(taxpayer.type === 'COMPANY'
      ? [['Nom commercial', taxpayer.businessName || '—'] as [string, string],
         ['Représentant légal', taxpayer.legalRepresentative || '—'] as [string, string]]
      : [['Nom et prénom', taxpayer.name] as [string, string],
         ['Date de naissance', taxpayer.birthDate ? fmtDate(taxpayer.birthDate) : '—'] as [string, string]]),
    ['Date d\'immatriculation', taxpayer.registrationDate ? fmtDate(taxpayer.registrationDate) : '—'],
    ['Contact', [taxpayer.phone, taxpayer.email].filter(Boolean).join(' · ') || '—'],
    ['Adresse', taxpayer.address || '—'],
    ['Centre fiscal', taxpayer.taxCenterName || '—'],
    ['Régime', taxpayer.taxRegimeName || '—'],
    ['Obligations', String(taxpayer.obligationsCount)],
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Informations générales" />
        <dl className="divide-y divide-slate-100 dark:divide-slate-700/50 px-5">
          {infoRows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-sm text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Activités" subtitle={`${taxpayer.activities.length} activité(s)`} />
          <div className="px-5 py-4">
            {taxpayer.activities.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Aucune activité enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {taxpayer.activities.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-700">{a.code}</span>
                      {a.primary && <Badge tone="blue">Principale</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{a.label}</p>
                    {a.description && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{a.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Adresses" subtitle={`${taxpayer.addresses.length} adresse(s)`} />
          <div className="px-5 py-4">
            {taxpayer.addresses.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Aucune adresse enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {taxpayer.addresses.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 dark:border-slate-700/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.type || 'Principale'}</span>
                      {a.country && <Badge tone="slate">{a.country}</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {a.addressLine1}
                      {a.addressLine2 && <>, {a.addressLine2}</>}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {[a.city, a.region, a.postalCode].filter(Boolean).join(', ') || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ──────────────────────── Obligations Tab ──────────────────────── */

const periodicityLabels: Record<string, string> = {
  MONTHLY: 'Mensuelle',
  QUARTERLY: 'Trimestrielle',
  ANNUAL: 'Annuelle',
  BIENNIAL: 'Bisannuelle',
}

function ObligationsTab({ taxpayerId, taxRegimeId }: { taxpayerId: number; taxRegimeId: number | null }) {
  const { can } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Obligation | null>(null)
  const { data, isLoading } = useObligations(taxpayerId)
  const generate = useGenerateObligations()
  const remove = useDeleteObligation()
  const canWrite = can('TAXPAYER_WRITE')
  const obligations = data ?? []

  return (
    <Card>
      <CardHeader
        title="Obligations fiscales"
        subtitle={`${obligations.length} obligation(s) — échéances de déclaration et de paiement suivies`}
        actions={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              {taxRegimeId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generate.mutate({ taxpayerId, regimeId: taxRegimeId })}
                  disabled={generate.isPending}
                >
                  <Wand2 className="h-4 w-4" />
                  {generate.isPending ? 'Génération…' : 'Générer depuis le régime'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4" /> Nouvelle obligation
              </Button>
            </div>
          )
        }
      />
      {isLoading ? (
        <Spinner />
      ) : obligations.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            title="Aucune obligation fiscale"
            subtitle={
              taxRegimeId
                ? 'Générez-les automatiquement à partir du régime fiscal du contribuable.'
                : "Le contribuable n'a pas de régime fiscal : créez les obligations manuellement."
            }
          />
          {taxRegimeId && canWrite && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => generate.mutate({ taxpayerId, regimeId: taxRegimeId })} disabled={generate.isPending}>
                <Wand2 className="h-4 w-4" /> Générer automatiquement
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Impôt</Th>
              <Th>Périodicité</Th>
              <Th>Début</Th>
              <Th>Fin</Th>
              <Th>Échéance déclaration</Th>
              <Th>Échéance paiement</Th>
              <Th>Déclaration</Th>
              <Th>Paiement</Th>
              <Th>Statut</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {obligations.map((o) => (
              <tr key={o.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">
                  <Link to={`/declarations?q=${encodeURIComponent(o.taxTypeCode)}`} className="hover:text-brand-700 hover:underline">
                    {o.taxTypeName}
                  </Link>
                  <span className="block text-xs text-slate-400">{o.taxTypeCode}</span>
                </Td>
                <Td>{periodicityLabels[o.periodicity] ?? o.periodicity}</Td>
                <Td>{fmtDate(o.startDate)}</Td>
                <Td>{o.endDate ? fmtDate(o.endDate) : '—'}</Td>
                <Td>{o.declarationDeadline ? fmtDate(o.declarationDeadline) : '—'}</Td>
                <Td>{o.paymentDeadline ? fmtDate(o.paymentDeadline) : '—'}</Td>
                <Td>
                  <StatusBadge value={o.declarationStatus} />
                </Td>
                <Td>
                  <StatusBadge value={o.paymentStatus} />
                </Td>
                <Td>
                  <StatusBadge value={o.status} />
                </Td>
                <Td>
                  {canWrite && (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(o)
                          setFormOpen(true)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Supprimer cette obligation fiscale ?')) remove.mutate(o.id)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {formOpen && (
        <ObligationFormModal
          taxpayerId={taxpayerId}
          taxRegimeId={taxRegimeId}
          obligation={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
    </Card>
  )
}

function ObligationFormModal({
  taxpayerId,
  taxRegimeId,
  obligation,
  onClose,
}: {
  taxpayerId: number
  taxRegimeId: number | null
  obligation: Obligation | null
  onClose: () => void
}) {
  const isUpdate = obligation !== null
  const [taxTypeCode, setTaxTypeCode] = useState(obligation?.taxTypeCode ?? '')
  const [periodicity, setPeriodicity] = useState<string>(obligation?.periodicity ?? 'ANNUAL')
  const [startDate, setStartDate] = useState(obligation?.startDate ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(obligation?.endDate ?? '')
  const [declarationDeadline, setDeclarationDeadline] = useState(obligation?.declarationDeadline ?? '')
  const [paymentDeadline, setPaymentDeadline] = useState(obligation?.paymentDeadline ?? '')
  const [expectedAmount, setExpectedAmount] = useState(
    obligation?.expectedAmount != null ? String(obligation.expectedAmount) : '',
  )
  const [status, setStatus] = useState<string>(obligation?.status ?? 'ACTIVE')

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })
  const create = useCreateObligation()
  const update = useUpdateObligation()
  const pending = create.isPending || update.isPending

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    const common = {
      periodicity: periodicity as Periodicity,
      endDate: endDate || null,
      declarationDeadline: declarationDeadline || null,
      paymentDeadline: paymentDeadline || null,
      expectedAmount: expectedAmount ? Number(expectedAmount) : null,
    }
    if (isUpdate) {
      update.mutate({ id: obligation.id, body: { ...common, status } }, { onSuccess: onClose })
      return
    }
    create.mutate(
      {
        taxpayerId,
        taxTypeCode,
        startDate,
        taxRegimeId,
        ...common,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open onClose={onClose} title={isUpdate ? 'Modifier l obligation fiscale' : 'Nouvelle obligation fiscale'} size="full">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type d impôt">
            {isUpdate ? (
              <Input value={obligation.taxTypeName} disabled />
            ) : (
              <Select value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {taxTypes?.map((tt) => (
                  <option key={tt.code} value={tt.code}>
                    {tt.code} — {tt.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Périodicité">
            <Select value={periodicity} onChange={(e) => setPeriodicity(e.target.value)}>
              {Object.entries(periodicityLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {!isUpdate && (
            <Field label="Date de début">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </Field>
          )}
          <Field label="Date de fin (optionnel)">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label="Échéance déclaration">
            <Input type="date" value={declarationDeadline} onChange={(e) => setDeclarationDeadline(e.target.value)} />
          </Field>
          <Field label="Échéance paiement">
            <Input type="date" value={paymentDeadline} onChange={(e) => setPaymentDeadline(e.target.value)} />
          </Field>
          <Field label="Montant attendu (MGA)">
            <Input
              type="number"
              min="0"
              step="1"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(e.target.value)}
              placeholder="Optionnel"
            />
          </Field>
          {isUpdate && (
            <Field label="Statut">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspendue</option>
                <option value="CLOSED">Clôturée</option>
              </Select>
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending || (!isUpdate && !taxTypeCode)}>
            {pending ? 'Enregistrement…' : isUpdate ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Impositions Tab ──────────────────────── */

function AssessmentsTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useAssessments(`taxpayerId=${taxpayerId}&size=50`)
  if (isLoading) return <Spinner />
  const assessments: Assessment[] = data?.content ?? []
  return (
    <Card>
      <CardHeader
        title="Impositions"
        subtitle={`${assessments.length} imposition(s) calculée(s) automatiquement`}
        actions={
          <Link to={`/assessments?taxpayerId=${taxpayerId}`} className="text-sm font-medium text-brand-700 hover:underline">
            Voir tout
          </Link>
        }
      />
      {assessments.length === 0 ? (
        <EmptyState
          title="Aucune imposition"
          subtitle="Les impositions sont générées automatiquement après validation des déclarations."
        />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Référence</Th>
              <Th>Impôt</Th>
              <Th>Période</Th>
              <Th>Base imposable</Th>
              <Th>Impôt net</Th>
              <Th>Calculé le</Th>
              <Th>Déclaration</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {assessments.map((a) => (
              <tr key={a.id}>
                <Td className="font-mono font-medium text-brand-700 dark:text-brand-300">{a.reference}</Td>
                <Td>
                  <Badge tone="violet">{a.taxTypeCode}</Badge>
                </Td>
                <Td>{a.period}</Td>
                <Td className="tabular-nums">{fmtMGA(a.taxBase)}</Td>
                <Td className="font-medium tabular-nums">{fmtMGA(a.netTax)}</Td>
                <Td>{fmtDate(a.calculationDate)}</Td>
                <Td>
                  <Link
                    to={`/declarations/${a.declarationId}`}
                    className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {a.declarationReference}
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

/* ──────────────────────── Declarations Tab ──────────────────────── */

function DeclarationsTab({ taxpayerId, closed = false }: { taxpayerId: number; closed?: boolean }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['declarations', taxpayerId],
    queryFn: () => apiGet<Page<Declaration>>(`/declarations?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader
        title="Déclarations"
        actions={
          <Button size="sm" disabled={closed} title={closed ? 'Contribuable clôturé : création de déclaration impossible' : undefined} onClick={() => setOpen(true)}>
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
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Référence</Th>
              <Th>Impôt</Th>
              <Th>Période</Th>
              <Th>Assiette</Th>
              <Th>Montant déclaré</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
      {open && <CreateDeclarationModal taxpayerId={taxpayerId} onClose={() => setOpen(false)} />}
    </Card>
  )
}

function CreateDeclarationModal({ taxpayerId, onClose }: {
  taxpayerId: number; onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ taxTypeCode: 'TVA', period: '', taxBase: '' })

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types-ref'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const create = useMutation({
    mutationFn: (payload: { taxpayerId: number; taxTypeCode: string; period: string; taxBase: number }) =>
      apiPost('/declarations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declarations'] })
      queryClient.invalidateQueries({ queryKey: ['taxpayer'] })
      onClose()
      toast.success('Déclaration créée')
    },
  })
  return (
    <Modal open onClose={onClose} title="Nouvelle déclaration" size="full">
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
            {taxTypes?.map((tt) => (
              <option key={tt.code} value={tt.code}>{tt.code} — {tt.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Période (AAAA-MM)">
          <Input placeholder="2026-08" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        </Field>
        <Field label="Assiette (MGA)">
          <Input type="number" min="0" placeholder="1000000" value={form.taxBase} onChange={(e) => setForm({ ...form, taxBase: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Debts Tab ──────────────────────── */

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
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
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

/* ──────────────────────── Payments Tab ──────────────────────── */

function PaymentsTab({ taxpayerId }: { taxpayerId: number }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['payments', taxpayerId],
    queryFn: () => apiGet<Page<Payment>>(`/payments?taxpayerId=${taxpayerId}&size=50`),
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
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
      {open && <CreatePaymentModal taxpayerId={taxpayerId} onClose={() => setOpen(false)} />}
    </Card>
  )
}

function CreatePaymentModal({ taxpayerId, onClose }: { taxpayerId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [debtId, setDebtId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const { data: debts } = useQuery({
    queryKey: ['quick-debts', taxpayerId],
    queryFn: () => apiGet<Page<TaxDebt>>(`/debts?taxpayerId=${taxpayerId}&size=100`),
  })
  const openDebts = (debts?.content ?? []).filter((d) => d.balance > 0)
  const create = useMutation({
    mutationFn: (payload: { debtId: number; amount: number; paymentDate: string; method: string }) =>
      apiPost('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['quick-debts'] })
      onClose()
      toast.success('Paiement enregistré')
    },
  })
  return (
    <Modal open onClose={onClose} title="Enregistrer un paiement" size="full">
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
        <Field label="Créance">
          <Select value={debtId} onChange={(e) => setDebtId(e.target.value)}>
            <option value="">— Sélectionner une créance —</option>
            {openDebts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.reference} — {d.taxTypeCode} {d.period} — solde {fmtMGA(d.balance)}
              </option>
            ))}
          </Select>
        </Field>
        {openDebts.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Aucune créance avec un solde restant pour ce contribuable.
          </p>
        )}
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending || !debtId || !amount}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────── Receipts Tab ──────────────────────── */

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
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
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

/* ──────────────────────── Collection Tab ──────────────────────── */

const collectionTypeLabels: Record<string, string> = {
  PHONE_CONTACT: 'Relance téléphonique',
  SMS: 'Relance SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  PAYMENT_RECORD: 'Enregistrement paiement',
  NOTE: 'Note',
  FOLLOW_UP: 'Prochaine action',
  REMINDER: 'Relance',
  VISIT: 'Visite',
  SEIZURE: 'Saisie',
}

function CollectionTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['collection-actions', taxpayerId],
    queryFn: () => apiGet<Page<CollectionAction>>(`/collection/actions?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader title="Recouvrement" subtitle="Actions de recouvrement liées à ce contribuable" />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucune action de recouvrement" subtitle="Aucune relance ou mise en demeure enregistrée pour ce contribuable." />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Créance</Th>
              <Th>Agent</Th>
              <Th>Date</Th>
              <Th>Résultat</Th>
              <Th>Prochaine action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.content.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{collectionTypeLabels[a.type] ?? a.type}</Td>
                <Td className="max-w-56 truncate">{a.description}</Td>
                <Td className="font-mono text-xs">{a.debtReference}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <UserAvatar userId={a.responsibleUserId} name={a.responsibleName ?? ''} />
                    <span className="text-sm">{a.responsibleName ?? '—'}</span>
                  </span>
                </Td>
                <Td>{fmtDate(a.actionDate)}</Td>
                <Td className="max-w-40 truncate text-xs">{a.outcome || '—'}</Td>
                <Td className="max-w-40 truncate text-xs">{a.nextAction || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

/* ──────────────────────── Controls Tab ──────────────────────── */

function ControlsTab({ taxpayerId }: { taxpayerId: number }) {
  const { can } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayer-controls', taxpayerId],
    queryFn: () => apiGet<Page<TaxControl>>(`/tax-controls?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader
        title="Contrôles fiscaux"
        subtitle="Contrôles et vérifications de ce contribuable"
        actions={
          can('CONTROL_WRITE') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <FileSearch className="h-4 w-4" /> Nouveau contrôle
            </Button>
          )
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucun contrôle fiscal" subtitle="Aucun contrôle enregistré pour ce contribuable." />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Référence</Th>
              <Th>Type</Th>
              <Th>Période contrôlée</Th>
              <Th>Agent</Th>
              <Th>Statut</Th>
              <Th>Redressement</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.content.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                <Td className="font-mono font-medium text-brand-700">{c.reference}</Td>
                <Td>
                  <Badge tone="slate">{controlTypeLabels[c.controlType] ?? c.controlType}</Badge>
                </Td>
                <Td>{fmtDate(c.periodStart)} → {fmtDate(c.periodEnd)}</Td>
                <Td>{c.agentName ?? '—'}</Td>
                <Td>
                  <StatusBadge value={c.status} />
                </Td>
                <Td className={c.redressement ? 'font-medium text-amber-700' : ''}>
                  {c.redressement != null ? fmtMGA(c.redressement) : '—'}
                </Td>
                <Td>
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(c.id)}>
                    Voir <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {createOpen && (
        <CreateControlModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-controls'] })
          }}
        />
      )}
      {detailId != null && (
        <ControlDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-controls'] })
          }}
        />
      )}
    </Card>
  )
}

/* ──────────────────────── Complaints Tab ──────────────────────── */

function ComplaintsTab({ taxpayerId }: { taxpayerId: number }) {
  const { can } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayer-complaints', taxpayerId],
    queryFn: () => apiGet<Page<Complaint>>(`/complaints?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader
        title="Réclamations"
        subtitle="Réclamations liées à ce contribuable"
        actions={
          can('COMPLAINT_WRITE') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <FileQuestion className="h-4 w-4" /> Nouvelle réclamation
            </Button>
          )
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucune réclamation" subtitle="Aucune réclamation enregistrée pour ce contribuable." />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Référence</Th>
              <Th>Objet</Th>
              <Th>Contexte</Th>
              <Th>Statut</Th>
              <Th>Créée le</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.content.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                <Td className="font-mono font-medium text-brand-700">{c.reference}</Td>
                <Td className="max-w-52 truncate">{c.subject}</Td>
                <Td>
                  <Badge tone="slate">{complaintContextLabels[c.contextType] ?? c.contextType}</Badge>
                </Td>
                <Td>
                  <StatusBadge value={c.status} />
                </Td>
                <Td>{fmtDate(c.createdAt)}</Td>
                <Td>
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(c.id)}>
                    Voir <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {createOpen && (
        <CreateComplaintModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-complaints'] })
          }}
        />
      )}
      {detailId != null && (
        <ComplaintDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-complaints'] })
          }}
        />
      )}
    </Card>
  )
}

/* ──────────────────────── Refunds Tab ──────────────────────── */

function RefundsTab({ taxpayerId }: { taxpayerId: number }) {
  const { can } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayer-refunds', taxpayerId],
    queryFn: () => apiGet<Page<Refund>>(`/refunds?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader
        title="Remboursements"
        subtitle="Demandes de remboursement de ce contribuable"
        actions={
          can('REFUND_WRITE') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Banknote className="h-4 w-4" /> Demande de remboursement
            </Button>
          )
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucun remboursement" subtitle="Aucune demande de remboursement pour ce contribuable." />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Référence</Th>
              <Th>Motif</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
              <Th>Demandé le</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.content.map((r) => (
              <tr key={r.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                <Td className="font-mono font-medium text-brand-700">{r.reference}</Td>
                <Td>
                  <Badge tone="slate">{refundReasonLabels[r.reason] ?? r.reason}</Badge>
                </Td>
                <Td className="font-medium">{fmtMGA(r.amount)}</Td>
                <Td>
                  <StatusBadge value={r.status} />
                </Td>
                <Td>{fmtDate(r.createdAt)}</Td>
                <Td>
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>
                    Voir <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {createOpen && (
        <CreateRefundModal
          onClose={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-refunds'] })
          }}
        />
      )}
      {detailId != null && (
        <RefundDetailModal
          id={detailId}
          onClose={() => {
            setDetailId(null)
            queryClient.invalidateQueries({ queryKey: ['taxpayer-refunds'] })
          }}
        />
      )}
    </Card>
  )
}

/* ──────────────────────── Messages Tab ─────────────────────────── */

const msgContextLabels: Record<string, string> = {
  DECLARATION: 'Déclaration',
  DEBT: 'Dette',
  PAYMENT: 'Paiement',
  RECOVERY: 'Recouvrement',
  AUDIT: 'Contrôle fiscal',
  COMPLAINT: 'Réclamation',
  REFUND: 'Remboursement',
  DEADLINE: 'Échéance',
  GENERAL: 'Général',
}

function MessagesTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayer-messages', taxpayerId],
    queryFn: () => apiGet<Page<Message>>(`/messages?taxpayerId=${taxpayerId}&size=50`),
  })
  return (
    <Card>
      <CardHeader
        title="Messages"
        subtitle="Conversations liées à ce contribuable"
        actions={
          <Link to="/messages" className="text-sm font-medium text-brand-600 hover:underline">
            Ouvrir la messagerie
          </Link>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data || data.content.length === 0 ? (
        <EmptyState title="Aucun message" subtitle="Aucune conversation n'est liée à ce contribuable pour le moment." />
      ) : (
        <Table>
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Expéditeur</Th>
              <Th>Sujet</Th>
              <Th>Dossier</Th>
              <Th>Priorité</Th>
              <Th>Date</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.content.map((m) => (
              <tr key={m.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                <Td className="font-medium">
                  <span className="flex items-center gap-2">
                    <UserAvatar userId={m.senderId} name={m.senderName} />
                    <span>{m.senderName}</span>
                  </span>
                </Td>
                <Td className="max-w-52 truncate">{m.subject || '—'}</Td>
                <Td>
                  {m.contextType !== 'GENERAL' ? (
                    <Badge tone="slate">{msgContextLabels[m.contextType] ?? m.contextType}</Badge>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </Td>
                <Td>
                  {m.priority === 'URGENT' ? (
                    <Badge tone="red">Urgent</Badge>
                  ) : m.priority === 'IMPORTANT' ? (
                    <Badge tone="amber">Important</Badge>
                  ) : (
                    <Badge tone="slate">Normal</Badge>
                  )}
                </Td>
                <Td>{fmtDateTime(m.createdAt)}</Td>
                <Td>{m.read ? 'Lu' : <span className="inline-flex h-2 w-2 rounded-full bg-brand-600" />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

/* ──────────────────────── History Tab (audit) ──────────────────── */

function HistoryTab({ taxpayerId }: { taxpayerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['taxpayer-history', taxpayerId],
    queryFn: () => apiGet<Page<AuditLog>>(`/audit-logs?entityType=TAXPAYER&entityId=${taxpayerId}&size=50`),
  })
  if (isLoading) return <Spinner />
  return (
    <Card>
      <CardHeader title="Historique" subtitle="Timeline des événements enregistrés pour ce contribuable (audit)" />
      {!data || data.content.length === 0 ? (
        <EmptyState title="Aucun événement enregistré" />
      ) : (
        <div className="px-5 py-4">
          <ol className="relative space-y-5 border-l-2 border-slate-100 dark:border-slate-700/50 pl-5">
            {data.content.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500 shadow" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {auditActionLabels[e.action] ?? e.action}
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      {e.entityType} #{e.entityId}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{fmtDateTime(e.createdAt)}</p>
                </div>
                {e.username && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">par {e.username}</p>}
                {e.newValue && (
                  <p className="mt-1 truncate rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {e.newValue}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}

/* ──────────────────────── Documents Tab ──────────────────────── */

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
      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
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
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-700"
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
          <thead className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <Th>Titre</Th>
              <Th>Type</Th>
              <Th>Taille</Th>
              <Th>Déposé par</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.map((d) => (
              <tr key={d.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{d.title}</Td>
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
