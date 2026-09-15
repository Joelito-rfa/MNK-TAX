import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ClipboardList,
  FileWarning,
  History,
  Inbox,
  Search,
  X,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import { useI18n } from '../lib/i18n'
import type { CollectionAction, CollectionHistoryEvent, CollectionNotice, Page } from '../types'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Pagination,
  Select,
  Spinner,
} from '../components/ui'
import { UserAvatar } from '../components/UserAvatar'

const ACTION_LABELS: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique',
  SMS: 'Relance SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  COMMANDMENT: 'Commandement de payer',
  ATD: 'Avis à tiers détenteur',
  SEIZURE: 'Saisie',
  PAYMENT_PLAN: 'Plan de paiement',
  DISPUTE: 'Litige déclaré',
  DISPUTE_DECISION: 'Décision sur litige',
  SUSPENSION_REQUEST: 'Demande de suspension',
  PAYMENT_RECORD: 'Enregistrement paiement',
  NOTE: 'Note',
  FOLLOW_UP: 'Prochaine action',
  REMINDER: 'Relance',
  VISIT: 'Visite',
  ADMINISTRATIVE_ACTION: 'Action administrative',
  OTHER: 'Autre',
}

const ACTION_ICONS: Record<string, string> = {
  PHONE_CONTACT: '📞',
  SMS: '✉️',
  NOTIFICATION: '🔔',
  NOTICE: '📨',
  COMMANDMENT: '📋',
  ATD: '🏛️',
  SEIZURE: '⚠️',
  PAYMENT_PLAN: '📅',
  DISPUTE: '⚖️',
  DISPUTE_DECISION: '⚖️',
  SUSPENSION_REQUEST: '⏸️',
  PAYMENT_RECORD: '💳',
  NOTE: '📝',
  FOLLOW_UP: '📅',
  REMINDER: '📧',
  VISIT: '🏢',
  ADMINISTRATIVE_ACTION: '⚙️',
  OTHER: '📌',
}

const EVENT_TYPE_LABELS_BASE: Record<string, string> = {
  CREATED: 'Création',
  STATUS_CHANGE: 'Changement de statut',
  PENALTY_APPLIED: 'Pénalité appliquée',
  INTEREST_APPLIED: 'Intérêts appliqués',
  ADJUSTMENT: 'Ajustement',
  REMINDER_CREATED: 'Relance créée',
  DISPUTE_CREATED: 'Litige déclaré',
  DISPUTE_RESOLVED: 'Décision sur litige',
  DISPUTE_REOPENED: 'Litige levé',
  PAYMENT_PLAN_CREATED: 'Échéancier créé',
  PAYMENT_PLAN_COMPLETED: 'Échéancier soldé',
  PAYMENT_PLAN_REACTIVATED: 'Échéancier réactivé',
  PAYMENT_PLAN_CANCELLED: 'Échéancier annulé',
  INSTALLMENT_OVERDUE: 'Tranche en retard',
  INSTALLMENT_PAID: 'Tranche réglée',
  INSTALLMENT_PARTIALLY_PAID: 'Tranche partiellement réglée',
  IN_COLLECTION: 'Passage en recouvrement',
  SUSPENDED: 'Suspension',
  RESUMED: 'Réactivation',
  CLOSED: 'Clôture',
  CANCELLED: 'Annulation',
  PRIORITY_CHANGED: 'Priorité modifiée',
  OBSERVATIONS_UPDATED: 'Observations mises à jour',
  PAYMENT: 'Paiement',
}

