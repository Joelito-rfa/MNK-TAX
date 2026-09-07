import { useState, useMemo } from 'react'
import { useDropdownList } from '../lib/useDropdown'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { fmtDate } from '../lib/format'
import type { Deadline, TaxType } from '../types'
import { Button, Card, EmptyState, Field, Input, Modal, Select, Badge } from '../components/ui'
import { useToast } from '../components/Toast'

/* ═══════════════════════════ Types ═══════════════════════════ */

type ViewMode = 'list' | 'calendar' | 'monthly'
type FilterMode = 'all' | 'upcoming' | 'today' | 'week' | 'overdue' | 'completed'

interface CalendarEvent {
  id: number
  title: string
  type: 'declaration' | 'payment'
  date: string
  deadline: Deadline
  status: 'upcoming' | 'soon' | 'overdue' | 'completed'
}

/* ═══════════════════════════ Constantes ═══════════════════════════ */

const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TAX_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  TVA: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  IRSA: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  IS: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  IR: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  IFT: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  IFPB: { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  IPVI: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
}
const DEFAULT_TAX_COLOR = { bg: 'bg-slate-50 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-400', dot: 'bg-slate-400' }

function getTaxColor(code: string) {
  return TAX_TYPE_COLORS[code] ?? DEFAULT_TAX_COLOR
}

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function getDeadlineStatus(d: Deadline): 'upcoming' | 'soon' | 'overdue' | 'completed' {
  const days = daysUntil(d.declarationDeadline)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'soon'
  return 'upcoming'
}

function statusBadgeTone(status: string): 'blue' | 'amber' | 'red' | 'green' | 'slate' {
  switch (status) {
    case 'upcoming': return 'blue'
    case 'soon': return 'amber'
    case 'overdue': return 'red'
    case 'completed': return 'green'
    default: return 'slate'
  }
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'upcoming': return 'bg-blue-500'
    case 'soon': return 'bg-amber-500'
    case 'overdue': return 'bg-red-500'
    case 'completed': return 'bg-emerald-500'
    default: return 'bg-slate-400'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'upcoming': return 'À venir'
    case 'soon': return 'Bientôt'
    case 'overdue': return 'En retard'
    case 'completed': return 'Terminé'
    default: return status
  }
}

