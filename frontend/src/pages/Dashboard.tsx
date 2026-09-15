import { useState, useMemo, useEffect } from 'react'
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
  FileText,
  Banknote,
  Percent,
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
import { useI18n } from '../lib/i18n'
import { useLocaleFormatters } from '../lib/format'
import type { DashboardActivity, DashboardSummary, Deadline } from '../types'
import { Card, EmptyState, type IconTone } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import WelcomeHero, { PERIOD_PRESETS } from '../components/WelcomeHero'

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
    dark,
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
  { id: '7', labelKey: 'dashboard.range.7' },
  { id: '30', labelKey: 'dashboard.range.30' },
  { id: '12', labelKey: 'dashboard.range.12' },
  { id: 'all', labelKey: 'dashboard.range.all' },
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

function statusName(status: string, t: (key: string) => string): string {
  const key = `status.${status}`
  const translated = t(key)
  if (translated !== key) return translated
  const fallback: Record<string, string> = {
    OPEN: 'En attente', OVERDUE: 'En retard', IN_COLLECTION: 'Recouvrement',
    PAID: 'Payée', CANCELLED: 'Annulée', DISPUTED: 'Contestée',
    PARTIALLY_PAID: 'Partiellement payée', SUSPENDED: 'Suspendue',
  }
  return fallback[status] ?? status
}

/** Libellé d'activité : le backend envoie un libellé FR libre → on affiche la version traduite par type, avec fallback */
function activityLabel(type: string, fallbackLabel: string, t: (key: string) => string): string {
  const key = `dashboard.activity.${type.toLowerCase()}`
  const v = t(key)
  return v !== key ? v : fallbackLabel
}