const eventTone = (type: string): string => {
  if (['PAYMENT', 'PAYMENT_RECORD', 'PAYMENT_ALLOCATION'].includes(type)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (['FORMAL_NOTICE_CREATED', 'IN_COLLECTION', 'NOTICE'].includes(type)) return 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400'
  if (['DISPUTE_CREATED', 'DISPUTE_RESOLVED', 'DISPUTE_REOPENED'].includes(type)) return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
  if (['STATUS_CHANGE', 'SUSPENDED', 'CANCELLED', 'CLOSED'].includes(type)) return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
  if (['CREATED', 'REMINDER_CREATED'].includes(type)) return 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
}

function useSection<T>(key: string, url: string, enabled: boolean, deps: unknown[]): { data?: Page<T>; isLoading: boolean; isError: boolean } {
  const result = useQuery({
    queryKey: [key, url, ...deps],
    queryFn: () => apiGet<Page<T>>(url),
    enabled,
    retry: 1,
  })
  return { data: result.data, isLoading: result.isLoading, isError: result.isError }
}

function EventChip({ label }: { label: string }) {
  const tone = eventTone(label)
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {EVENT_TYPE_LABELS[label] ?? label}
    </span>
  )
}

export default function CollectionHistory() {
  const { t } = useI18n()

  const EVENT_TYPE_LABELS: Record<string, string> = {
    ...EVENT_TYPE_LABELS_BASE,
    FORMAL_NOTICE_CREATED: t('collection.noticeIssued'),
    PAYMENT_RECORD: t('collection.paymentSaved'),
  }

  const [q, setQ] = useState('')
  const [eventType, setEventType] = useState('')
  const [actionType, setActionType] = useState('')

  const [eventPage, setEventPage] = useState(0)
  const [actionPage, setActionPage] = useState(0)
  const [noticePage, setNoticePage] = useState(0)
  const [size, setSize] = useState(20)

  const eventUrl = `/collection/events?page=${eventPage}&size=${size}${q ? `&q=${encodeURIComponent(q)}` : ''}${eventType ? `&eventType=${eventType}` : ''}`
  const actionUrl = `/collection/actions?page=${actionPage}&size=${size}${q ? `&q=${encodeURIComponent(q)}` : ''}${actionType ? `&type=${actionType}` : ''}`
  const noticeUrl = `/collection/notices?page=${noticePage}&size=${size}${q ? `&q=${encodeURIComponent(q)}` : ''}`

  // Note : /collection/actions ne filtre pas encore par q (recherche par type),
  // on passe donc un libellé clair dans l'interface.
  const events = useSection<CollectionHistoryEvent>('history-events', eventUrl, true, [eventUrl])
  const actions = useSection<CollectionAction>('history-actions', actionUrl, true, [actionUrl])
  const notices = useSection<CollectionNotice>('history-notices', noticeUrl, true, [noticeUrl])

  const hasFilters = !!(q || eventType || actionType)

  function resetFilters() {
    setQ('')
    setEventType('')
    setActionType('')
    setEventPage(0)
    setActionPage(0)
    setNoticePage(0)
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Historique de recouvrement
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Journal horodaté et non modifiable des événements, actions et courriers du module
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* ── Filtres communs ── */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setEventPage(0); setActionPage(0); setNoticePage(0) }}
              placeholder="Rechercher par référence de créance, NIF ou contribuable…"
              aria-label="Rechercher dans l'historique"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-700"
            />
          </div>
          <div className="w-56">
            <Field label="Type d'événement">
              <Select value={eventType} onChange={(e) => { setEventType(e.target.value); setEventPage(0) }}>
                <option value="">Tous les événements</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-52">
            <Field label="Type d'action">
              <Select value={actionType} onChange={(e) => { setActionType(e.target.value); setActionPage(0) }}>
                <option value="">Toutes les actions</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {/* ── Événements des créances (append-only) ── */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" /> Événements des créances
            </span>
          }
          subtitle="Traces horodatées, jamais modifiables ni supprimables"
        />
        {events.isError ? (
          <div className="p-6 text-sm text-rose-600 dark:text-rose-400">
            Impossible de charger l'historique. Réessayez.
          </div>
        ) : !events.data ? (
          <Spinner />
        ) : events.data.content.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="Aucun événement" subtitle="Aucune trace ne correspond à la recherche." />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {events.data.content.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventChip label={ev.eventType} />
                      <span className="font-mono text-xs text-brand-700 dark:text-brand-400">{ev.debtReference}</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{ev.taxpayerName}</span>
                      <span className="font-mono text-xs text-slate-400">{ev.nif}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ev.description}</p>
                    {(ev.oldValue || ev.newValue) && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {ev.oldValue && <>Ancien : <span className="font-mono text-slate-400">{ev.oldValue}</span> · </>}
                        {ev.newValue && <>Nouveau : <span className="font-mono text-slate-400">{ev.newValue}</span></>}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{fmtDateTime(ev.eventDate)}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{ev.performedBy ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={events.data.number}
              totalPages={events.data.totalPages}
              totalElements={events.data.totalElements}
              pageSize={size}
              onPageSizeChange={(n) => { setSize(n); setEventPage(0); setActionPage(0); setNoticePage(0) }}
              onChange={setEventPage}
            />
          </>
        )}
      </Card>

      {/* ── Actions de recouvrement ── */}
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><History className="h-4 w-4 text-sky-500" /> Actions de recouvrement</span>}
          subtitle="Appels, relances, plans de paiement, mesures enregistrées par les agents"
        />
        {actions.isError ? (
          <div className="p-6 text-sm text-rose-600 dark:text-rose-400">Impossible de charger les actions. Réessayez.</div>
        ) : !actions.data ? (
          <Spinner />
        ) : actions.data.content.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="Aucune action" subtitle="Aucune action ne correspond à la recherche." />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {actions.data.content.map((a) => (
                <div key={a.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                    <span className="text-sm">{ACTION_ICONS[a.type] ?? '•'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        {ACTION_LABELS[a.type] ?? a.type}
                      </span>
                      <span className="font-mono text-xs text-brand-700 dark:text-brand-400">{a.debtReference}</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{a.taxpayerName}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                    {a.outcome && <p className="text-xs text-emerald-600 dark:text-emerald-400">Résultat : {a.outcome}</p>}
                    {a.nextAction && (
                      <p className="text-xs text-sky-600 dark:text-sky-400">
                        Prochaine action : {a.nextAction}{a.nextActionDate && ` — ${fmtDate(a.nextActionDate)}`}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <UserAvatar userId={a.responsibleUserId} name={a.responsibleName ?? ''} className="shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{a.responsibleName ?? '—'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{fmtDateTime(a.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={actions.data.number}
              totalPages={actions.data.totalPages}
              totalElements={actions.data.totalElements}
              pageSize={size}
              onPageSizeChange={(n) => { setSize(n); setEventPage(0); setActionPage(0); setNoticePage(0) }}
              onChange={setActionPage}
            />
          </>
        )}
      </Card>

      {/* ── Mises en demeure / courriers ── */}
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-orange-500" /> Mises en demeure et courriers émis</span>}
          subtitle="Actes formels et courriers de relance émis sur les créances"
        />
        {notices.isError ? (
          <div className="p-6 text-sm text-rose-600 dark:text-rose-400">Impossible de charger les mises en demeure. Réessayez.</div>
        ) : !notices.data ? (
          <Spinner />
        ) : notices.data.content.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="Aucune mise en demeure" subtitle="Aucun courrier émis." />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {notices.data.content.map((n) => (
                <div key={n.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                    <FileWarning className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{n.noticeNumber}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        {n.noticeType}
                      </span>
                      <span className="font-mono text-xs text-brand-700 dark:text-brand-400">{n.debtReference}</span>
                    </div>
                    {n.content && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.content}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{fmtDate(n.noticeDate)}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{n.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={notices.data.number}
              totalPages={notices.data.totalPages}
              totalElements={notices.data.totalElements}
              pageSize={size}
              onPageSizeChange={(n) => { setSize(n); setEventPage(0); setActionPage(0); setNoticePage(0) }}
              onChange={setNoticePage}
            />
          </>
        )}
      </Card>

      {/* Aide contextuelle */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-5 py-4 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-400">
        Le journal de recouvrement est <strong>append-only</strong> : chaque événement est horodaté et lié à son auteur.
        Aucun utilisateur ne peut modifier ou supprimer une trace existante.
      </div>
    </div>
  )
}