function getDaysLabel(days: number): string {
  if (days < 0) return `Il y a ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

function parsePeriod(period: string): { year: number; month: number } | null {
  const m = period.match(/^(\d{4})-(\d{2})$/)
  if (m) return { year: Number(m[1]), month: Number(m[2]) }
  return null
}

function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function Deadlines() {
  const toast = useToast()

  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTaxType, setFilterTaxType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailDeadline, setDetailDeadline] = useState<Deadline | null>(null)
  const { openId: showMenuId, close: closeMenu, getTriggerProps, getDropdownProps } = useDropdownList()

  const today = todayStr()

  const { data: allDeadlines, isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: () => apiGet<Deadline[]>('/deadlines'),
  })


  const deadlines = useMemo(() => {
    const list = allDeadlines ?? []
    return [...list].sort((a, b) => a.declarationDeadline.localeCompare(b.declarationDeadline))
  }, [allDeadlines])

  const uniqueTaxTypes = useMemo(() => {
    const codes = new Set(deadlines.map((d) => d.taxTypeCode))
    return Array.from(codes).sort()
  }, [deadlines])

  const months = useMemo(() => {
    const set = new Map<string, string>()
    deadlines.forEach((d) => {
      const p = parsePeriod(d.period)
      if (p) set.set(d.period, `${MONTH_NAMES[p.month - 1]} ${p.year}`)
    })
    return Array.from(set.entries())
  }, [deadlines])

  /* ── KPI ── */
  const kpis = useMemo(() => {
    const upcoming = deadlines.filter((d) => d.declarationDeadline >= today).length
    const thisWeek = deadlines.filter((d) => { const du = daysUntil(d.declarationDeadline); return du >= 0 && du <= 7 }).length
    const overdue = deadlines.filter((d) => d.declarationDeadline < today).length
    return { upcoming, thisWeek, overdue }
  }, [deadlines, today])

  /* ── Filtering ── */
  const filteredDeadlines = useMemo(() => {
    let result = deadlines

    if (filterMode === 'upcoming') result = result.filter((d) => d.declarationDeadline >= today)
    else if (filterMode === 'today') result = result.filter((d) => d.declarationDeadline === today)
    else if (filterMode === 'week') result = result.filter((d) => { const du = daysUntil(d.declarationDeadline); return du >= 0 && du <= 7 })
    else if (filterMode === 'overdue') result = result.filter((d) => d.declarationDeadline < today)

    if (filterTaxType !== 'all') result = result.filter((d) => d.taxTypeCode === filterTaxType)
    if (filterMonth !== 'all') result = result.filter((d) => d.period === filterMonth)
    if (filterStatus !== 'all') result = result.filter((d) => getDeadlineStatus(d) === filterStatus)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) =>
        d.taxTypeName.toLowerCase().includes(q) ||
        d.taxTypeCode.toLowerCase().includes(q) ||
        d.period.toLowerCase().includes(q)
      )
    }

    return result
  }, [deadlines, filterMode, filterTaxType, filterMonth, filterStatus, searchQuery, today])

  /* ── Calendar events ── */
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = []
    filteredDeadlines.forEach((d) => {
      const status = getDeadlineStatus(d)
      events.push({
        id: d.id * 2,
        title: `${d.taxTypeCode} - Declaration`,
        type: 'declaration',
        date: d.declarationDeadline,
        deadline: d,
        status,
      })
      events.push({
        id: d.id * 2 + 1,
        title: `${d.taxTypeCode} - Paiement`,
        type: 'payment',
        date: d.paymentDeadline,
        deadline: d,
        status: daysUntil(d.paymentDeadline) < 0 ? 'overdue' : daysUntil(d.paymentDeadline) <= 7 ? 'soon' : 'upcoming',
      })
    })
    return events
  }, [filteredDeadlines])

  /* ── Month navigation ── */
  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: prev.month - 1 }
    })
  }
  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }
  const goToToday = () => {
    const now = new Date()
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() })
    setFilterMode('today')
  }

  const handleExport = () => {
    const rows = filteredDeadlines.length > 0 ? filteredDeadlines : deadlines
    if (rows.length === 0) {
      toast.info('Aucune echeance a exporter')
      return
    }
    downloadCsv(
      `calendrier_echeances_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Impot', 'Code', 'Periode', 'Declaration', 'Paiement', 'Jours restants', 'Statut'],
      rows.map((d) => {
        const days = daysUntil(d.declarationDeadline)
        const status = getDeadlineStatus(d)
        return [
          d.taxTypeName, d.taxTypeCode, d.period,
          d.declarationDeadline, d.paymentDeadline,
          String(days), statusLabel(status),
        ]
      }),
    )
    toast.success('Export termine')
  }

  /* ── Calendar grid ── */
  const calendarGrid = useMemo(() => {
    const { year, month } = currentMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = lastDay.getDate()
    const cells: { date: string; day: number; isCurrentMonth: boolean; events: CalendarEvent[] }[] = []

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, -startOffset + i + 1)
      const dateStr = d.toISOString().slice(0, 10)
      cells.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false, events: calendarEvents.filter((e) => isSameDay(e.date, dateStr)) })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      cells.push({ date: dateStr, day: i, isCurrentMonth: true, events: calendarEvents.filter((e) => isSameDay(e.date, dateStr)) })
    }
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const dateStr = d.toISOString().slice(0, 10)
      cells.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false, events: calendarEvents.filter((e) => isSameDay(e.date, dateStr)) })
    }
    return cells
  }, [currentMonth, calendarEvents])

  /* ── Upcoming timeline ── */
  const upcomingTimeline = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return deadlines
      .filter((d) => daysUntil(d.declarationDeadline) >= 0)
      .slice(0, 5)
  }, [deadlines])

  /* ── Alerts ── */
  const alerts = useMemo(() => {
    const comingSoon = deadlines.filter((d) => { const du = daysUntil(d.declarationDeadline); return du >= 0 && du <= 7 }).length
    const overdue = deadlines.filter((d) => d.declarationDeadline < today).length
    return { comingSoon, overdue }
  }, [deadlines, today])

  const resetFilters = () => {
    setSearchQuery('')
    setFilterTaxType('all')
    setFilterMonth('all')
    setFilterStatus('all')
    setFilterMode('all')
  }

  if (isLoading) return <DeadlinesSkeleton />

  return (
    <div className="space-y-6 animate-page-in">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Calendrier fiscal
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerez et suivez les echeances de declaration et de paiement des obligations fiscales.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={goToToday}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <CalendarDays className="h-4 w-4 text-slate-400" />
            Aujourd'hui
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4 text-slate-400" />
            Exporter
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Plus className="relative h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span className="relative">Nouvelle echeance</span>
          </button>
        </div>
      </div>

      {/* ═══════════════ ALERTS ═══════════════ */}
{alerts.overdue > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
</span>
           <p className="text-sm font-medium text-red-700 dark:text-red-400">
             {alerts.overdue} echeance{alerts.overdue > 1 ? 's' : ''} fiscale{alerts.overdue > 1 ? 's' : ''} en retard.
             </p>
           <button
               onClick={() => { setFilterMode('overdue'); setViewMode('list') }}
               className="ml-auto text-xs font-semibold text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-900 dark:text-red-400 dark:decoration-red-800"
             >
               Voir les echeances concernees
             </button>
         </div>
       )}
       {alerts.comingSoon > 0 && !alerts.overdue && (
        <div className="space-y-2 animate-fade-in">
          {alerts.comingSoon > 0 && !alerts.overdue && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-900/10">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {alerts.comingSoon} echeance{alerts.comingSoon > 1 ? 's' : ''} arrivent dans moins de 7 jours.
              </p>
              <button
                onClick={() => { setFilterMode('week'); setViewMode('list') }}
                className="ml-auto text-xs font-semibold text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900 dark:text-amber-400 dark:decoration-amber-800"
              >
                Voir les echeances concernees
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SECTION 1: KPI CARDS ═══════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<CalendarDays className="h-5 w-5" />}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          iconColor="text-violet-600 dark:text-violet-400"
          label="ECHÉANCES À VENIR"
          value={kpis.upcoming}
          sub="Echeances futures"
          onClick={() => setFilterMode('upcoming')}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          iconColor="text-amber-600 dark:text-amber-400"
          label="CETTE SEMAINE"
          value={kpis.thisWeek}
          sub="Echeances proches"
          onClick={() => setFilterMode('week')}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          label="EN RETARD"
          value={kpis.overdue}
          sub="Echeances depassees"
          accent="red"
          onClick={() => setFilterMode('overdue')}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="TOTAL ÉCHÉANCES"
          value={deadlines.length}
          sub="Echeances definies"
          accent="green"
        />
      </div>

      {/* Retour au calendrier quand un filtre actif est appliqué */}
      {filterMode !== 'all' && viewMode === 'list' && (
        <button
          onClick={() => { setFilterMode('all'); setViewMode('calendar') }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au calendrier
        </button>
      )}

      {/* ═══════════════ SECTION 2: NAVIGATION + VIEW MODE ═══════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">
          {([
            { key: 'all' as FilterMode, label: 'Toutes' },
            { key: 'upcoming' as FilterMode, label: 'A venir' },
            { key: 'today' as FilterMode, label: "Aujourd'hui" },
            { key: 'week' as FilterMode, label: 'Cette semaine' },
            { key: 'overdue' as FilterMode, label: 'En retard' },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                filterMode === f.key
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">
          {([
            { key: 'calendar' as ViewMode, icon: <CalendarDays className="h-4 w-4" />, label: 'Calendrier' },
            { key: 'list' as ViewMode, icon: <List className="h-4 w-4" />, label: 'Liste' },
            { key: 'monthly' as ViewMode, icon: <CalendarClock className="h-4 w-4" />, label: 'Mensuel' },
          ]).map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                viewMode === v.key
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ SECTION 3: CALENDAR VIEW ═══════════════ */}
      {viewMode === 'calendar' && (
        <Card className="overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToToday} className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                Auj.
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/50">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarGrid.map((cell, i) => {
              const isToday = cell.date === today
              return (
                <div
                  key={i}
                  className={`min-h-[88px] border-b border-r border-slate-100 p-1.5 transition hover:bg-slate-50/50 dark:border-slate-700/50 dark:hover:bg-slate-700/20 ${
                    !cell.isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                          : cell.isCurrentMonth
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {cell.events.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setDetailDeadline(ev.deadline)}
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium transition hover:opacity-80 ${
                          ev.type === 'declaration'
                            ? ev.status === 'overdue'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : ev.status === 'soon'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                            : ev.status === 'overdue'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : ev.status === 'soon'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {cell.events.length > 3 && (
                      <span className="block px-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        +{cell.events.length - 3} de plus
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ═══════════════ SECTION 4: LIST VIEW ═══════════════ */}
      {viewMode === 'list' && (
        <Card className="overflow-visible animate-fade-in">
          <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Liste des echeances
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une echeance..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
              <Filter className="h-4 w-4 text-slate-400" />
              <select value={filterTaxType} onChange={(e) => setFilterTaxType(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
                <option value="all">Tous les impots</option>
                {uniqueTaxTypes.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
                <option value="all">Toutes les periodes</option>
                {months.map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300">
                <option value="all">Tous les statuts</option>
                <option value="upcoming">A venir</option>
                <option value="soon">Bientot</option>
                <option value="overdue">En retard</option>
              </select>
            </div>
            {(searchQuery || filterTaxType !== 'all' || filterMonth !== 'all' || filterStatus !== 'all') && (
              <button onClick={resetFilters} className="text-xs font-medium text-violet-600 transition hover:text-violet-800 dark:text-violet-400">
                Reinitialiser
              </button>
            )}
          </div>

          {filteredDeadlines.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<CalendarDays className="h-10 w-10" />}
                title="Aucune echeance trouvee"
                subtitle="Aucune echeance fiscale ne correspond aux filtres selectionnes."
              />
              <div className="mt-4 flex justify-center">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Creer une echeance
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Impot</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Periode</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Declaration</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paiement</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jours restants</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</th>
                    <th className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {filteredDeadlines.map((d) => {
                    const status = getDeadlineStatus(d)
                    const days = daysUntil(d.declarationDeadline)
                    const tc = getTaxColor(d.taxTypeCode)
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setDetailDeadline(d)}
                        className="cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-700/30"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${tc.bg} ${tc.text}`}>
                              {d.taxTypeCode}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{d.taxTypeName}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400">{d.period}</td>
                        <td className={`whitespace-nowrap px-5 py-3.5 font-medium ${status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {fmtDate(d.declarationDeadline)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400">{fmtDate(d.paymentDeadline)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className={`text-xs font-semibold ${days < 0 ? 'text-red-600 dark:text-red-400' : days <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {getDaysLabel(days)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <Badge tone={statusBadgeTone(status)}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(status)}`} />
                            {statusLabel(status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button {...getTriggerProps(d.id)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {showMenuId === d.id && (
                              <div {...getDropdownProps()} className="absolute right-0 z-50 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                                <div className="space-y-0.5">
                                  <button onClick={() => { setDetailDeadline(d); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <Target className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les details
                                  </button>
                                  <button onClick={() => { toast.info('Modifier l echeance'); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <Pencil className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Modifier
                                  </button>
                                  <button onClick={() => { toast.success('Echeance marquee comme terminee'); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> Marquer terminee
                                  </button>
                                  <button onClick={() => { toast.info('Creer la declaration'); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <FileText className="h-4 w-4 shrink-0 text-blue-500" /> Creer la declaration
                                  </button>
                                  <button onClick={() => { toast.info('Enregistrer le paiement'); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                                    <CalendarClock className="h-4 w-4 shrink-0 text-violet-500" /> Enregistrer paiement
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                  <button onClick={() => { toast.error('Echeance supprimee'); closeMenu() }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-4 w-4 shrink-0" /> Supprimer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredDeadlines.length > 0 && (
            <div className="border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filteredDeadlines.length} echeance{filteredDeadlines.length > 1 ? 's' : ''} affichee{filteredDeadlines.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════ SECTION 5: MONTHLY VIEW ═══════════════ */}
      {viewMode === 'monthly' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Vue mensuelle - {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToToday} className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                Auj.
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDeadlines
              .filter((d) => {
                const p = parsePeriod(d.period)
                return p && p.year === currentMonth.year && p.month === currentMonth.month + 1
              })
              .map((d) => {
                const status = getDeadlineStatus(d)
                const days = daysUntil(d.declarationDeadline)
                const tc = getTaxColor(d.taxTypeCode)
                return (
                  <Card key={d.id} hover className="cursor-pointer overflow-hidden" onClick={() => setDetailDeadline(d)}>
                    <div className={`border-l-4 ${
                      status === 'overdue' ? 'border-l-red-500' :
                      status === 'soon' ? 'border-l-amber-500' : 'border-l-violet-500'
                    } px-5 py-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${tc.bg} ${tc.text}`}>
                            {d.taxTypeCode}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{d.taxTypeName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{d.period}</p>
                          </div>
                        </div>
                        <Badge tone={statusBadgeTone(status)}>
                          {statusLabel(status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>Declaration : {fmtDate(d.declarationDeadline)}</span>
                        <span>Paiement : {fmtDate(d.paymentDeadline)}</span>
                      </div>
                      <div className="mt-2">
                        <span className={`text-xs font-semibold ${days < 0 ? 'text-red-600 dark:text-red-400' : days <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {getDaysLabel(days)}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            {filteredDeadlines.filter((d) => {
              const p = parsePeriod(d.period)
              return p && p.year === currentMonth.year && p.month === currentMonth.month + 1
            }).length === 0 && (
              <div className="col-span-full py-12">
                <EmptyState
                  icon={<CalendarDays className="h-10 w-10" />}
                  title="Aucune echeance ce mois"
                  subtitle="Aucune echeance fiscale n est prevue pour ce mois."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ SECTION: PROCHAINES ÉCHÉANCES (Timeline) ═══════════════ */}
      {upcomingTimeline.length > 0 && (
        <Card className="overflow-hidden animate-fade-in">
          <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Prochaines echeances
            </h2>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-4">
                {upcomingTimeline.map((d, i) => {
                  const days = daysUntil(d.declarationDeadline)
                  const tc = getTaxColor(d.taxTypeCode)
                  const label = getDaysLabel(days)
                  const isToday = days === 0
                  const isTomorrow = days === 1
                  const groupLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : `Dans ${days} jours`
                  const showGroup = i === 0 || getDaysLabel(daysUntil(upcomingTimeline[i - 1].declarationDeadline)) !== getDaysLabel(days)
                  return (
                    <div key={d.id}>
                      {showGroup && (
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                            isToday ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30' :
                            isTomorrow ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' :
                            'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {isToday ? <Target className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {groupLabel}
                          </span>
                        </div>
                      )}
                      <div className="ml-4 pl-6 pb-1">
                        <button
                          onClick={() => setDetailDeadline(d)}
                          className="w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-slate-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${tc.bg} ${tc.text}`}>
                                {d.taxTypeCode}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.taxTypeName}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Declaration : {fmtDate(d.declarationDeadline)}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              days <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              days <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {label}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════ DETAIL PANEL ═══════════════ */}
      {detailDeadline && (
        <DetailPanel deadline={detailDeadline} onClose={() => setDetailDeadline(null)} />
      )}

      {/* ═══════════════ CREATE MODAL ═══════════════ */}
      {createOpen && <CreateDeadlineModal onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

function KpiCard({
  icon, iconBg, iconColor, label, value, sub, accent, onClick,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: React.ReactNode; sub: string; accent?: string; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md text-left ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className={`mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight ${
            accent === 'red' ? 'text-red-600 dark:text-red-400' :
            accent === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
            'text-slate-900 dark:text-slate-100'
          }`}>
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
    </button>
  )
}

/* ── Detail Panel (slide-in from right) ── */
function DetailPanel({ deadline, onClose }: { deadline: Deadline; onClose: () => void }) {
  const toast = useToast()
  const days = daysUntil(deadline.declarationDeadline)
  const status = getDeadlineStatus(deadline)
  const tc = getTaxColor(deadline.taxTypeCode)
  const paymentDays = daysUntil(deadline.paymentDeadline)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md animate-slide-in-right bg-white shadow-2xl dark:bg-slate-800 dark:border-l dark:border-slate-700/50">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tc.bg} ${tc.text}`}>
                {deadline.taxTypeCode}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{deadline.taxTypeName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{deadline.period}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Statut</p>
              <div className="mt-1.5">
                <Badge tone={statusBadgeTone(status)}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(status)}`} />
                  {statusLabel(status)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Declaration</p>
                <p className={`mt-1 text-sm font-medium ${days < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {fmtDate(deadline.declarationDeadline)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{getDaysLabel(days)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Paiement</p>
                <p className={`mt-1 text-sm font-medium ${paymentDays < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {fmtDate(deadline.paymentDeadline)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{getDaysLabel(paymentDays)}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Periode fiscale</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{deadline.period}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Type d'impot</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-[10px] font-bold ${tc.bg} ${tc.text}`}>
                  {deadline.taxTypeCode}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{deadline.taxTypeName}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Jours restants</p>
              <div className="mt-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  days < 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  days <= 7 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {days < 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                  {days >= 0 && <Clock className="h-3.5 w-3.5" />}
                  {getDaysLabel(days)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Jours jusqu'au paiement</p>
              <div className="mt-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  paymentDays < 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  paymentDays <= 7 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {paymentDays < 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                  {paymentDays >= 0 && <Clock className="h-3.5 w-3.5" />}
                  {getDaysLabel(paymentDays)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200/70 px-6 py-4 dark:border-slate-700/50">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            <Button onClick={() => { toast.info('Modifier'); onClose() }} className="flex-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Skeleton ── */
function DeadlinesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600" />
          <div className="h-4 w-96 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
      <div className="h-[400px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
    </div>
  )
}

/* ── Create modal ── */
function CreateDeadlineModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [period, setPeriod] = useState('')
  const [declarationDeadline, setDeclarationDeadline] = useState('')
  const [paymentDeadline, setPaymentDeadline] = useState('')

  const { data: taxTypes } = useQuery({
    queryKey: ['tax-types'],
    queryFn: () => apiGet<TaxType[]>('/tax-types'),
  })

  const create = useMutation({
    mutationFn: () =>
      apiPost('/deadlines', { taxTypeCode, period, declarationDeadline, paymentDeadline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      onClose()
      toast.success('Echeance creee')
    },
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title="Nouvelle echeance" subtitle="Date configurable, jamais codee en dur.">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate() }}
        className="space-y-4"
      >
        {create.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrorMessage(create.error)}
          </div>
        )}
        <Field label="Impot">
          <Select value={taxTypeCode} onChange={(e) => setTaxTypeCode(e.target.value)}>
            <option value="">Selectionner</option>
            {(taxTypes ?? []).map((t) => (
              <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Periode (ex : 2026-08)">
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Limite de declaration">
            <Input type="date" value={declarationDeadline} onChange={(e) => setDeclarationDeadline(e.target.value)} />
          </Field>
          <Field label="Limite de paiement">
            <Input type="date" value={paymentDeadline} onChange={(e) => setPaymentDeadline(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={create.isPending || !taxTypeCode || !period || !declarationDeadline || !paymentDeadline}>
            {create.isPending ? 'Creation...' : 'Creer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
