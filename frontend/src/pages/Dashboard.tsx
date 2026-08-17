import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Landmark,
  PiggyBank,
  Receipt,
  ScrollText,
  Settings,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiGet } from '../lib/api'
import { fmtDate, fmtMGA, fmtNumber, shortMonthLabel, timeAgo } from '../lib/format'
import type { DashboardSummary, Deadline, Notification, Page, Payment } from '../types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconTile,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Th,
} from '../components/ui'
import { useAuth } from '../lib/auth'

const CHART_COLORS = ['#5B4BDB', '#60A5FA', '#4ADE80', '#F5C451', '#F87171', '#8B7CFF']

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [range, setRange] = useState('12')

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard/summary'),
  })

  const { data: payments } = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: () => apiGet<Page<Payment>>('/payments?page=0&size=8'),
  })

  const { data: notifications } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => apiGet<Page<Notification>>('/notifications?page=0&size=6'),
  })

  const { data: deadlines } = useQuery({
    queryKey: ['dashboard-deadlines'],
    queryFn: () => apiGet<Deadline[]>('/deadlines/upcoming?days=90'),
  })

  if (!data) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="Impossible de charger le tableau de bord"
        subtitle="Vérifiez que le serveur est bien démarré."
      />
    )
  }

  const firstName = user?.firstName || 'Administrateur'

  const revenueSeries = (data.paymentsByMonth ?? []).map((r) => ({
    label: shortMonthLabel(r.month ?? ''),
    montant: r.amount ?? 0,
  }))

  const months = revenueSeries
  const last = months[months.length - 1]?.montant ?? 0
  const prev = months[months.length - 2]?.montant ?? 0
  const trend = last - prev

  const rangeData = revenueSeries.slice(-Number(range))
  const byTaxType = (data.paymentsByTaxType ?? []).map((r) => ({ name: r.taxType, value: r.amount ?? 0 }))
  const byTaxTypeTotal = byTaxType.reduce((s, x) => s + x.value, 0)
  const byDebtStatus = (data.debtsByStatus ?? []).map((r) => ({ name: statusName(r.status), value: r.count ?? 0 }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span>
            Bienvenue, {firstName} <span className="inline-block">👋</span>
          </span>
        }
        subtitle="Voici un aperçu de la gestion du recouvrement des impôts."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Actualiser
            </Button>
            <Link to="/payments">
              <Button>
                <Wallet className="h-4 w-4" /> Nouveau paiement
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Contribuables"
          value={fmtNumber(data.taxpayerCount)}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
          sub="au registre"
        />
        <StatCard
          label="Recettes fiscales"
          value={fmtMGA(data.totalCollected)}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="emerald"
          delta={`${trend >= 0 ? '+' : '−'}${fmtMGA(Math.abs(trend))}`}
          deltaTone={trend >= 0 ? 'up' : 'down'}
          sub="vs mois préc."
        />
        <StatCard
          label="Déclarations"
          value={fmtNumber(data.declarationCount)}
          icon={<FileText className="h-5 w-5" />}
          tone="sky"
          sub="enregistrées"
        />
        <StatCard
          label="Créances restantes"
          value={fmtMGA(data.totalOutstanding)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="amber"
          sub={`dont ${fmtMGA(data.overdueBalance)} en retard`}
        />
        <StatCard
          label="Paiements"
          value={fmtNumber(data.paymentCount)}
          icon={<Wallet className="h-5 w-5" />}
          tone="violet"
          sub={`${fmtMGA(data.currentMonthPayments)} ce mois`}
        />
        <StatCard
          label="Taux de recouvrement"
          value={`${data.collectionRate.toFixed(2)} %`}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="rose"
          delta={data.collectionRate >= 50 ? `${Math.round(data.collectionRate)} %` : undefined}
          deltaTone={data.collectionRate >= 50 ? 'up' : 'down'}
          sub="objectif atteint"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recettes fiscales"
            subtitle="Évolution mensuelle des encaissements"
            actions={
              <Tabs
                tabs={[
                  { id: '3', label: '3 mois' },
                  { id: '6', label: '6 mois' },
                  { id: '12', label: '12 mois' },
                ]}
                active={range}
                onChange={setRange}
              />
            }
          />
          <div className="h-80 px-4 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rangeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B4BDB" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#5B4BDB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  formatter={(v) => fmtMGA(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    color: '#1e293b',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                  itemStyle={{ color: '#475569' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="montant" stroke="#5B4BDB" strokeWidth={2.5} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Répartition des impôts" subtitle="Encaissements par type d'impôt" />
          <div className="px-4 py-5">
            {byTaxType.length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byTaxType} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {byTaxType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmtMGA(Number(v))}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          color: '#1e293b',
                        }}
                        itemStyle={{ color: '#475569' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2">
                  {byTaxType.map((entry, i) => {
                    const pct = byTaxTypeTotal ? ((entry.value / byTaxTypeTotal) * 100).toFixed(1) : '0'
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {entry.name}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">{fmtMGA(entry.value)}</span>
                          <span className="w-12 text-right text-xs text-slate-400">{pct} %</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Statut des créances" subtitle="Répartition par statut" />
          <div className="px-4 py-5">
            {byDebtStatus.length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byDebtStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                        {byDebtStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          color: '#1e293b',
                        }}
                        itemStyle={{ color: '#475569' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2">
                  {byDebtStatus.map((entry, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {entry.name}
                      </span>
                      <span className="font-medium text-slate-900">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Évolution du recouvrement" subtitle="Situation globale des encaissements" />
          <div className="space-y-4 px-5 py-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Recouvré</span>
                <span className="font-semibold text-slate-900">{fmtMGA(data.totalCollected)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full origin-left animate-progress rounded-full"
                  style={{
                    width: `${Math.min(100, data.collectionRate)}%`,
                    background: 'linear-gradient(to right, #5B4BDB, #4ADE80)',
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{data.collectionRate.toFixed(2)} % du total encaissé</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <MiniMetric label="Total dû" value={fmtMGA(data.totalDebts)} tone="slate" />
              <MiniMetric label="Encaissé" value={fmtMGA(data.totalCollected)} tone="emerald" />
              <MiniMetric label="Restant dû" value={fmtMGA(data.totalOutstanding)} tone="amber" />
              <MiniMetric label="En retard" value={fmtMGA(data.overdueBalance)} tone="rose" />
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="Impôts en attente" subtitle="Encours restants par impôt" actions={<Link to="/debts" className="text-xs font-medium text-brand-600 hover:underline">Tout voir</Link>} />
          <div className="space-y-1 px-3 py-3">
            {(data.overdueByTaxType ?? []).length === 0 ? (
              <EmptyState title="Aucun encours en retard" />
            ) : (
              (data.overdueByTaxType ?? []).map((r, i) => {
                const max = Math.max(1, ...(data.overdueByTaxType ?? []).map((x) => x.amount ?? 0))
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                    <IconTile tone={i % 2 ? 'amber' : 'rose'}>
                      <Landmark className="h-4 w-4" />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">{r.taxType}</span>
                        <span className="font-semibold text-slate-900">{fmtMGA(r.amount ?? 0)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full origin-left animate-progress rounded-full bg-rose-400" style={{ width: `${((r.amount ?? 0) / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Paiements récents"
            subtitle="Derniers encaissements enregistrés"
            actions={
              <Link to="/payments">
                <Button variant="secondary" size="sm">Tout voir</Button>
              </Link>
            }
          />
          {!payments || payments.content.length === 0 ? (
            <EmptyState icon={<Wallet className="h-8 w-8" />} title="Aucun paiement" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Référence</Th>
                  <Th>NIF</Th>
                  <Th>Contribuable</Th>
                  <Th>Montant</Th>
                  <Th>Date</Th>
                  <Th>Mode</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.content.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <Td className="font-mono font-medium text-brand-600">{p.reference}</Td>
                    <Td className="font-mono text-slate-400">{p.nif}</Td>
                    <Td>
                      <Link to={`/taxpayers/${p.taxpayerId}`} className="font-medium text-slate-700 hover:text-brand-600 hover:underline">
                        {p.taxpayerName}
                      </Link>
                    </Td>
                    <Td className="font-semibold text-slate-900">{fmtMGA(p.amount)}</Td>
                    <Td>{fmtDate(p.paymentDate)}</Td>
                    <Td>{methodLabels[p.method] ?? p.method}</Td>
                    <Td>
                      <StatusBadge value={p.status} />
                    </Td>
                    <Td>
                      <Link to={`/taxpayers/${p.taxpayerId}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                        Consulter <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Relances & notifications" subtitle="Derniers événements" actions={<Link to="/notifications" className="text-xs font-medium text-brand-600 hover:underline">Tout voir</Link>} />
            <div className="px-3 py-2">
              {!notifications || notifications.content.length === 0 ? (
                <EmptyState title="Aucune notification" />
              ) : (
                <ul className="space-y-1">
                  {notifications.content.map((n) => (
                    <NotificationRow key={n.id} notification={n} />
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Agenda fiscal" subtitle="Prochaines échéances" actions={<Link to="/deadlines" className="text-xs font-medium text-brand-600 hover:underline">Calendrier</Link>} />
            <div className="px-3 py-2">
              {!deadlines || deadlines.length === 0 ? (
                <EmptyState title="Aucune échéance à venir" />
              ) : (
                <ul className="space-y-1">
                  {deadlines.slice(0, 5).map((d) => {
                    const date = new Date(d.declarationDeadline + 'T00:00:00')
                    const overdue = d.declarationDeadline < new Date().toISOString().slice(0, 10)
                    return (
                      <li key={d.id} className="flex animate-fade-in items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                        <div
                          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${
                            overdue ? 'bg-rose-50 text-rose-600' : 'bg-brand-100 text-brand-600'
                          }`}
                        >
                          <span className="text-sm font-bold leading-none">{date.getDate()}</span>
                          <span className="text-[10px] font-medium uppercase">
                            {date.toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">{d.taxTypeName}</p>
                          <p className="truncate text-xs text-slate-400">Période {d.period}</p>
                        </div>
                        {overdue ? <Badge tone="red">Retard</Badge> : <ArrowDownRight className="h-4 w-4 text-slate-300" />}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function statusName(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'En attente',
    OVERDUE: 'En retard',
    IN_COLLECTION: 'Recouvrement',
    PAID: 'Payée',
    CANCELLED: 'Annulée',
  }
  return labels[status] ?? status
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'amber' | 'rose' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}

const notifMeta: Record<string, { icon: React.ReactNode; tone: 'brand' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate' }> = {
  DEADLINE: { icon: <CalendarDays className="h-4 w-4" />, tone: 'amber' },
  PAYMENT_CONFIRMED: { icon: <Wallet className="h-4 w-4" />, tone: 'emerald' },
  RECEIPT_ISSUED: { icon: <Receipt className="h-4 w-4" />, tone: 'sky' },
  DEBT_OVERDUE: { icon: <AlertTriangle className="h-4 w-4" />, tone: 'rose' },
  COLLECTION_ACTION: { icon: <ScrollText className="h-4 w-4" />, tone: 'violet' },
  SYSTEM: { icon: <Settings className="h-4 w-4" />, tone: 'slate' },
}

function NotificationRow({ notification }: { notification: Notification }) {
  const meta = notifMeta[notification.type] ?? notifMeta.SYSTEM
  return (
    <li className="flex animate-fade-in items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50">
      <IconTile tone={meta.tone} className="h-9 w-9">
        {meta.icon}
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{notification.title}</p>
        {notification.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>}
        <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
    </li>
  )
}