/** Convertit une date ISO en chaîne YYYY-MM-DD */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Génère un CSV à partir des données du dashboard */
function downloadCSV(data: DashboardSummary, fromDate: string, toDate: string, t: (key: string) => string) {
  const lines: string[] = []
  lines.push(t('dashboard.csv.reportTitle'))
  lines.push(`${t('dashboard.csv.period')};${fromDate} ${t('dashboard.csv.to')} ${toDate}`)
  lines.push('')
  lines.push(`${t('dashboard.csv.indicator')};${t('dashboard.csv.value')}`)
  lines.push(`${t('dashboard.csv.taxpayers')};${data.taxpayerCount}`)
  lines.push(`${t('dashboard.csv.declarations')};${data.declarationCount}`)
  lines.push(`${t('dashboard.csv.totalDebts')};${data.debtCount}`)
  lines.push(`${t('dashboard.csv.overdue')};${data.overdueCount}`)
  lines.push(`${t('dashboard.csv.payments')};${data.paymentCount}`)
  lines.push(`${t('dashboard.csv.totalDue')};${data.totalDebts} MGA`)
  lines.push(`${t('dashboard.csv.collected')};${data.totalCollected} MGA`)
  lines.push(`${t('dashboard.csv.outstanding')};${data.totalOutstanding} MGA`)
  lines.push(`${t('dashboard.csv.overdueBalance')};${data.overdueBalance} MGA`)
  lines.push(`${t('dashboard.csv.rate')};${data.collectionRate.toFixed(2)} %`)
  lines.push(`${t('dashboard.csv.receipts')};${data.receiptCount ?? 0}`)
  lines.push(`${t('dashboard.csv.receiptAmount')};${data.receiptTotalAmount ?? 0} MGA`)
  lines.push('')
  lines.push(`${t('dashboard.csv.byTaxType')};${t('dashboard.csv.amountMGA')}`)
  for (const r of (data.paymentsByTaxType ?? [])) {
    lines.push(`${r.taxType};${r.amount}`)
  }
  lines.push('')
  lines.push(`${t('dashboard.csv.byMonth')};${t('dashboard.csv.amountMGA')}`)
  for (const r of (data.paymentsByMonth ?? [])) {
    lines.push(`${r.month};${r.amount}`)
  }
  lines.push('')
  lines.push(`${t('dashboard.csv.topTaxpayers')};${t('dashboard.csv.nif')};${t('dashboard.csv.collectedMGA')};${t('dashboard.csv.dueMGA')}`)
  for (const t of (data.topTaxpayersByCollected ?? [])) {
    lines.push(`${t.taxpayerName};${t.nif};${t.collected};${t.due}`)
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-mnk-tax-${fromDate}_${toDate}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}


/* ═══════════════════════════ Main ═══════════════════════════ */
export default function Dashboard() {
  const { t } = useI18n()
  const { fmtMGA, fmtNumber, fmtDate, shortMonthLabel, timeAgo } = useLocaleFormatters()
  const { user } = useAuth()
  const navigate = useNavigate()
  const chart = useChartColors()
  const [periodPreset, setPeriodPreset] = useState('year')

  // Période sélectionnée pour le bandeau
  const selectedPreset = PERIOD_PRESETS.find((p) => p.id === periodPreset) ?? PERIOD_PRESETS[0]
  const months = selectedPreset.months

  // Synchroniser chartRange <-> periodPreset
  const [chartRange, setChartRange] = useState('12')
  const chartToPreset: Record<string, string> = { '12': 'year', 'all': 'all' }
  const presetToChart: Record<string, string> = { 'year': '12', 'quarter': '3', 'month': '1', '6months': '6', 'all': 'all' }
  function handlePeriodChange(id: string) {
    setPeriodPreset(id)
    const chartKey = presetToChart[id]
    if (chartKey) setChartRange(chartKey)
  }
  function handleChartRangeChange(id: string) {
    setChartRange(id)
    const presetKey = chartToPreset[id]
    if (presetKey) setPeriodPreset(presetKey)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', months],
    queryFn: () => apiGet<DashboardSummary>(`/dashboard/summary?months=${months}`),
  })

  const { data: deadlines } = useQuery({
    queryKey: ['dashboard-deadlines'],
    queryFn: () => apiGet<Deadline[]>('/deadlines/upcoming?days=90'),
  })

  const firstName = user?.firstName || 'Administrateur'

  const isAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN')

  const welcomeSize = isAdmin ? 'large' : 'normal'

  const totalDue = data?.totalDebts ?? 0
  const collectionRate = data?.collectionRate ?? 0

  if (isLoading) return <DashboardSkeleton />
  if (!data) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title={t("dashboard.loadError")}
        subtitle={t("dashboard.checkServer")}
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
    <div className="fx-page dash-scope is-visible space-y-6">
      {/* ═══════════════ 1. BANDEAU DE BIENVENUE ═══════════════ */}
      <WelcomeHero
        firstName={firstName}
        periodPreset={periodPreset}
        onPeriodChange={handlePeriodChange}
        fromDate={periodFromDate}
        toDate={periodToDate}
        onDownload={() => downloadCSV(data, periodFromDate, periodToDate, t)}
        size={welcomeSize}
      />

      {/* ═══════════════ 2. CARTES KPI ═══════════════ */}
      <div className="kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label={t('dashboard.kpi.taxpayers')}
          value={fmtNumber(data.taxpayerCount)}
          icon={<Users className="h-5 w-5" />}
          color={C.violet}
          delta={data.periodTaxpayerCount > 0 ? `+${fmtNumber(data.periodTaxpayerCount)}` : undefined}
          deltaTone="up"
          sub={t('dashboard.sub.vsPrevPeriod')}
          sparkData={taxpayerSpark.slice(-6)}
          to="/taxpayers"
        />
        <KpiCard
          label={t('dashboard.kpi.revenuePeriod')}
          value={fmtMGA(data.periodCollected)}
          icon={<Banknote className="h-5 w-5" />}
          color={C.green}
          delta={`${revenueTrend >= 0 ? '+' : '−'}${fmtMGA(Math.abs(revenueTrend))}`}
          deltaTone={revenueTrend >= 0 ? 'up' : 'down'}
          sub={t('dashboard.sub.vsPrevMonth')}
          sparkData={rangeData.map((d) => d.montant)}
          to="/payments"
        />
        <KpiCard
          label={t('dashboard.kpi.declarations')}
          value={fmtNumber(data.declarationCount)}
          icon={<FileText className="h-5 w-5" />}
          color={C.sky}
          delta={data.periodDeclarationCount > 0 ? `+${fmtNumber(data.periodDeclarationCount)}` : undefined}
          deltaTone="up"
          sub={t('dashboard.sub.vsPrevPeriod')}
          sparkData={declarationSpark.slice(-6)}
          to="/declarations"
        />
        <KpiCard
          label={t('dashboard.kpi.outstanding')}
          value={fmtMGA(data.totalOutstanding)}
          icon={<TrendingDown className="h-5 w-5" />}
          color={C.orange}
          delta={t('dashboard.sub.inLate', { count: fmtNumber(data.overdueCount) })}
          deltaTone={data.overdueCount > 0 ? 'down' : 'neutral'}
          sub=""
          to="/debts"
        />
        <KpiCard
          label={t('dashboard.kpi.collectionRate')}
          value={`${collectionRate.toFixed(1)} %`}
          icon={<Percent className="h-5 w-5" />}
          color={C.blue}
          delta={`${Math.round(collectionRate)} %`}
          deltaTone={collectionRate >= 50 ? 'up' : 'down'}
          sub={t('dashboard.sub.ofTotalDue')}
          to="/reports"
        />
        <KpiCard
          label={t('dashboard.kpi.receipts')}
          value={fmtNumber(data.receiptCount ?? 0)}
          icon={<Receipt className="h-5 w-5" />}
          color={C.rose}
          delta={data.todayReceiptCount > 0 ? t('dashboard.sub.today', { count: fmtNumber(data.todayReceiptCount) }) : undefined}
          deltaTone="up"
          sub={t('dashboard.sub.totalIssued')}
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.chart.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.chart.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                {CHART_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleChartRangeChange(opt.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      chartRange === opt.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {t('dashboard.chart.totalPeriod')} <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(rangeTotal)}</span>
            </span>
            {prevPeriodTotal > 0 && periodEvoPct !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  periodEvo >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {periodEvo >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {periodEvoPct >= 0 ? '+' : ''}{periodEvoPct.toFixed(1)} % {t('dashboard.chart.vsPrevPeriod')}
              </span>
            )}
          </div>
          <div className="rechart-entrance rechart-shimmer h-80 px-4 py-5">
            {rangeData.length === 0 ? (
              <EmptyState title={t('dashboard.chart.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={chartRange} data={rangeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5B4BDB" stopOpacity={chart.dark ? 0.25 : 0.18} />
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
                        [fmtMGA(Number(v)), t('dashboard.chart.amount')],
                        [`${delta >= 0 ? '+' : '−'}${fmtMGA(Math.abs(delta))}`, t('dashboard.sub.vsPrevMonth')],
                      ] as [string, string][]
                    }}
                    contentStyle={chart.tooltip}
                    itemStyle={chart.tooltipItem}
                    labelStyle={chart.tooltipLabel}
                  />
                  <Area type="monotone" dataKey="montant" stroke="#5B4BDB" strokeWidth={2.5} fill="url(#revenueFill)" isAnimationActive animationDuration={1100} animationBegin={150} animationEasing="cubic-bezier(0.22, 1, 0.36, 1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Donut répartition */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.donut.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.donut.subtitle')}</p>
            </div>
          </div>
          <div className="px-4 py-5">
            {byTaxType.length === 0 ? (
              <EmptyState title={t('dashboard.donut.noData')} />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="rechart-entrance relative mx-auto h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topSlice} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={3} strokeWidth={0} isAnimationActive animationDuration={1000} animationBegin={250} animationEasing="cubic-bezier(0.22, 1, 0.36, 1)">
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
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('dashboard.donut.collected')}</span>
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.top.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.top.subtitle')}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-5 py-2.5">{t('dashboard.top.name')}</th>
                  <th className="px-5 py-2.5">NIF</th>
                  <th className="px-5 py-2.5 text-right">{t('dashboard.top.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(!data.topTaxpayersByCollected || data.topTaxpayersByCollected.length === 0) ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">{t('dashboard.top.noData')}</td></tr>
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
            {t('dashboard.top.viewAll')}
          </Link>
        </Card>

        {/* Déclarations par statut */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.declStatus.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.declStatus.subtitle')}</p>
            </div>
          </div>
          <div className="px-4 py-5">
            {(!data.debtsByStatus || data.debtsByStatus.length === 0) ? (
              <EmptyState title={t('dashboard.donut.noData')} />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="rechart-entrance relative mx-auto h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.debtsByStatus.map((s) => ({ name: statusName(s.status, t), value: s.count }))}
                        dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}
                        isAnimationActive animationDuration={1000} animationBegin={350} animationEasing="cubic-bezier(0.22, 1, 0.36, 1)"
                      >
                        {data.debtsByStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtNumber(data.declarationCount)}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{t('dashboard.declStatus.total')}</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {data.debtsByStatus.slice(0, 6).map((s, i) => {
                    const pct = data.declarationCount > 0 ? ((s.count / data.declarationCount) * 100).toFixed(1) : '0'
                    return (
                      <li key={s.status}>
                        <Link to={`/debts?status=${encodeURIComponent(s.status)}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition hover:bg-brand-50/60">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="min-w-0 flex-1 text-slate-500 dark:text-slate-400">{statusName(s.status, t)}</span>
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
            {t('dashboard.declStatus.viewAll')}
          </Link>
        </Card>

        {/* Activités récentes */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.activity.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.activity.subtitle')}</p>
            </div>
            <Link to="/taxpayers" className="text-xs font-medium text-brand-600 hover:underline">
              {t('dashboard.activity.viewAll')}
            </Link>
          </div>
          <div className="px-3 py-3">
            {!data.recentActivity || data.recentActivity.length === 0 ? (
              <EmptyState title={t('dashboard.activity.noData')} />
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[21px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-600" />
                <ul className="space-y-3">
                  {data.recentActivity.slice(0, 6).map((a) => {
                    const meta = activityMeta[a.type] ?? activityMeta.DECLARATION
                    return (
                      <li key={`${a.type}-${a.id}`} className="relative flex gap-3">
                        <div className="relative z-10 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white ring-2 ring-slate-100 dark:bg-slate-700 dark:ring-slate-600" style={{ color: meta.tone === 'brand' ? C.violet : meta.tone === 'sky' ? C.sky : meta.tone === 'emerald' ? C.emerald : meta.tone === 'amber' ? C.orange : meta.tone === 'violet' ? C.violet : C.rose }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{activityLabel(a.type, a.label, t)}</p>
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.recovery.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.recovery.subtitle')}</p>
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.synthesis.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.synthesis.subtitle')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-5 py-5 xl:grid-cols-4">
            {[
              { label: t('dashboard.synthesis.collected'), value: fmtMGA(data.totalCollected), color: C.emerald },
              { label: t('dashboard.synthesis.remaining'), value: fmtMGA(data.totalOutstanding), color: C.orange },
              { label: t('dashboard.synthesis.recovered'), value: `${collectionRate.toFixed(1)} %`, color: C.blue },
              { label: t('dashboard.synthesis.totalDue'), value: fmtMGA(totalDue), color: C.violet },
            ].map((item) => (
              <div key={item.label} className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white p-4 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800">
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: item.color }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-slate-100" title={String(item.value)}>{item.value}</p>
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.deadlines.title')}</h2>
            </div>
            <Link to="/deadlines" className="text-xs font-medium text-brand-600 hover:underline">{t('dashboard.deadlines.viewAll')}</Link>
          </div>
          <div className="space-y-2 px-5 py-4">
            {nextDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('dashboard.deadlines.none')}</p>
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.actions.title')}</h2>
            </div>
            <Link to="/collection" className="text-xs font-medium text-brand-600 hover:underline">{t('dashboard.actions.collection')}</Link>
          </div>
          <div className="space-y-2 px-5 py-4">
            {!data.nextCollectionActions || data.nextCollectionActions.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('dashboard.actions.none')}</p>
            ) : (
              data.nextCollectionActions.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                      {(() => { const k = `collection.type.${a.type}`; const v = t(k); return v !== k ? v : (collectionTypeLabels[a.type] ?? a.type) })()}
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
  const { resolved } = useTheme()
  const { t } = useI18n()
  const isDark = resolved === 'dark'
  const glowColor = `${color}15`
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const borderHover = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'

  const body = (
    <div
      className="group/card relative flex h-full flex-col justify-between overflow-hidden p-4 transition-all duration-200"
      style={{
        background: isDark ? '#111827' : '#ffffff',
        border: `1px solid ${borderColor}`,
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 1px 3px rgba(0,0,0,0.2), 0 0 0 0 transparent'
          : '0 1px 3px rgba(0,0,0,0.06), 0 0 0 0 transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = borderHover
        e.currentTarget.style.boxShadow = `0 4px 20px ${glowColor}, 0 1px 3px rgba(0,0,0,0.3)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = borderColor
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2), 0 0 0 0 transparent'
      }}
    >
      {/* Accent supérieur uni (tonalité de l'indicateur) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: color, opacity: 0.45 }}
      />

      {/* Header: icon + label + menu */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${color}18`, color }}
          >
            {icon}
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        </div>
        <button className="rounded-lg p-1 text-slate-600 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-400" aria-label={t("a11y.options")}>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Valeur principale */}
      <div className="mt-2">
        <p className="truncate text-xl font-[650] leading-tight tracking-tight text-slate-900 dark:text-white">{value}</p>
      </div>

      {/* Delta + sparkline */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          {(delta || sub) && (
            <div className="flex items-center gap-2 text-xs">
              {delta && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                    deltaTone === 'up' ? 'bg-emerald-500/15 text-emerald-400'
                    : deltaTone === 'down' ? 'bg-rose-500/15 text-rose-400'
                    : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {deltaTone === 'up' && <ArrowUp className="h-3 w-3" />}
                  {deltaTone === 'down' && <ArrowDown className="h-3 w-3" />}
                  {delta}
                </span>
              )}
              {sub && <span className="text-slate-500 dark:text-slate-600">{sub}</span>}
            </div>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={color} />
        )}
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="group block h-full" aria-label={`${label} — ${value}`}>
      {body}
    </Link>
  ) : body
}

/* ── Jauge de recouvrement ── */
function RecoveryGauge({ rate, collected, totalDue, outstanding }: { rate: number; collected: number; totalDue: number; outstanding: number }) {
  const { resolved } = useTheme()
  const { fmtMGA } = useLocaleFormatters()
  const { t } = useI18n()
  const isDark = resolved === 'dark'
  const pct = Math.max(0, Math.min(100, rate))
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 70 ? C.green : pct >= 40 ? C.blue : C.orange
  const trackColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke={trackColor} strokeWidth="10" />
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
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{t('dashboard.recovery.recovered')}</span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.recovery.goal')}</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtMGA(totalDue)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.recovery.collected')}</span>
          <span className="font-semibold text-emerald-700">{fmtMGA(collected)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.recovery.remaining')}</span>
          <span className="font-semibold text-orange-600">{fmtMGA(outstanding)}</span>
        </div>
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>{t('dashboard.recovery.progress')}</span>
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
  return new Intl.NumberFormat('fr-MG').format(Number(v ?? 0))
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
