import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Percent,
  PiggyBank,
  Receipt,
  ScrollText,
  TrendingDown,
  UserPlus,
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
import type { DashboardActivity, DashboardSummary, Deadline } from '../types'
import { Card, EmptyState, type IconTone } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'

/* ═══════════════════════════ Palette ═══════════════════════════ */
const C = {
  violet: '#5B4BDB', indigo: '#6366F1', blue: '#3B82F6', sky: '#0EA5E9',
  green: '#22C55E', emerald: '#10B981', orange: '#F59E0B', yellow: '#EAB308',
  red: '#EF4444', rose: '#F43F5E', slate: '#94A3B8', teal: '#14B8A6', pink: '#EC4899',
}
const CHART_COLORS = [C.violet, C.blue, C.green, C.orange, C.yellow, C.red, C.indigo, C.sky, C.rose, C.teal, C.pink, C.slate]

function useChartColors() {
  const { resolved } = useTheme()
  const dark = resolved === 'dark'
  return useMemo(() => ({
    grid: dark ? '#1e293b' : '#e2e8f0',
    tick: dark ? '#475569' : '#94a3b8',
    tooltip: {
      borderRadius: 12,
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      background: dark ? '#1e293b' : '#fff',
      color: dark ? '#e2e8f0' : '#1e293b',
      boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
    },
    tooltipItem: { color: dark ? '#94a3b8' : '#475569' },
    tooltipLabel: { color: dark ? '#64748b' : '#94a3b8' },
  }), [dark])
}

/* ═══════════════════════════ Période ═══════════════════════════ */
const CHART_RANGE_OPTIONS = [
  { id: '7', label: '7 jours' },
  { id: '30', label: '30 jours' },
  { id: '12', label: '12 mois' },
  { id: 'all', label: 'Année' },
]

/** Périodes prédéfinies pour le sélecteur du bandeau */
const PERIOD_PRESETS = [
  { id: 'year', label: 'Année en cours', months: 12 },
  { id: 'quarter', label: 'Dernier trimestre', months: 3 },
  { id: 'month', label: 'Dernier mois', months: 1 },
  { id: '6months', label: '6 derniers mois', months: 6 },
  { id: 'all', label: 'Tout l\'historique', months: 0 },
]

/* ═══════════════════════════ Activité ═══════════════════════ */
const activityMeta: Record<DashboardActivity['type'], { icon: React.ReactNode; tone: IconTone }> = {
  TAXPAYER: { icon: <UserPlus className="h-4 w-4" />, tone: 'brand' },
  DECLARATION: { icon: <FileText className="h-4 w-4" />, tone: 'sky' },
  PAYMENT: { icon: <Wallet className="h-4 w-4" />, tone: 'emerald' },
  DEBT: { icon: <TrendingDown className="h-4 w-4" />, tone: 'amber' },
  COLLECTION: { icon: <ScrollText className="h-4 w-4" />, tone: 'violet' },
  RECEIPT: { icon: <Receipt className="h-4 w-4" />, tone: 'rose' },
}

const collectionTypeLabels: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique', SMS: 'SMS', NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure', PAYMENT_RECORD: 'Paiement', NOTE: 'Note interne',
  FOLLOW_UP: 'Relance', REMINDER: 'Rappel', VISIT: 'Visite sur place',
  SEIZURE: 'Saisie', ADMINISTRATIVE_ACTION: 'Action administrative', OTHER: 'Autre',
}

function statusName(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'En attente', OVERDUE: 'En retard', IN_COLLECTION: 'Recouvrement',
    PAID: 'Payée', CANCELLED: 'Annulée', DISPUTED: 'Contestée',
    PARTIALLY_PAID: 'Partiellement payée', SUSPENDED: 'Suspendue',
  }
  return labels[status] ?? status
}

