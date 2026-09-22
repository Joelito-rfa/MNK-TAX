import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileWarning,
  Flag,
  Inbox,
  Mail,
  PauseCircle,
  PenLine,
  Percent,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Scale,
  ScrollText,
  SlidersHorizontal,
  TrendingDown,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import { useLocaleFormatters } from '../lib/format'
import { useI18n } from '../lib/i18n'
import type { CollectionAction, CollectionHistoryEvent, CollectionNotice, Page } from '../types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  Tabs,
  statusTone,
} from '../components/ui'
import { UserAvatar } from '../components/UserAvatar'

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet' | 'indigo' | 'rose'

const TILE_STYLES: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

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

const ACTION_TONE: Record<string, Tone> = {
  PAYMENT_RECORD: 'green',
  SEIZURE: 'red',
  DISPUTE: 'red',
  DISPUTE_DECISION: 'red',
  NOTICE: 'amber',
  COMMANDMENT: 'amber',
  ATD: 'amber',
  SUSPENSION_REQUEST: 'amber',
  ADMINISTRATIVE_ACTION: 'amber',
  PAYMENT_PLAN: 'blue',
  FOLLOW_UP: 'blue',
  REMINDER: 'blue',
  VISIT: 'violet',
  PHONE_CONTACT: 'slate',
  SMS: 'slate',
  NOTIFICATION: 'slate',
  NOTE: 'slate',
  OTHER: 'slate',
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
  ACTION_CREATED: 'Action de recouvrement',
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

const EVENT_TONE: Record<string, Tone> = {
  PAYMENT: 'green',
  PAYMENT_RECORD: 'green',
  PAYMENT_ALLOCATION: 'green',
  INSTALLMENT_PAID: 'green',
  PAYMENT_PLAN_COMPLETED: 'green',
  FORMAL_NOTICE_CREATED: 'amber',
  IN_COLLECTION: 'amber',
  NOTICE: 'amber',
  INSTALLMENT_OVERDUE: 'amber',
  DISPUTE_CREATED: 'red',
  DISPUTE_RESOLVED: 'red',
  DISPUTE_REOPENED: 'red',
  STATUS_CHANGE: 'rose',
  SUSPENDED: 'rose',
  CANCELLED: 'rose',
  CLOSED: 'rose',
  CREATED: 'blue',
  REMINDER_CREATED: 'blue',
  PAYMENT_PLAN_CREATED: 'blue',
  PAYMENT_PLAN_REACTIVATED: 'blue',
  INSTALLMENT_PARTIALLY_PAID: 'blue',
  RESUMED: 'blue',
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  CREATED: PlusCircle,
  STATUS_CHANGE: RefreshCw,
  PENALTY_APPLIED: Percent,
  INTEREST_APPLIED: Percent,
  ADJUSTMENT: SlidersHorizontal,
  REMINDER_CREATED: Mail,
  ACTION_CREATED: ClipboardList,
  DISPUTE_CREATED: Scale,
  DISPUTE_RESOLVED: Scale,
  DISPUTE_REOPENED: Scale,
  PAYMENT_PLAN_CREATED: CalendarClock,
  PAYMENT_PLAN_COMPLETED: CalendarCheck,
  PAYMENT_PLAN_REACTIVATED: RefreshCw,
  PAYMENT_PLAN_CANCELLED: XCircle,
  INSTALLMENT_OVERDUE: AlertTriangle,
  INSTALLMENT_PAID: CalendarCheck,
  INSTALLMENT_PARTIALLY_PAID: CalendarCheck,
  IN_COLLECTION: TrendingDown,
  SUSPENDED: PauseCircle,
  RESUMED: PlayCircle,
  CLOSED: XCircle,
  CANCELLED: XCircle,
  PRIORITY_CHANGED: Flag,
  OBSERVATIONS_UPDATED: PenLine,
  PAYMENT: Banknote,
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

function TabCount({ n }: { n: number | undefined }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-500/15 px-1.5 text-[10px] font-bold text-current tabular-nums">
      {n === undefined ? '…' : n.toLocaleString('fr-FR')}
    </span>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 py-1 pl-3 pr-1.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Retirer le filtre ${label}`}
        className="rounded-full p-0.5 transition hover:bg-violet-200/70 dark:hover:bg-violet-700/50"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// Étape fiscale 6 : Historique — journal append-only horodaté (events/actions/notices), traçabilité fiscale
export default function CollectionHistory() {
  const { t } = useI18n()
  const { fmtDate, fmtDateTime } = useLocaleFormatters()

  const EVENT_TYPE_LABELS: Record<string, string> = {
    ...EVENT_TYPE_LABELS_BASE,
    FORMAL_NOTICE_CREATED: t('collection.noticeIssued'),
    PAYMENT_RECORD: t('collection.paymentSaved'),
  }

  const [q, setQ] = useState('')
  const [eventType, setEventType] = useState('')
  const [actionType, setActionType] = useState('')
  const [tab, setTab] = useState('events')

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
  const tabCount = (n: number | undefined): string => (n === undefined ? '…' : n.toLocaleString('fr-FR'))

  function resetPageIndexes() {
    setEventPage(0)
    setActionPage(0)
    setNoticePage(0)
  }

  function resetFilters() {
    setQ('')
    setEventType('')
    setActionType('')
    resetPageIndexes()
  }

  return (
    <div className="fx-page space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Historique de recouvrement"
        subtitle="Journal horodaté et non modifiable des événements, actions et courriers du module"
        actions={
          hasFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4" /> Réinitialiser
            </Button>
          ) : undefined
        }
      />

      {/* ── Vue d'ensemble ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Événements"
          value={tabCount(events.data?.totalElements)}
          icon={<Activity className="h-5 w-5" />}
          tone="violet"
          sub="traces append-only"
        />
        <StatCard
          label="Actions de recouvrement"
          value={tabCount(actions.data?.totalElements)}
          icon={<ScrollText className="h-5 w-5" />}
          tone="sky"
          sub="enregistrées par les agents"
        />
        <StatCard
          label="Courriers émis"
          value={tabCount(notices.data?.totalElements)}
          icon={<Mail className="h-5 w-5" />}
          tone="amber"
          sub="mises en demeure & relances"
        />
      </div>

      {/* ── Filtres communs ── */}
      <Card className="overflow-visible">
        <FilterBar>
          <SearchInput
            value={q}
            onChange={(v) => { setQ(v); resetPageIndexes() }}
            placeholder="Rechercher par référence de créance, NIF ou contribuable…"
            className="min-w-64 flex-1"
          />
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
        </FilterBar>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
            {q && <FilterChip label={`Recherche : « ${q} »`} onClear={() => { setQ(''); resetPageIndexes() }} />}
            {eventType && <FilterChip label={EVENT_TYPE_LABELS[eventType] ?? eventType} onClear={() => { setEventType(''); setEventPage(0) }} />}
            {actionType && <FilterChip label={ACTION_LABELS[actionType] ?? actionType} onClear={() => { setActionType(''); setActionPage(0) }} />}
          </div>
        )}
      </Card>

      {/* ── Onglets ── */}
      <Tabs
        tabs={[
          { id: 'events', label: <>Événements <TabCount n={events.data?.totalElements} /></> },
          { id: 'actions', label: <>Actions <TabCount n={actions.data?.totalElements} /></> },
          { id: 'notices', label: <>Mises en demeure <TabCount n={notices.data?.totalElements} /></> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Événements des créances (append-only) ── */}
      {tab === 'events' && (
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /> Événements des créances</span>}
            subtitle="Traces horodatées, jamais modifiables ni supprimables"
          />
          {events.isError ? (
            <div className="p-6 text-sm text-rose-600 dark:text-rose-400">
              Impossible de charger l'historique. Réessayez.
            </div>
          ) : !events.data ? (
            <Spinner />
          ) : events.data.content.length === 0 ? (
            <EmptyState icon={<Inbox className="h-6 w-6" />} title="Aucun événement" subtitle="Aucune trace ne correspond à la recherche." />
          ) : (
            <>
              <div className="space-y-2.5 px-5 py-4">
                {events.data.content.map((ev) => {
                  const Icon = EVENT_ICONS[ev.eventType] ?? Activity
                  const tone = EVENT_TONE[ev.eventType] ?? 'slate'
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition hover:border-violet-200/70 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                    >
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TILE_STYLES[tone]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={tone}>{EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}</Badge>
                          <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{ev.debtReference}</span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{ev.taxpayerName}</span>
                          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{ev.nif}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ev.description}</p>
                        {(ev.oldValue || ev.newValue) && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {ev.oldValue && <>Ancien : <span className="rounded bg-slate-100 px-1 font-mono text-[11px] text-slate-500 dark:bg-slate-700 dark:text-slate-400">{ev.oldValue}</span> · </>}
                            {ev.newValue && <>Nouveau : <span className="rounded bg-slate-100 px-1 font-mono text-[11px] text-slate-500 dark:bg-slate-700 dark:text-slate-400">{ev.newValue}</span></>}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{fmtDateTime(ev.eventDate)}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{ev.performedBy ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pagination
                page={events.data.number}
                totalPages={events.data.totalPages}
                totalElements={events.data.totalElements}
                pageSize={size}
                onPageSizeChange={(n) => { setSize(n); resetPageIndexes() }}
                onChange={setEventPage}
              />
            </>
          )}
        </Card>
      )}

      {/* ── Actions de recouvrement ── */}
      {tab === 'actions' && (
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-sky-500" /> Actions de recouvrement</span>}
            subtitle="Appels, relances, plans de paiement, mesures enregistrées par les agents"
          />
          {actions.isError ? (
            <div className="p-6 text-sm text-rose-600 dark:text-rose-400">Impossible de charger les actions. Réessayez.</div>
          ) : !actions.data ? (
            <Spinner />
          ) : actions.data.content.length === 0 ? (
            <EmptyState icon={<Inbox className="h-6 w-6" />} title="Aucune action" subtitle="Aucune action ne correspond à la recherche." />
          ) : (
            <>
              <div className="space-y-2.5 px-5 py-4">
                {actions.data.content.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition hover:border-sky-200/70 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TILE_STYLES[ACTION_TONE[a.type] ?? 'slate']}`}>
                      <span className="text-sm">{ACTION_ICONS[a.type] ?? '•'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={ACTION_TONE[a.type] ?? 'slate'}>{ACTION_LABELS[a.type] ?? a.type}</Badge>
                        <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{a.debtReference}</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{a.taxpayerName}</span>
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{a.nif}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                      {a.outcome && <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Résultat : {a.outcome}</p>}
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
                onPageSizeChange={(n) => { setSize(n); resetPageIndexes() }}
                onChange={setActionPage}
              />
            </>
          )}
        </Card>
      )}

      {/* ── Mises en demeure / courriers ── */}
      {tab === 'notices' && (
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
            <EmptyState icon={<Inbox className="h-6 w-6" />} title="Aucune mise en demeure" subtitle="Aucun courrier émis." />
          ) : (
            <>
              <div className="space-y-2.5 px-5 py-4">
                {notices.data.content.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition hover:border-orange-200/70 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <FileWarning className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">{n.noticeNumber}</span>
                        {n.noticeType && <Badge tone="slate">{n.noticeType}</Badge>}
                        <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-400">{n.debtReference}</span>
                      </div>
                      {n.content && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.content}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{fmtDate(n.noticeDate)}</p>
                        <Badge tone={statusTone(n.status)}>{n.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                page={notices.data.number}
                totalPages={notices.data.totalPages}
                totalElements={notices.data.totalElements}
                pageSize={size}
                onPageSizeChange={(n) => { setSize(n); resetPageIndexes() }}
                onChange={setNoticePage}
              />
            </>
          )}
        </Card>
      )}

      {/* Aide contextuelle */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-5 py-4 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-400">
        Le journal de recouvrement est <strong>append-only</strong> : chaque événement est horodaté et lié à son auteur.
        Aucun utilisateur ne peut modifier ou supprimer une trace existante.
      </div>
    </div>
  )
}