/** Convertit une date ISO en chaîne YYYY-MM-DD */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Génère un CSV à partir des données du dashboard */
function downloadCSV(data: DashboardSummary, fromDate: string, toDate: string) {
  const lines: string[] = []
  lines.push('Rapport de gestion fiscale — MNK-TAX')
  lines.push(`Période;${fromDate} au ${toDate}`)
  lines.push('')
  lines.push('INDICATEUR;VALEUR')
  lines.push(`Contribuables;${data.taxpayerCount}`)
  lines.push(`Déclarations;${data.declarationCount}`)
  lines.push(`Créances totales;${data.debtCount}`)
  lines.push(`En retard;${data.overdueCount}`)
  lines.push(`Paiements;${data.paymentCount}`)
  lines.push(`Total dû;${data.totalDebts} MGA`)
  lines.push(`Total encaissé;${data.totalCollected} MGA`)
  lines.push(`Solde restant;${data.totalOutstanding} MGA`)
  lines.push(`Solde en retard;${data.overdueBalance} MGA`)
  lines.push(`Taux de recouvrement;${data.collectionRate.toFixed(2)} %`)
  lines.push(`Quittances émises;${data.receiptCount ?? 0}`)
  lines.push(`Montant quittances;${data.receiptTotalAmount ?? 0} MGA`)
  lines.push('')
  lines.push('RÉPARTITION PAR TYPE D\'IMPÔT;MONTANT (MGA)')
  for (const r of (data.paymentsByTaxType ?? [])) {
    lines.push(`${r.taxType};${r.amount}`)
  }
  lines.push('')
  lines.push('ÉVOLUTION MENSUELLE;MONTANT (MGA)')
  for (const r of (data.paymentsByMonth ?? [])) {
    lines.push(`${r.month};${r.amount}`)
  }
  lines.push('')
  lines.push('TOP CONTRIBUABLES;NIF;ENCAISSÉ (MGA);DÛ (MGA)')
  for (const t of (data.topTaxpayersByCollected ?? [])) {
    lines.push(`${t.taxpayerName};${t.nif};${t.collected};${t.due}`)
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-mnk-tax-${fromDate}_${toDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}


/* ═══════════════════════════ Main ═══════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const chart = useChartColors()
  const [chartRange, setChartRange] = useState('12')
  const [periodPreset, setPeriodPreset] = useState('year')
  const months = chartRange === 'all' ? 0 : Number(chartRange)

  // Période sélectionnée pour le bandeau
  const selectedPreset = PERIOD_PRESETS.find((p) => p.id === periodPreset) ?? PERIOD_PRESETS[0]

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', months],
    queryFn: () => apiGet<DashboardSummary>(`/dashboard/summary?months=${months}`),
  })

  const { data: deadlines } = useQuery({
    queryKey: ['dashboard-deadlines'],
    queryFn: () => apiGet<Deadline[]>('/deadlines/upcoming?days=90'),
  })

  const firstName = user?.firstName || 'Administrateur'

  const totalDue = data?.totalDebts ?? 0
  const collectionRate = data?.collectionRate ?? 0

  if (isLoading) return <DashboardSkeleton />
  if (!data) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="Impossible de charger le tableau de bord"
        subtitle="Vérifiez que le serveur est bien démarré."
      />
    )
  }

  /* ── Séries ── */
  const revenueSeries = (data.paymentsByMonth ?? []).map((r) => ({
    label: shortMonthLabel(r.month ?? ''),
    montant: r.amount ?? 0,
  }))
  const taxpayerSpark = (data.taxpayersByMonth ?? []).map((r) => r.count)
  const declarationSpark = (data.declarationsByMonth ?? []).map((r) => r.count)
  const receiptSpark = (data.receiptsByMonth ?? []).map((r) => r.count)
  const last = revenueSeries[revenueSeries.length - 1]?.montant ?? 0
  const prev = revenueSeries[revenueSeries.length - 2]?.montant ?? 0
  const revenueTrend = last - prev

  const rangeN = months === 0 ? revenueSeries.length : Math.min(Number(chartRange) || 12, revenueSeries.length)
  const rangeData = revenueSeries.slice(-rangeN).map((r, i, arr) => ({
    ...r,
    delta: i > 0 ? r.montant - arr[i - 1].montant : 0,
  }))
  const rangeTotal = rangeData.reduce((s, x) => s + x.montant, 0)
  const prevPeriodTotal = revenueSeries.slice(-rangeN * 2, -rangeN).reduce((s, x) => s + x.montant, 0)
  const periodEvo = rangeTotal - prevPeriodTotal
  const periodEvoPct = prevPeriodTotal > 0 ? (periodEvo / prevPeriodTotal) * 100 : null

  /* ── Dates de la période ── */
  const now = new Date()
  const periodToDate = toISODate(now)
  let periodFromDate: string
  if (selectedPreset.months === 0) {
    periodFromDate = '2020-01-01'
  } else {
    const d = new Date(now)
    d.setMonth(d.getMonth() - selectedPreset.months)
    d.setDate(1)
    periodFromDate = toISODate(d)
  }

  /* ── Répartition impôts ── */
  const byTaxType = (data.paymentsByTaxType ?? []).map((r) => ({ name: r.taxType, value: r.amount ?? 0 }))
  const byTaxTypeTotal = byTaxType.reduce((s, x) => s + x.value, 0)
  const topSlice = byTaxType.slice(0, 8)

  const nextDeadlines = (deadlines ?? []).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* ═══════════════ 1. BANDEAU DE BIENVENUE ═══════════════ */}
      <WelcomeBanner
        firstName={firstName}
        periodPreset={periodPreset}
        onPeriodChange={setPeriodPreset}
        fromDate={periodFromDate}
        toDate={periodToDate}
        onDownload={() => downloadCSV(data, periodFromDate, periodToDate)}
      />

      {/* ═══════════════ 2. CARTES KPI ═══════════════ */}
      <div className="kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Contribuables"
          value={fmtNumber(data.taxpayerCount)}
          icon={<Users className="h-5 w-5" />}
          color={C.violet}
          delta={data.periodTaxpayerCount > 0 ? `+${fmtNumber(data.periodTaxpayerCount)}` : undefined}
          deltaTone="up"
          sub="vs période préc."
          sparkData={taxpayerSpark.slice(-6)}
          to="/taxpayers"
        />
        <KpiCard
          label="Recettes (période)"
          value={fmtMGA(data.periodCollected)}
          icon={<PiggyBank className="h-5 w-5" />}
          color={C.green}
          delta={`${revenueTrend >= 0 ? '+' : '−'}${fmtMGA(Math.abs(revenueTrend))}`}
          deltaTone={revenueTrend >= 0 ? 'up' : 'down'}
          sub="vs mois préc."
          sparkData={rangeData.map((d) => d.montant)}
          to="/payments"
        />
        <KpiCard
          label="Déclarations"
          value={fmtNumber(data.declarationCount)}
          icon={<FileText className="h-5 w-5" />}
          color={C.sky}
          delta={data.periodDeclarationCount > 0 ? `+${fmtNumber(data.periodDeclarationCount)}` : undefined}
          deltaTone="up"
          sub="vs période préc."
          sparkData={declarationSpark.slice(-6)}
          to="/declarations"
        />
        <KpiCard
          label="Créances restantes"
          value={fmtMGA(data.totalOutstanding)}
          icon={<TrendingDown className="h-5 w-5" />}
          color={C.orange}
          delta={`${fmtNumber(data.overdueCount)} en retard`}
          deltaTone={data.overdueCount > 0 ? 'down' : 'neutral'}
          sub=""
          to="/debts"
        />
        <KpiCard
          label="Taux de recouvrement"
          value={`${collectionRate.toFixed(1)} %`}
          icon={<Percent className="h-5 w-5" />}
          color={C.blue}
          delta={`${Math.round(collectionRate)} %`}
          deltaTone={collectionRate >= 50 ? 'up' : 'down'}
          sub="du total dû"
          to="/reports"
        />
        <KpiCard
          label="Quittances"
          value={fmtNumber(data.receiptCount ?? 0)}
          icon={<Receipt className="h-5 w-5" />}
          color={C.rose}
          delta={data.todayReceiptCount > 0 ? `+${fmtNumber(data.todayReceiptCount)} aujourd'hui` : undefined}
          deltaTone="up"
          sub="total émises"
          sparkData={receiptSpark.slice(-6)}
          to="/receipts"
        />
      </div>

      {/* ═══════════════ 3. GRAPHIQUE PRINCIPAL ═══════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Évolution des recettes */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Évolution des recettes fiscales</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Encaissements mensuels</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                {CHART_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setChartRange(opt.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      chartRange === opt.id ? 'bg-white text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Total période : <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(rangeTotal)}</span>
            </span>
            {prevPeriodTotal > 0 && periodEvoPct !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  periodEvo >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {periodEvo >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {periodEvoPct >= 0 ? '+' : ''}{periodEvoPct.toFixed(1)} % vs période préc.
              </span>
            )}
          </div>
          <div className="h-80 px-4 py-5">
            {rangeData.length === 0 ? (
              <EmptyState title="Aucune donnée pour cette période" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rangeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5B4BDB" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#5B4BDB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: chart.tick }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} width={80}
                    tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  />
                  <Tooltip
                    formatter={(v, _name, item) => {
                      const row = (item as { payload?: { delta?: number } } | undefined)?.payload
                      const delta = row?.delta ?? 0
                      return [
                        [fmtMGA(Number(v)), 'Montant'],
                        [`${delta >= 0 ? '+' : '−'}${fmtMGA(Math.abs(delta))}`, 'vs mois préc.'],
                      ] as [string, string][]
                    }}
                    contentStyle={chart.tooltip}
                    itemStyle={chart.tooltipItem}
                    labelStyle={chart.tooltipLabel}
                  />
                  <Area type="monotone" dataKey="montant" stroke="#5B4BDB" strokeWidth={2.5} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Donut répartition */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Répartition des recettes</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Par type d'impôt</p>
            </div>
          </div>
          <div className="px-4 py-5">
            {byTaxType.length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="relative mx-auto h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topSlice} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                        {topSlice.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmtMGA(Number(v))}
                        contentStyle={chart.tooltip}
                        itemStyle={chart.tooltipItem}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Encaissé</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtCompact(byTaxTypeTotal)}</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {topSlice.map((entry, i) => {
                    const pct = byTaxTypeTotal ? ((entry.value / byTaxTypeTotal) * 100).toFixed(1) : '0'
                    return (
                      <li key={i}>
                        <Link to={`/payments?taxTypeCode=${encodeURIComponent(entry.name)}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition hover:bg-brand-50/60">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">{entry.name}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{fmtMGA(entry.value)}</span>
                          <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500">{pct} %</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══════════════ 4. SECTION À TROIS COLONNES ═══════════════ */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Top 5 contribuables */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top contribuables</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Meilleurs encaissements</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-5 py-2.5">Nom</th>
                  <th className="px-5 py-2.5">NIF</th>
                  <th className="px-5 py-2.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(!data.topTaxpayersByCollected || data.topTaxpayersByCollected.length === 0) ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">Aucune donnée</td></tr>
                ) : (
                  data.topTaxpayersByCollected.slice(0, 5).map((r, i) => (
                    <tr key={r.taxpayerId} className="transition hover:bg-brand-50/40 cursor-pointer" onClick={() => navigate(`/taxpayers/${r.taxpayerId}`)}>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{r.taxpayerName}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400 dark:text-slate-500">{r.nif}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmtMGA(r.collected)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Link to="/taxpayers" className="block border-t border-slate-200/70 dark:border-slate-700/50 px-5 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700">
            Voir tous les contribuables
          </Link>
        </Card>

        {/* Déclarations par statut */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Déclarations par statut</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Répartition globale</p>
            </div>
          </div>
          <div className="px-4 py-5">
            {(!data.debtsByStatus || data.debtsByStatus.length === 0) ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="relative mx-auto h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.debtsByStatus.map((s) => ({ name: statusName(s.status), value: s.count }))}
                        dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}
                      >
                        {data.debtsByStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtNumber(data.declarationCount)}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">total</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {data.debtsByStatus.slice(0, 6).map((s, i) => {
                    const pct = data.declarationCount > 0 ? ((s.count / data.declarationCount) * 100).toFixed(1) : '0'
                    return (
                      <li key={s.status}>
                        <Link to={`/debts?status=${encodeURIComponent(s.status)}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition hover:bg-brand-50/60">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="min-w-0 flex-1 text-slate-500 dark:text-slate-400">{statusName(s.status)}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{fmtNumber(s.count)}</span>
                          <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500">{pct} %</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
          <Link to="/debts" className="block border-t border-slate-200/70 dark:border-slate-700/50 px-5 py-3 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700">
            Voir toutes les créances
          </Link>
        </Card>

        {/* Activités récentes */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Activités récentes</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Derniers événements</p>
            </div>
            <Link to="/taxpayers" className="text-xs font-medium text-brand-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="px-3 py-3">
            {!data.recentActivity || data.recentActivity.length === 0 ? (
              <EmptyState title="Aucune activité récente" />
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[21px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-600" />
                <ul className="space-y-3">
                  {data.recentActivity.slice(0, 6).map((a) => {
                    const meta = activityMeta[a.type] ?? activityMeta.DECLARATION
                    return (
                      <li key={`${a.type}-${a.id}`} className="relative flex gap-3">
                        <div className="relative z-10 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white ring-2 ring-slate-100" style={{ color: meta.tone === 'brand' ? C.violet : meta.tone === 'sky' ? C.sky : meta.tone === 'emerald' ? C.emerald : meta.tone === 'amber' ? C.orange : meta.tone === 'violet' ? C.violet : C.rose }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{a.label}</p>
                          <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                            <Link to={`/taxpayers/${a.taxpayerId}`} className="font-medium text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:underline">
                              {a.taxpayerName}
                            </Link>
                            <span className="mx-1">·</span>
                            {a.nif}
                          </p>
                        </div>
                        <span className="shrink-0 pt-1 text-right text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(a.date)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══════════════ 5. SECTION BASSE ═══════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Suivi du recouvrement */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Suivi du recouvrement</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Vue globale</p>
            </div>
          </div>
          <div className="px-5 py-5">
            <RecoveryGauge rate={collectionRate} collected={data.totalCollected} totalDue={totalDue} outstanding={data.totalOutstanding} />
          </div>
        </Card>

        {/* Synthèse financière */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Synthèse financière</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Indicateurs globaux réels</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-5 py-5 xl:grid-cols-4">
            {[
              { label: 'Total encaissé', value: fmtMGA(data.totalCollected), color: C.emerald },
              { label: 'Reste à recouvrer', value: fmtMGA(data.totalOutstanding), color: C.orange },
              { label: 'Recouvré', value: `${collectionRate.toFixed(1)} %`, color: C.blue },
              { label: 'Total dû', value: fmtMGA(totalDue), color: C.violet },
            ].map((t) => (
              <div key={t.label} className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/60 p-4 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-800/40">
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: t.color }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.label}</p>
                <p className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-slate-100" title={String(t.value)}>{t.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ═══════════════ 6. INFOS FISCALES + PROCHAINES ACTIONS ═══════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Échéances proches</h2>
            </div>
            <Link to="/deadlines" className="text-xs font-medium text-brand-600 hover:underline">Tout voir</Link>
          </div>
          <div className="space-y-2 px-5 py-4">
            {nextDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Aucune échéance à venir</p>
            ) : (
              nextDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{d.taxTypeName}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{fmtDate(d.declarationDeadline)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-violet-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Prochaines actions</h2>
            </div>
            <Link to="/collection" className="text-xs font-medium text-brand-600 hover:underline">Recouvrement</Link>
          </div>
          <div className="space-y-2 px-5 py-4">
            {!data.nextCollectionActions || data.nextCollectionActions.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Aucune action planifiée</p>
            ) : (
              data.nextCollectionActions.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                      {collectionTypeLabels[a.type] ?? a.type}
                    </p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">{a.taxpayerName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {a.nextActionDate ? fmtDate(a.nextActionDate) : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   COMPOSANTS
   ═══════════════════════════════════════════════════════════════════ */

/* ── Bandeau de bienvenue ── */
function WelcomeBanner({
  firstName,
  periodPreset,
  onPeriodChange,
  fromDate,
  toDate,
  onDownload,
}: {
  firstName: string
  periodPreset: string
  onPeriodChange: (id: string) => void
  fromDate: string
  toDate: string
  onDownload: () => void
}) {
  const [periodOpen, setPeriodOpen] = useState(false)
  const [dlOpen, setDlOpen] = useState(false)
  const periodRef = useRef<HTMLDivElement>(null)
  const dlRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const year = now.getFullYear()
  const dateRangeLabel = `${fmtDate(fromDate)} — ${fmtDate(toDate)}`

  const currentPresetLabel = PERIOD_PRESETS.find((p) => p.id === periodPreset)?.label ?? 'Année en cours'

  /* Fermer les dropdowns au clic extérieur */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false)
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
      {/* Illustration : Vue d'ensemble */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15 rounded-2xl">
        <img src="/vue-ensemble.png" alt="" className="absolute left-1/2 top-1/2 h-[120%] w-auto -translate-x-[30%] -translate-y-1/2 object-contain" />
      </div>

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        {/* Left content */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
            Bienvenue, {firstName} 👋
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/70">
            Vue d'ensemble du recouvrement des impôts — tous les indicateurs sont recalculés selon la période.
          </p>
          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              Exercice fiscal : {year}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              Période active : {dateRangeLabel}
            </span>
          </div>
        </div>

        {/* Right content */}
        <div className="flex shrink-0 flex-col items-end gap-3">
          {/* ── Sélecteur de période ── */}
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => { setPeriodOpen(!periodOpen); setDlOpen(false) }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/25"
            >
              <CalendarDays className="h-4 w-4" />
              {currentPresetLabel}
              <ChevronDown className={`h-4 w-4 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            {periodOpen && (
              <div className="absolute right-0 z-[60] mt-2 w-64 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sélectionner une période</p>
                </div>
                <div className="p-1.5">
                  {PERIOD_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => { onPeriodChange(preset.id); setPeriodOpen(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        periodPreset === preset.id
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`flex h-2 w-2 shrink-0 rounded-full ${periodPreset === preset.id ? 'bg-brand-500' : 'bg-slate-300'}`} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Télécharger rapport ── */}
          <div className="relative" ref={dlRef}>
            <button
              onClick={() => { setDlOpen(!dlOpen); setPeriodOpen(false) }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90"
            >
              <Download className="h-4 w-4" />
              Télécharger rapport
              <ChevronDown className={`h-4 w-4 transition-transform ${dlOpen ? 'rotate-180' : ''}`} />
            </button>
            {dlOpen && (
              <div className="absolute right-0 z-[60] mt-2 w-56 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="p-1.5">
                  <button
                    onClick={() => { onDownload(); setDlOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-medium">CSV (données)</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Tableur avec tous les indicateurs</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mini sparkline SVG ── */
let sparklineCounter = 0
function Sparkline({ data, color, width = 80, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  const gradId = useMemo(() => `spark-${++sparklineCounter}`, [])

  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2
  const w = width - padding * 2
  const h = height - padding * 2

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * w
    const y = padding + h - ((v - min) / range) * h
    return `${x},${y}`
  })

  const pathD = `M${points.join(' L')}`
  const areaD = `${pathD} L${padding + w},${padding + h} L${padding},${padding + h} Z`

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Carte KPI ── */
function KpiCard({
  label, value, icon, color, delta, deltaTone = 'neutral', sub, sparkData, to,
}: {
  label: string; value: string; icon: React.ReactNode; color: string
  delta?: string; deltaTone?: 'up' | 'down' | 'neutral'; sub?: string
  sparkData?: number[]; to?: string
}) {
  const body = (
    <Card hover className="relative h-full overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1A`, color }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {(delta || sub) && (
            <div className="flex items-center gap-2 text-xs">
              {delta && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                    deltaTone === 'up' ? 'bg-emerald-50 text-emerald-700'
                    : deltaTone === 'down' ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {deltaTone === 'up' && <ArrowUp className="h-3 w-3" />}
                  {deltaTone === 'down' && <ArrowDown className="h-3 w-3" />}
                  {delta}
                </span>
              )}
              {sub && <span className="text-slate-400 dark:text-slate-500">{sub}</span>}
            </div>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={color} />
        )}
      </div>
    </Card>
  )
  return to ? (
    <Link to={to} className="group block h-full" aria-label={`${label} — ${value}`}>
      {body}
    </Link>
  ) : body
}

/* ── Jauge de recouvrement ── */
function RecoveryGauge({ rate, collected, totalDue, outstanding }: { rate: number; collected: number; totalDue: number; outstanding: number }) {
  const pct = Math.max(0, Math.min(100, rate))
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 70 ? C.green : pct >= 40 ? C.blue : C.orange

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pct.toFixed(1)} %</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">recouvré</span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Objectif annuel</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(totalDue)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Montant encaissé</span>
          <span className="font-semibold text-emerald-700">{fmtMGA(collected)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Reste à recouvrer</span>
          <span className="font-semibold text-orange-600">{fmtMGA(outstanding)}</span>
        </div>
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Progression</span>
            <span className="font-semibold" style={{ color }}>{pct.toFixed(1)} %</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full origin-left animate-progress rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function fmtCompact(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} k`
  return fmtNumber(v)
}

/* ═══════════════ Skeleton ═══════════════ */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner skeleton */}
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-600" />

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
      </div>

      {/* 3-col skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      {/* Bottom skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
        <div className="lg:col-span-2 h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
      </div>
    </div>
  )
}
