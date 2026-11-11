import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useDropdown } from '../lib/useDropdown'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
  Trash2,
  Eye,
  Plus,
  ClipboardList,
  CreditCard,
  Activity,
  Zap,
  FileDown,
  RotateCcw,
  AlertTriangle,
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
import { apiErrorMessage, apiGet } from '../lib/api'
import { exportTable, type ReportFormat } from '../lib/exporters'
import type {
  Page, Payment, TaxDebt, Declaration, TaxpayerSummary,
  ReportStats, AuditLog, DeclarationReportStats, DebtReportStats,
} from '../types'
import { Button, Card, EmptyState, Field, Modal, Select, StatusBadge } from '../components/ui'
import { StepBar, StepLabels } from '../components/Stepper'
import { useI18n } from '../lib/i18n'
import { useLocaleFormatters } from '../lib/format'
import { useToast } from '../components/Toast'
import { useTheme } from '../lib/theme'

/* ═══════════════════════════ Types ═══════════════════════════ */

interface ReportCardDef {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  header: string
  available: boolean
  formats: string[]
  dataCount?: number
  maxData?: number
}

interface RecentReport {
  id: string
  name: string
  type: string
  format: 'PDF' | 'Excel' | 'CSV'
  period: string
  generatedAt: string
  generatedBy: string
  size: string
  status: 'available' | 'generating' | 'error'
}

/* ═══════════════════════════ Constantes ═══════════════════════════ */

const PERIOD_OPTIONS = [
  { id: 'year', labelKey: 'reports.page.period.year' },
  { id: 'quarter', labelKey: 'reports.page.period.quarter' },
  { id: 'month', labelKey: 'reports.page.period.month' },
  { id: '6months', labelKey: 'reports.page.period.6months' },
  { id: 'all', labelKey: 'reports.page.period.all' },
]

const REPORT_CATEGORIES = [
  { id: 'all', labelKey: 'reports.page.cat.all', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'recouvrement', labelKey: 'reports.page.cat.collection', icon: <Wallet className="h-4 w-4" /> },
  { id: 'paiements', labelKey: 'reports.page.cat.payments', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'quittances', labelKey: 'reports.page.cat.receipts', icon: <FileText className="h-4 w-4" /> },
  { id: 'declarations', labelKey: 'reports.page.cat.declarations', icon: <FileText className="h-4 w-4" /> },
  { id: 'contribuables', labelKey: 'reports.page.cat.taxpayers', icon: <Users className="h-4 w-4" /> },
  { id: 'activite', labelKey: 'reports.page.cat.activity', icon: <Activity className="h-4 w-4" /> },
]

const FORMAT_FILTERS = [
  { id: 'all', labelKey: 'reports.page.format.all' },
  { id: 'PDF', labelKey: 'PDF' },
  { id: 'Excel', labelKey: 'Excel' },
  { id: 'CSV', labelKey: 'CSV' },
]

const methodLabels: Record<string, string> = {
  CASH: 'reports.page.method.CASH',
  BANK_TRANSFER: 'reports.page.method.BANK_TRANSFER',
  CHECK: 'reports.page.method.CHECK',
  MOBILE_MONEY: 'reports.page.method.MOBILE_MONEY',
}

/* ═══════════════════════════ Palette & Chart Colors ═══════════════════════════ */

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
  }), [dark])
}



/* ═══════════════════════════ Helpers ═══════════════════════════ */

function formatIcon(fmt: string) {
  switch (fmt) {
    case 'PDF': return <FileText className="h-3.5 w-3.5" />
    case 'Excel': return <FileSpreadsheet className="h-3.5 w-3.5" />
    case 'CSV': return <BarChart3 className="h-3.5 w-3.5" />
    default: return <FileText className="h-3.5 w-3.5" />
  }
}

function formatBadgeColor(fmt: string) {
  switch (fmt) {
    case 'PDF': return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    case 'Excel': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'CSV': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
  }
}

/* ═══════════════════════════ Rapports disponibles ═══════════════════════════ */

function getReportCards(): ReportCardDef[] {
  return [
    {
      id: 'recouvrement',
      titleKey: 'reports.page.card.recouvrement.title',
      descriptionKey: 'reports.page.card.recouvrement.desc',
      icon: <Wallet className="h-6 w-6" />,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      header: 'bg-brand-600',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'paiements',
      titleKey: 'reports.page.card.paiements.title',
      descriptionKey: 'reports.page.card.paiements.desc',
      icon: <CreditCard className="h-6 w-6" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      header: 'bg-emerald-600',
      available: true,
      formats: ['PDF', 'Excel'],
    },
    {
      id: 'quittances',
      titleKey: 'reports.page.card.quittances.title',
      descriptionKey: 'reports.page.card.quittances.desc',
      icon: <FileText className="h-6 w-6" />,
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
      header: 'bg-rose-600',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'declarations',
      titleKey: 'reports.page.card.declarations.title',
      descriptionKey: 'reports.page.card.declarations.desc',
      icon: <ClipboardList className="h-6 w-6" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      header: 'bg-blue-600',
      available: true,
      formats: ['PDF', 'Excel', 'CSV'],
    },
    {
      id: 'contribuables',
      titleKey: 'reports.page.card.contribuables.title',
      descriptionKey: 'reports.page.card.contribuables.desc',
      icon: <Users className="h-6 w-6" />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      header: 'bg-amber-600',
      available: true,
      formats: ['PDF', 'Excel'],
    },
    {
      id: 'creances',
      titleKey: 'reports.page.card.creances.title',
      descriptionKey: 'reports.page.card.creances.desc',
      icon: <TrendingUp className="h-6 w-6" />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      header: 'bg-rose-600',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'activite',
      titleKey: 'reports.page.card.activite.title',
      descriptionKey: 'reports.page.card.activite.desc',
      icon: <Activity className="h-6 w-6" />,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      header: 'bg-sky-600',
      available: true,
      formats: ['PDF'],
    },
  ]
}

/* Format proposé par défaut selon les formats affichés sur la carte du rapport. */
function defaultFormatFor(reportId: string): ReportFormat {
  const card = getReportCards().find((r) => r.id === reportId)
  if (!card) return 'CSV'
  return (card.formats.includes('CSV') ? 'CSV' : card.formats[0] ?? 'CSV') as ReportFormat
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function Reports() {
  const { t } = useI18n()
  const { fmtMGA, fmtNumber } = useLocaleFormatters()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [periodOpen, setPeriodOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('year')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [genReportType, setGenReportType] = useState<string | null>(null)
  const [genFormat, setGenFormat] = useState('CSV')
  const [genPeriod, setGenPeriod] = useState('year')
  const [genStatusFilter, setGenStatusFilter] = useState('')
  const [genMethodFilter, setGenMethodFilter] = useState('')
  const [previewData, setPreviewData] = useState<{ title: string; headers: string[]; rows: (string | number)[][] } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    // La suppression d'un rapport récent est persistée : elle survit au rechargement.
    try {
      const raw = localStorage.getItem('mnk_reports_deleted')
      const ids: unknown = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(ids) ? ids.filter((v): v is string => typeof v === 'string') : [])
    } catch {
      return new Set<string>()
    }
  })
  const periodRef = useRef<HTMLDivElement>(null)
  const cc = useChartColors()

  const currentPeriod = PERIOD_OPTIONS.find((p) => p.id === selectedPeriod) ?? PERIOD_OPTIONS[0]
  const currentPeriodLabel = t(currentPeriod.labelKey)
  const genPeriodLabel = t(PERIOD_OPTIONS.find((p) => p.id === genPeriod)?.labelKey ?? 'reports.page.period.year')
  const selectedReport = useMemo(() => getReportCards().find((r) => r.id === genReportType) ?? null, [genReportType])
  const genStatusKeyPrefix = genReportType === 'declarations' ? 'declStatus' : genReportType === 'contribuables' ? 'taxpayerStatus' : 'debtStatus'
  const genStatusLabel = genStatusFilter ? t(`reports.page.${genStatusKeyPrefix}.${genStatusFilter}`) : ''

  /* -- Fermer period dropdown au clic exterieur -- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* -- Queries API -- */
  const { data: reportStats, isLoading: loadingStats } = useQuery({
    queryKey: ['report-stats'],
    queryFn: () => apiGet<ReportStats>('/reports/stats'),
  })

  const { data: activity } = useQuery({
    queryKey: ['report-activity'],
    queryFn: () => apiGet<Page<AuditLog>>('/reports/activity?size=50'),
  })

  const { data: debts, isLoading: loadingDebts } = useQuery({
    queryKey: ['report-collection'],
    queryFn: () => apiGet<Page<TaxDebt>>('/reports/collection?size=9999'),
  })

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['report-payments'],
    queryFn: () => apiGet<Page<Payment>>('/reports/payments?size=9999'),
  })

  const { data: declarations, isLoading: loadingDeclarations } = useQuery({
    queryKey: ['report-declarations'],
    queryFn: () => apiGet<Page<Declaration>>('/reports/declarations?size=9999'),
  })

  const { data: taxpayers, isLoading: loadingTaxpayers } = useQuery({
    queryKey: ['report-taxpayers'],
    queryFn: () => apiGet<Page<TaxpayerSummary>>('/reports/taxpayers?size=9999'),
  })

  const { data: receipts } = useQuery({
    queryKey: ['report-receipts'],
    queryFn: () => apiGet<Page<import('../types').Receipt>>('/receipts?size=9999'),
  })

  const { data: declarationReport } = useQuery({
    queryKey: ['report-stats-declarations'],
    queryFn: () => apiGet<DeclarationReportStats>('/reports/stats/declarations'),
  })

  const { data: debtReport } = useQuery({
    queryKey: ['report-stats-debts'],
    queryFn: () => apiGet<DebtReportStats>('/reports/stats/debts'),
  })

  const isLoading = loadingStats || loadingDebts || loadingPayments || loadingDeclarations || loadingTaxpayers

  /* -- KPI stats -- */
  const stats = useMemo(() => {
    if (!reportStats) return {
      totalReports: 6,
      generatedThisMonth: 0,
      lastGeneration: null,
      totalExports: 0,
      totalDebts: 0,
      totalPayments: 0,
      totalDeclarations: 0,
      totalTaxpayers: 0,
      totalCollected: 0,
      totalReceipts: 0,
      validReceipts: 0,
      receiptTotalAmount: 0,
    }
    return {
      totalReports: 7,
      generatedThisMonth: 3,
      lastGeneration: new Date().toISOString(),
      totalExports: debts?.totalElements ?? 0 + (payments?.totalElements ?? 0),
      totalDebts: reportStats.totalDebts,
      totalPayments: reportStats.totalPayments,
      totalDeclarations: reportStats.totalDeclarations,
      totalTaxpayers: reportStats.totalTaxpayers,
      totalCollected: reportStats.totalCollected,
      totalReceipts: reportStats.totalReceipts ?? 0,
      validReceipts: reportStats.validReceipts ?? 0,
      receiptTotalAmount: reportStats.receiptTotalAmount ?? 0,
    }
  }, [reportStats, debts, payments])

  /* -- Sparkline data -- */
  const paymentSparkline = useMemo(() => {
    if (!payments?.content) return []
    const byMonth: Record<string, number> = {}
    payments.content.forEach((p) => {
      const key = (p.paymentDate ?? '').slice(0, 7)
      if (key) byMonth[key] = (byMonth[key] || 0) + Number(p.amount || 0)
    })
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [payments])

  const debtSparkline = useMemo(() => {
    if (!debts?.content) return []
    const byMonth: Record<string, number> = {}
    debts.content.forEach((d) => {
      const key = (d.dueDate ?? '').slice(0, 7)
      if (key) byMonth[key] = (byMonth[key] || 0) + Number(d.totalAmount || 0)
    })
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [debts])

  const declSparkline = useMemo(() => {
    if (!declarations?.content) return []
    const byMonth: Record<string, number> = {}
    declarations.content.forEach((d) => {
      const key = d.period?.slice(0, 7) ?? ''
      if (key) byMonth[key] = (byMonth[key] || 0) + 1
    })
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [declarations])

  /* -- Chart data -- */
  const debtByStatus = useMemo(() => {
    if (!debts?.content) return []
    const counts: Record<string, number> = {}
    debts.content.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [debts])

  const declByStatus = useMemo(() => {
    if (!declarations?.content) return []
    const counts: Record<string, number> = {}
    declarations.content.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [declarations])

  const paymentMonthly = useMemo(() => {
    if (!payments?.content) return []
    const byMonth: Record<string, number> = {}
    payments.content.forEach((p) => {
      const key = (p.paymentDate ?? '').slice(0, 7)
      if (key) byMonth[key] = (byMonth[key] || 0) + Number(p.amount || 0)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month: month.slice(5), amount }))
  }, [payments])

  /* -- Rapports filtres -- */
  const reportCards = useMemo(() => {
    const dataCounts: Record<string, number> = {
      recouvrement: debts?.totalElements ?? 0,
      paiements: payments?.totalElements ?? 0,
      quittances: receipts?.totalElements ?? 0,
      declarations: declarations?.totalElements ?? 0,
      contribuables: taxpayers?.totalElements ?? 0,
      creances: debts?.totalElements ?? 0,
      activite: activity?.totalElements ?? 0,
    }
    let cards = getReportCards().map((c) => ({
      ...c,
      dataCount: dataCounts[c.id] ?? 0,
      maxData: Math.max(...Object.values(dataCounts), 1),
    }))

    if (activeCategory !== 'all') {
      cards = cards.filter((c) => c.id === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      cards = cards.filter(
        (c) => t(c.titleKey).toLowerCase().includes(q) || t(c.descriptionKey).toLowerCase().includes(q),
      )
    }
    return cards
  }, [activeCategory, search, debts, payments, receipts, declarations, taxpayers, activity, t])

  /* -- Rapports recents (donnees reelles) -- */
  const recentReports = useMemo(() => {
    const reports: RecentReport[] = []

    if (debts?.content) {
      reports.push({
        id: 'debts',
        name: t('reports.page.recent.debtsName', { count: debts.totalElements }),
        type: 'recouvrement',
        format: 'CSV',
        period: t('reports.page.period.allPeriods'),
        generatedAt: new Date().toISOString(),
        generatedBy: t('reports.page.generatedBy'),
        size: t('reports.page.lines', { count: debts.totalElements }),
        status: 'available',
      })
    }

    if (payments?.content) {
      reports.push({
        id: 'payments',
        name: t('reports.page.recent.paymentsName', { count: payments.totalElements }),
        type: 'paiements',
        format: 'CSV',
        period: t('reports.page.period.allPeriods'),
        generatedAt: new Date().toISOString(),
        generatedBy: t('reports.page.generatedBy'),
        size: t('reports.page.lines', { count: payments.totalElements }),
        status: 'available',
      })
    }

    if (declarations?.content) {
      reports.push({
        id: 'declarations',
        name: t('reports.page.recent.declarationsName', { count: declarations.totalElements }),
        type: 'declarations',
        format: 'CSV',
        period: t('reports.page.period.allPeriods'),
        generatedAt: new Date().toISOString(),
        generatedBy: t('reports.page.generatedBy'),
        size: t('reports.page.lines', { count: declarations.totalElements }),
        status: 'available',
      })
    }

    if (taxpayers?.content) {
      reports.push({
        id: 'taxpayers',
        name: t('reports.page.recent.taxpayersName', { count: taxpayers.totalElements }),
        type: 'contribuables',
        format: 'Excel',
        period: t('reports.page.period.allPeriods'),
        generatedAt: new Date().toISOString(),
        generatedBy: t('reports.page.generatedBy'),
        size: t('reports.page.lines', { count: taxpayers.totalElements }),
        status: 'available',
      })
    }

    if (receipts?.content) {
      reports.push({
        id: 'receipts',
        name: t('reports.page.recent.receiptsName', { count: receipts.totalElements }),
        type: 'quittances',
        format: 'CSV',
        period: t('reports.page.period.allPeriods'),
        generatedAt: new Date().toISOString(),
        generatedBy: t('reports.page.generatedBy'),
        size: t('reports.page.lines', { count: receipts.totalElements }),
        status: 'available',
      })
    }

    let filtered = reports
    if (formatFilter !== 'all') {
      filtered = filtered.filter((r) => r.format === formatFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
      )
    }
    return filtered.filter((r) => !deletedIds.has(r.id))
  }, [debts, payments, declarations, taxpayers, receipts, formatFilter, search, deletedIds, t])

  /* -- Mutations export -- */
  const exportDebts = useMutation({
    mutationFn: async (opts?: { status?: string; format?: ReportFormat }) => {
      const params = new URLSearchParams({ size: '9999' })
      if (opts?.status) params.set('status', opts.status)
      const rows = await apiGet<Page<TaxDebt>>(`/reports/collection?${params}`)
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_recouvrement_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.recouvrement.title'),
        [
          t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
          t('reports.page.col.tax'), t('reports.page.col.period'), t('reports.page.col.total'),
          t('reports.page.col.paid'), t('reports.page.col.balance'), t('reports.page.col.dueDate'),
          t('reports.page.col.status'),
        ],
        rows.content.map((d) => [
          d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period,
          d.totalAmount, d.paidAmount, d.balance, d.dueDate, d.status,
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportPayments = useMutation({
    mutationFn: async (opts?: { from?: string; to?: string; format?: ReportFormat }) => {
      const params = new URLSearchParams({ size: '9999' })
      if (opts?.from) params.set('from', opts.from)
      if (opts?.to) params.set('to', opts.to)
      const rows = await apiGet<Page<Payment>>(`/reports/payments?${params}`)
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_paiements_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.paiements.title'),
        [
          t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
          t('reports.page.col.date'), t('reports.page.col.amount'), t('reports.page.col.method'),
          t('reports.page.col.allocated'), t('reports.page.col.receipt'),
        ],
        rows.content.map((p) => [
          p.reference, p.nif, p.taxpayerName, p.paymentDate, p.amount,
          methodLabels[p.method] ? t(methodLabels[p.method]) : p.method, p.allocatedAmount, p.receiptReference ?? '',
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportDeclarations = useMutation({
    mutationFn: async (opts?: { status?: string; format?: ReportFormat }) => {
      const params = new URLSearchParams({ size: '9999' })
      if (opts?.status) params.set('status', opts.status)
      const rows = await apiGet<Page<Declaration>>(`/reports/declarations?${params}`)
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_declarations_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.declarations.title'),
        [
          t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
          t('reports.page.col.tax'), t('reports.page.col.period'), t('reports.page.money.declared'),
          t('reports.page.col.calculated'), t('reports.page.col.paid'), t('reports.page.col.remaining'),
          t('reports.page.col.status'),
        ],
        rows.content.map((d) => [
          d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period,
          d.declaredAmount, d.calculatedTax, d.montantPaye ?? 0, d.resteAPayer ?? 0, d.status,
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportTaxpayers = useMutation({
    mutationFn: async (opts?: { status?: string; format?: ReportFormat }) => {
      const params = new URLSearchParams({ size: '9999' })
      if (opts?.status) params.set('status', opts.status)
      const rows = await apiGet<Page<TaxpayerSummary>>(`/reports/taxpayers?${params}`)
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_contribuables_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.contribuables.title'),
        [
          t('reports.page.col.nif'), t('reports.page.col.name'), t('reports.page.col.businessName'),
          t('reports.page.col.type'), t('reports.page.col.phone'), t('reports.page.col.email'),
          t('reports.page.col.status'), t('reports.page.col.taxCenter'), t('reports.page.col.regime'),
          t('reports.page.col.createdAt'),
        ],
        rows.content.map((t) => [
          t.nif, t.name, t.businessName ?? '', t.type, t.phone ?? '', t.email ?? '',
          t.status, t.taxCenterCode ?? '', t.taxRegimeCode ?? '', t.createdAt,
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportActivity = useMutation({
    mutationFn: async (opts?: { format?: ReportFormat }) => {
      const rows = await apiGet<Page<AuditLog>>('/reports/activity?size=9999')
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_activite_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.activite.title'),
        [
          t('reports.page.col.date'), t('reports.page.col.user'), t('reports.page.col.action'),
          t('reports.page.col.entityType'), t('reports.page.col.id'), t('reports.page.col.ip'),
        ],
        rows.content.map((a) => [
          a.createdAt, a.username, a.action, a.entityType, a.entityId ?? '', a.ipAddress ?? '',
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportReceipts = useMutation({
    mutationFn: async (opts?: { format?: ReportFormat }) => {
      const rows = await apiGet<Page<import('../types').Receipt>>('/receipts?size=9999')
      exportTable(
        opts?.format ?? 'CSV',
        `rapport_quittances_${new Date().toISOString().slice(0, 10)}`,
        t('reports.page.card.quittances.title'),
        [
          t('reports.page.col.number'), t('reports.page.col.reference'), t('reports.page.col.taxpayer'),
          t('reports.page.col.nif'), t('reports.page.col.tax'), t('reports.page.col.period'),
          t('reports.page.col.amount'), t('reports.page.col.method'), t('reports.page.col.status'),
          t('reports.page.col.issuedAt'),
        ],
        rows.content.map((r) => [
          r.receiptNumber, r.reference, r.taxpayerName, r.nif, r.taxTypeCode,
          r.period, r.amount, r.method, r.status, r.issuedAt,
        ]),
      )
    },
    onSuccess: () => toast.success(t('toast.exportDone')),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  /* -- Handlers -- */
  const periodToDateRange = useCallback((periodId: string): { from?: string; to?: string } => {
    const now = new Date()
    const to = now.toISOString().slice(0, 10)
    if (periodId === 'all') return { to }
    const months = periodId === 'month' ? 1 : periodId === 'quarter' ? 3 : periodId === 'year' ? 12 : periodId === '6months' ? 6 : 12
    const from = new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString().slice(0, 10)
    return { from, to }
  }, [])

  const handleExport = useCallback((reportId: string, filters?: { status?: string; from?: string; to?: string }, format?: ReportFormat) => {
    const fmt = format ?? defaultFormatFor(reportId)
    switch (reportId) {
      case 'recouvrement': exportDebts.mutate({ status: filters?.status, format: fmt }); break
      case 'paiements': exportPayments.mutate({ from: filters?.from, to: filters?.to, format: fmt }); break
      case 'quittances': exportReceipts.mutate({ format: fmt }); break
      case 'declarations': exportDeclarations.mutate({ status: filters?.status, format: fmt }); break
      case 'contribuables': exportTaxpayers.mutate({ status: filters?.status, format: fmt }); break
      case 'creances': exportDebts.mutate({ status: filters?.status, format: fmt }); break
      case 'activite': exportActivity.mutate({ format: fmt }); break
      default: toast.error(t('reports.page.toast.exportUnavailable'))
    }
  }, [exportDebts, exportPayments, exportReceipts, exportDeclarations, exportTaxpayers, exportActivity, toast, t])

  const handleGenerate = useCallback((reportId: string) => {
    toast.success(t('reports.page.toast.generating'))
    setTimeout(() => {
      handleExport(reportId)
    }, 500)
  }, [handleExport, toast, t])

  /* -- Wizard handlers -- */
  const resetWizard = useCallback(() => {
    setGenerateModalOpen(false)
    setGenStep(0)
    setGenReportType(null)
    setGenFormat('CSV')
    setGenPeriod('year')
    setGenStatusFilter('')
    setGenMethodFilter('')
  }, [])

  const handleWizardSelectType = useCallback((reportId: string) => {
    setGenReportType(reportId)
    const card = getReportCards().find((r) => r.id === reportId)
    setGenFormat(card?.formats.includes('CSV') ? 'CSV' : card?.formats[0] ?? 'CSV')
    setGenStep(1)
  }, [])

  const handleWizardGenerate = useCallback(() => {
    if (!genReportType) return
    const { from, to } = periodToDateRange(genPeriod)
    const filters: { status?: string; from?: string; to?: string } = { from, to }
    if (genStatusFilter) filters.status = genStatusFilter
    setGenerateModalOpen(false)
    toast.success(t('toast.exportDone'))
    handleExport(genReportType, filters, genFormat as ReportFormat)
    resetWizard()
  }, [genReportType, genPeriod, genStatusFilter, handleExport, periodToDateRange, resetWizard, toast, t])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['report-stats'] })
    queryClient.invalidateQueries({ queryKey: ['report-stats-declarations'] })
    queryClient.invalidateQueries({ queryKey: ['report-stats-debts'] })
    queryClient.invalidateQueries({ queryKey: ['report-collection'] })
    queryClient.invalidateQueries({ queryKey: ['report-payments'] })
    queryClient.invalidateQueries({ queryKey: ['report-declarations'] })
    queryClient.invalidateQueries({ queryKey: ['report-taxpayers'] })
    toast.success(t('toast.saveSuccess'))
  }, [queryClient, toast, t])

  const handlePreview = useCallback((reportId: string) => {
    switch (reportId) {
      case 'recouvrement':
      case 'creances': {
        const data = debts?.content ?? []
        setPreviewData({
          title: t('reports.page.card.recouvrement.title'),
          headers: [
            t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
            t('reports.page.col.tax'), t('reports.page.col.period'), t('reports.page.col.total'),
            t('reports.page.col.paid'), t('reports.page.col.balance'), t('reports.page.col.status'),
          ],
          rows: data.slice(0, 50).map((d) => [d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period, d.totalAmount, d.paidAmount, d.balance, d.status]),
        })
        break
      }
      case 'paiements': {
        const data = payments?.content ?? []
        setPreviewData({
          title: t('reports.page.card.paiements.title'),
          headers: [
            t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
            t('reports.page.col.date'), t('reports.page.col.amount'), t('reports.page.col.method'),
            t('reports.page.col.status'),
          ],
          rows: data.slice(0, 50).map((p) => [p.reference, p.nif, p.taxpayerName, p.paymentDate, p.amount, methodLabels[p.method] ? t(methodLabels[p.method]) : p.method, p.status]),
        })
        break
      }
      case 'quittances': {
        const data = receipts?.content ?? []
        setPreviewData({
          title: t('reports.page.card.quittances.title'),
          headers: [
            t('reports.page.col.number'), t('reports.page.col.reference'), t('reports.page.col.taxpayer'),
            t('reports.page.col.nif'), t('reports.page.col.tax'), t('reports.page.col.period'),
            t('reports.page.col.amount'), t('reports.page.col.status'),
          ],
          rows: data.slice(0, 50).map((r) => [r.receiptNumber, r.reference, r.taxpayerName, r.nif, r.taxTypeCode, r.period, r.amount, r.status]),
        })
        break
      }
      case 'declarations': {
        const data = declarations?.content ?? []
        setPreviewData({
          title: t('reports.page.card.declarations.title'),
          headers: [
            t('reports.page.col.reference'), t('reports.page.col.nif'), t('reports.page.col.taxpayer'),
            t('reports.page.col.tax'), t('reports.page.col.period'), t('reports.page.col.declared'),
            t('reports.page.col.calculated'), t('reports.page.col.status'),
          ],
          rows: data.slice(0, 50).map((d) => [d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period, d.declaredAmount, d.calculatedTax ?? 0, d.status]),
        })
        break
      }
      case 'contribuables': {
        const data = taxpayers?.content ?? []
        setPreviewData({
          title: t('reports.page.card.contribuables.title'),
          headers: [
            t('reports.page.col.nif'), t('reports.page.col.name'), t('reports.page.col.type'),
            t('reports.page.col.phone'), t('reports.page.col.email'), t('reports.page.col.status'),
          ],
          rows: data.slice(0, 50).map((t) => [t.nif, t.name, t.type, t.phone ?? '', t.email ?? '', t.status]),
        })
        break
      }
      case 'activite': {
        const data = activity?.content ?? []
        setPreviewData({
          title: t('reports.page.card.activite.title'),
          headers: [
            t('reports.page.col.date'), t('reports.page.col.user'), t('reports.page.col.action'),
            t('reports.page.col.entityType'), t('reports.page.col.id'),
          ],
          rows: data.slice(0, 50).map((a) => [a.createdAt, a.username, a.action, a.entityType, a.entityId ?? '']),
        })
        break
      }
      default:
        toast.info(t('reports.page.toast.previewUnavailable'))
    }
  }, [debts, payments, declarations, taxpayers, receipts, activity, toast, t])

  const handleRegenerate = useCallback((reportId: string) => {
    queryClient.invalidateQueries({ queryKey: ['report-collection'] })
    queryClient.invalidateQueries({ queryKey: ['report-payments'] })
    queryClient.invalidateQueries({ queryKey: ['report-declarations'] })
    queryClient.invalidateQueries({ queryKey: ['report-taxpayers'] })
    queryClient.invalidateQueries({ queryKey: ['report-receipts'] })
    toast.success(t('reports.page.toast.regenerated'))
    setTimeout(() => handleExport(reportId), 300)
  }, [queryClient, handleExport, toast, t])

  const handleDelete = useCallback((reportId: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev).add(reportId)
      try {
        localStorage.setItem('mnk_reports_deleted', JSON.stringify([...next]))
      } catch { /* quota / navigation privée */ }
      return next
    })
    setDeleteConfirm(null)
    toast.success(t('reports.page.toast.deleted'))
  }, [toast, t])

  /* -- Skeleton -- */
  if (isLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="fx-page space-y-6">
      {/* === 1. HEADER === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            {t('reports.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Selecteur de periode - Segmented Control */}
          <div className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800/50">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedPeriod === opt.id
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* Mobile: dropdown */}
          <div className="relative sm:hidden" ref={periodRef}>
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {currentPeriodLabel}
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            {periodOpen && (
              <div className="absolute right-0 z-[60] mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div className="p-1.5">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSelectedPeriod(opt.id); setPeriodOpen(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        selectedPeriod === opt.id
                          ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`flex h-2 w-2 shrink-0 rounded-full ${selectedPeriod === opt.id ? 'bg-violet-500' : 'bg-slate-300'}`} />
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actualiser */}
          <Button variant="secondary" size="md" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>

          {/* Generer un rapport */}
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30"
          >
            <span className="absolute inset-0 bg-brand-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Plus className="relative h-4 w-4" />
            <span className="relative">{t('reports.generate')}</span>
          </button>
        </div>
      </div>

      {/* === 2. STATISTIQUES === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label={t('reports.page.kpi.reports')}
          value={stats.totalReports}
          sub={t('reports.page.kpi.reportsSub')}
          sparkline={[3, 5, 4, 7, 6, 8, 7]}
          sparkColor={C.violet}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label={t('reports.page.kpi.debts')}
          value={fmtNumber(stats.totalDebts)}
          sub={t('reports.page.kpi.debtsSub', { payments: fmtNumber(stats.totalPayments) })}
          delta={stats.totalCollected > 0 ? t('reports.page.kpi.collected', { amount: fmtMGA(stats.totalCollected) }) : undefined}
          deltaTone="up"
          sparkline={debtSparkline}
          sparkColor={C.emerald}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label={t('reports.page.kpi.taxpayers')}
          value={fmtNumber(stats.totalTaxpayers)}
          sub={t('reports.page.kpi.taxpayersSub', { declarations: fmtNumber(stats.totalDeclarations) })}
          sparkline={declSparkline}
          sparkColor={C.blue}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
          label={t('reports.page.kpi.receipts')}
          value={fmtNumber(stats.totalReceipts)}
          sub={t('reports.page.kpi.receiptsSub', { count: fmtNumber(stats.validReceipts) })}
          delta={stats.receiptTotalAmount > 0 ? t('reports.page.kpi.receiptsTotal', { amount: fmtMGA(stats.receiptTotalAmount) }) : undefined}
          deltaTone="up"
          sparkline={[2, 4, 3, 5, 4, 6, 5]}
          sparkColor={C.pink}
        />
        <StatCard
          icon={<Download className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label={t('reports.page.kpi.data')}
          value={fmtNumber((debts?.totalElements ?? 0) + (payments?.totalElements ?? 0) + (receipts?.totalElements ?? 0))}
          sub={t('reports.page.kpi.dataSub')}
          delta="+ CSV / Excel"
          deltaTone="up"
          sparkline={paymentSparkline}
          sparkColor={C.orange}
        />
      </div>

      {/* === 2.5. GRAPHIQUES ANALYTIQUES === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.12s' }}>
        {/* Donut Créances par statut */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.page.chart.debtsByStatus')}</h3>
          {debtByStatus.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={debtByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {debtByStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...cc.tooltip, fontSize: 12 }}
                      formatter={(v) => [fmtNumber(Number(v ?? 0)), t('reports.page.chart.debts')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 space-y-1.5">
                {debtByStatus.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate text-slate-600 dark:text-slate-400">{entry.name}</span>
                    <span className="ml-auto font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmtNumber(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('common.noData')}</p>
          )}
        </Card>

        {/* Donut Declarations par statut */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.page.chart.declarationsByStatus')}</h3>
          {declByStatus.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={declByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {declByStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...cc.tooltip, fontSize: 12 }}
                      formatter={(v) => [fmtNumber(Number(v ?? 0)), t('reports.page.chart.declarations')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 space-y-1.5">
                {declByStatus.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[(i + 3) % CHART_COLORS.length] }} />
                    <span className="truncate text-slate-600 dark:text-slate-400">{entry.name}</span>
                    <span className="ml-auto font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmtNumber(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('common.noData')}</p>
          )}
        </Card>

        {/* Area Chart Paiements mensuels */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.page.chart.monthlyPayments')}</h3>
          {paymentMonthly.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={paymentMonthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.violet} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={cc.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: cc.tick }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: cc.tick }} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip
                    contentStyle={{ ...cc.tooltip, fontSize: 12 }}
                    formatter={(v) => [fmtMGA(Number(v ?? 0)), t('reports.page.chart.amount')]}
                  />
                  <Area type="monotone" dataKey="amount" stroke={C.violet} strokeWidth={2} fill="url(#payGrad)" dot={false} activeDot={{ r: 5, fill: C.violet, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('common.noData')}</p>
          )}
        </Card>
      </div>

      {/* === 2bis. SYNTHESE DECLARATIONS & CREANCES === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.18s' }}>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <ClipboardList className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.page.card.declarations.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('reports.page.synth.declSub')}</p>
            </div>
          </div>
          {!declarationReport ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.loading')}</p>
          ) : (
            <div className="space-y-3">
              {/* Barres horizontales animees par statut */}
              <div className="space-y-2.5">
                {[
                  { label: t('reports.page.status.validated'), count: declarationReport.validated, color: 'bg-emerald-500' },
                  { label: t('reports.page.status.submitted'), count: declarationReport.submitted, color: 'bg-blue-500' },
                  { label: t('reports.page.status.underReview'), count: declarationReport.underReview, color: 'bg-amber-500' },
                  { label: t('reports.page.status.rejected'), count: declarationReport.rejected, color: 'bg-rose-500' },
                  { label: t('reports.page.status.draft'), count: declarationReport.draft, color: 'bg-slate-400' },
                  { label: t('reports.page.status.toCorrect'), count: declarationReport.aCorriger, color: 'bg-orange-500' },
                ].filter((s) => s.count > 0).map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmtNumber(s.count)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${s.color} transition-all duration-700 ease-out`}
                        style={{ width: `${declarationReport.total > 0 ? (s.count / declarationReport.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700/50">
                <MoneyRow label={t('reports.page.money.declared')} value={fmtMGA(declarationReport.declaredAmount)} />
                <MoneyRow label={t('reports.page.money.paid')} value={fmtMGA(declarationReport.paidAmount)} tone="text-emerald-600" />
                <MoneyRow label={t('reports.page.money.remaining')} value={fmtMGA(declarationReport.remaining)} tone="text-rose-600" />
              </div>
              <RateBar
                label={t('reports.page.rate.payment')}
                percent={
                  declarationReport.declaredAmount > 0
                    ? (declarationReport.paidAmount / declarationReport.declaredAmount) * 100
                    : 0
                }
                color="bg-emerald-500"
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.page.card.creances.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('reports.page.synth.debtSub')}</p>
            </div>
          </div>
          {!debtReport ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.loading')}</p>
          ) : (
            <div className="space-y-3">
              {/* Barres horizontales animees par statut */}
              <div className="space-y-2.5">
                {[
                  { label: t('reports.page.status.paid'), count: debtReport.paid, color: 'bg-emerald-500' },
                  { label: t('reports.page.status.inCollection'), count: debtReport.inCollection, color: 'bg-violet-500' },
                  { label: t('reports.page.status.overdue'), count: debtReport.overdue, color: 'bg-rose-500' },
                ].filter((s) => s.count > 0).map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmtNumber(s.count)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${s.color} transition-all duration-700 ease-out`}
                        style={{ width: `${debtReport.total > 0 ? (s.count / debtReport.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700/50">
                <MoneyRow label={t('reports.page.money.total')} value={fmtMGA(debtReport.totalAmount)} />
                <MoneyRow label={t('reports.page.money.collected')} value={fmtMGA(debtReport.collected)} tone="text-emerald-600" />
                <MoneyRow label={t('reports.page.money.outstanding')} value={fmtMGA(debtReport.outstanding)} tone="text-rose-600" />
              </div>
              <RateBar
                label={t('reports.page.rate.collection')}
                percent={debtReport.collectionRate}
                color="bg-brand-500"
              />
            </div>
          )}
        </Card>
      </div>

      {/* === 3. RAPPORTS DISPONIBLES === */}
      <div className="animate-fade-in" style={{ animationDelay: '0.24s' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t('reports.available')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t('reports.page.availableCount', { count: reportCards.length })}
            </p>
          </div>
          {/* Filtres categorie */}
          <div className="flex flex-wrap items-center gap-1.5">
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeCategory === cat.id
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {cat.icon}
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {reportCards.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10" />}
            title={t('reports.page.empty.title')}
            subtitle={search ? t('reports.page.empty.search', { q: search }) : t('reports.page.empty.category')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((report) => (
              <ReportCardComponent
                key={report.id}
                report={report}
                onExport={() => handleExport(report.id)}
                onGenerate={() => handleGenerate(report.id)}
                onPreview={() => handlePreview(report.id)}
                onRegenerate={() => handleRegenerate(report.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* === 4. RAPPORTS RECENTS === */}
      <div className="animate-fade-in" style={{ animationDelay: '0.30s' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t('reports.recent')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t('reports.page.recent.count', { count: recentReports.length })}
            </p>
          </div>
        </div>

        <Card className="overflow-visible">
          {/* Filtres et recherche */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('reports.searchPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300"
              >
                {FORMAT_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.labelKey.startsWith('reports.') ? t(f.labelKey) : f.labelKey}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Liste */}
          {recentReports.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<FolderOpen className="h-10 w-10" />}
                title={t('reports.page.emptyRecent.title')}
                subtitle={t('reports.page.emptyRecent.subtitle')}
              />
              <div className="mt-4 flex justify-center">
                <Button variant="primary" onClick={() => setGenerateModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('reports.generate')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentReports.map((report) => (
                <RecentReportRow
                  key={report.id}
                  report={report}
                  onExport={() => handleExport(report.type, undefined, report.format)}
                  onPreview={() => handlePreview(report.type)}
                  onDelete={() => setDeleteConfirm({ id: report.id, name: report.name })}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          {recentReports.length > 0 && (
            <div className="border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t('reports.page.footerCount', { count: recentReports.length })}
                {search && t('reports.page.footerSearch', { q: search })}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* === 5. MODAL GENERER RAPPORT — Wizard 3 étapes === */}
      <Modal
        open={generateModalOpen}
        onClose={resetWizard}
        title={
          genStep === 0 ? t('reports.page.wizard.title0')
            : genStep === 1 ? t('reports.page.wizard.title1')
              : t('reports.page.wizard.title2')
        }
        subtitle={
          genStep === 0 ? t('reports.page.wizard.sub0')
            : genStep === 1 ? t('reports.page.wizard.sub1')
              : t('reports.page.wizard.sub2')
        }
        wide
      >
        <div className="space-y-5">
          {/* StepBar */}
          <div className="space-y-1.5">
            <StepBar step={genStep} total={3} />
            <StepLabels labels={[t('reports.page.wizard.stepType'), t('reports.page.wizard.stepConfig'), t('reports.page.wizard.stepGenerate')]} step={genStep} />
          </div>

          {/* ── Etape 0 : Selection du type ── */}
          {genStep === 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 animate-fade-in">
              {getReportCards().map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleWizardSelectType(report.id)}
                  className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
                    genReportType === report.id
                      ? 'border-violet-400 bg-violet-50 shadow-md shadow-violet-200/50 dark:border-violet-500 dark:bg-violet-900/20'
                      : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-500'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.iconBg} ${report.iconColor}`}>
                    {report.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t(report.titleKey)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{t(report.descriptionKey)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {report.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${formatBadgeColor(fmt)}`}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Etape 1 : Configuration ── */}
          {genStep === 1 && selectedReport && (
            <div className="space-y-5 animate-fade-in">
              {/* Format */}
              <Field label={t('reports.page.wizard.fileFormat')}>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setGenFormat(fmt)}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                        genFormat === fmt
                          ? 'bg-brand-600 text-white shadow-md shadow-violet-500/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {formatIcon(fmt)}
                      {fmt}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Periode */}
              <Field label={t('reports.page.wizard.period')}>
                <div className="flex flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setGenPeriod(p.id)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                        genPeriod === p.id
                          ? 'bg-brand-600 text-white shadow-md shadow-violet-500/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {t(p.labelKey)}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Filtres conditionnels selon le type de rapport */}
              {(genReportType === 'recouvrement' || genReportType === 'creances') && (
                <Field label={t('reports.page.wizard.status')}>
                  <Select value={genStatusFilter} onChange={(e) => setGenStatusFilter(e.target.value)}>
                    <option value="">{t('reports.page.status.all')}</option>
                    <option value="OVERDUE">{t('reports.page.debtStatus.OVERDUE')}</option>
                    <option value="IN_COLLECTION">{t('reports.page.debtStatus.IN_COLLECTION')}</option>
                    <option value="PARTIALLY_PAID">{t('reports.page.debtStatus.PARTIALLY_PAID')}</option>
                    <option value="PAID">{t('reports.page.debtStatus.PAID')}</option>
                    <option value="DISPUTED">{t('reports.page.debtStatus.DISPUTED')}</option>
                    <option value="SUSPENDED">{t('reports.page.debtStatus.SUSPENDED')}</option>
                    <option value="CLOSED">{t('reports.page.debtStatus.CLOSED')}</option>
                  </Select>
                </Field>
              )}

              {genReportType === 'paiements' && (
                <Field label={t('reports.page.wizard.method')}>
                  <Select value={genMethodFilter} onChange={(e) => setGenMethodFilter(e.target.value)}>
                    <option value="">{t('reports.page.method.all')}</option>
                    <option value="CASH">{t('reports.page.method.CASH')}</option>
                    <option value="BANK_TRANSFER">{t('reports.page.method.BANK_TRANSFER')}</option>
                    <option value="CHECK">{t('reports.page.method.CHECK')}</option>
                    <option value="MOBILE_MONEY">{t('reports.page.method.MOBILE_MONEY')}</option>
                  </Select>
                </Field>
              )}

              {genReportType === 'declarations' && (
                <Field label={t('reports.page.wizard.status')}>
                  <Select value={genStatusFilter} onChange={(e) => setGenStatusFilter(e.target.value)}>
                    <option value="">{t('reports.page.status.all')}</option>
                    <option value="DRAFT">{t('reports.page.declStatus.DRAFT')}</option>
                    <option value="SUBMITTED">{t('reports.page.declStatus.SUBMITTED')}</option>
                    <option value="UNDER_REVIEW">{t('reports.page.declStatus.UNDER_REVIEW')}</option>
                    <option value="VALIDATED">{t('reports.page.declStatus.VALIDATED')}</option>
                    <option value="REJECTED">{t('reports.page.declStatus.REJECTED')}</option>
                    <option value="PAID">{t('reports.page.declStatus.PAID')}</option>
                    <option value="A_CORRIGER">{t('reports.page.declStatus.A_CORRIGER')}</option>
                  </Select>
                </Field>
              )}

              {genReportType === 'contribuables' && (
                <Field label={t('reports.page.wizard.status')}>
                  <Select value={genStatusFilter} onChange={(e) => setGenStatusFilter(e.target.value)}>
                    <option value="">{t('reports.page.status.all')}</option>
                    <option value="ACTIVE">{t('reports.page.taxpayerStatus.ACTIVE')}</option>
                    <option value="INACTIVE">{t('reports.page.taxpayerStatus.INACTIVE')}</option>
                    <option value="SUSPENDED">{t('reports.page.taxpayerStatus.SUSPENDED')}</option>
                  </Select>
                </Field>
              )}

              {/* Recapitulatif rapide */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedReport.iconBg} ${selectedReport.iconColor}`}>
                  {selectedReport.icon}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{t(selectedReport.titleKey)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {genFormat} &middot; {genPeriodLabel}
                    {genStatusFilter && ` · ${t('reports.page.wizard.summaryStatus')}: ${genStatusLabel}`}
                    {genMethodFilter && ` · ${t('reports.page.wizard.summaryMethod')}: ${methodLabels[genMethodFilter] ? t(methodLabels[genMethodFilter]) : genMethodFilter}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Etape 2 : Recapitulatif & Validation ── */}
          {genStep === 2 && selectedReport && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">{t('reports.page.wizard.summaryTitle')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t('reports.page.wizard.summaryType')} : </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{t(selectedReport.titleKey)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t('reports.page.wizard.summaryFormat')} : </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{genFormat}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t('reports.page.wizard.summaryPeriod')} : </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{genPeriodLabel}</span>
                  </div>
                  {genStatusFilter && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('reports.page.wizard.summaryStatus')} : </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{genStatusLabel}</span>
                    </div>
                  )}
                  {genMethodFilter && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('reports.page.wizard.summaryMethod')} : </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{methodLabels[genMethodFilter] ? t(methodLabels[genMethodFilter]) : genMethodFilter}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedReport.formats.map((fmt) => (
                    <span
                      key={fmt}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${genFormat === fmt ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-900/40 dark:text-brand-300' : formatBadgeColor(fmt)}`}
                    >
                      {formatIcon(fmt)}
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
                <Zap className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('reports.page.wizard.notice')}
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
            <div>
              {genStep > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setGenStep(genStep - 1)}>
                  &larr; {t('reports.page.wizard.previous')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {genStep < 2 ? (
                <Button
                  size="sm"
                  onClick={() => setGenStep(genStep + 1)}
                  disabled={genStep === 0 && !genReportType}
                >
                  {t('reports.page.wizard.next')} &rarr;
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => genReportType && handlePreview(genReportType)}>
                    <Eye className="h-4 w-4" />
                    {t('reports.page.wizard.preview')}
                  </Button>
                  <Button size="sm" onClick={handleWizardGenerate}>
                    <Zap className="h-4 w-4" />
                    {t('reports.page.wizard.generate')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* === 6. MODAL APERCU === */}
      <Modal
        open={!!previewData}
        onClose={() => setPreviewData(null)}
        title={previewData?.title ?? ''}
        subtitle={t('reports.page.preview.subtitle', { count: previewData?.rows.length ?? 0 })}
        wide
      >
        {previewData && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <tr>
                  {previewData.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {previewData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* === 7. CONFIRMATION SUPPRESSION === */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('reports.page.delete.title')}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('reports.page.delete.question', { name: deleteConfirm?.name ?? '' })}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {t('reports.page.delete.hint')}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}>
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

/* -- Carte KPI -- */
function StatCard({
  icon, iconBg, iconColor, label, value, sub, delta, deltaTone = 'neutral', sparkline, sparkColor,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: React.ReactNode; sub: string; delta?: string; deltaTone?: 'up' | 'down' | 'neutral'
  sparkline?: number[]; sparkColor?: string
}) {
  return (
    <Card hover className="group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      </div>
      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2 -mb-1 h-10 w-full opacity-60 transition-opacity group-hover:opacity-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline.map((v, i) => ({ v, i }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor || C.violet} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparkColor || C.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor || C.violet}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
            deltaTone === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : deltaTone === 'down' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {deltaTone === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {deltaTone === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500">{sub}</span>
      </div>
    </Card>
  )
}

/* -- Carte de rapport -- */
function ReportCardComponent({
  report, onExport, onGenerate, onPreview, onRegenerate,
}: {
  report: ReportCardDef; onExport: () => void; onGenerate: () => void
  onPreview: () => void; onRegenerate: () => void
}) {
  const { fmtNumber } = useLocaleFormatters()
  const { t } = useI18n()
  const { isOpen: menuOpen, close: closeMenu, triggerProps, dropdownProps } = useDropdown()

  return (
    <Card hover className="group relative flex flex-col overflow-hidden">
      {/* Header colore */}
      <div className={`relative ${report.header} px-5 py-4`}>
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            {report.icon}
          </span>
          <div className="relative">
            <button {...triggerProps}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div {...dropdownProps} className="absolute right-0 z-50 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
                <div className="space-y-0.5">
                  <button
                    onClick={() => { onPreview(); closeMenu() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    {t('reports.preview')}
                  </button>
                  <button
                    onClick={() => { onRegenerate(); closeMenu() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    {t('reports.regenerate')}
                  </button>
                  <button
                    onClick={() => { onExport(); closeMenu() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    {t('common.export')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">{t(report.titleKey)}</h3>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{t(report.descriptionKey)}</p>

        {/* Compteur de donnees + barre de progression */}
        {report.dataCount !== undefined && report.dataCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">{t('reports.page.card.lines', { count: fmtNumber(report.dataCount) })}</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {report.maxData ? Math.round((report.dataCount / report.maxData) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${report.maxData ? (report.dataCount / report.maxData) * 100 : 0}%`,
                  background: `linear-gradient(90deg, ${report.header.includes('violet') ? C.violet : report.header.includes('emerald') ? C.emerald : report.header.includes('rose') ? C.rose : report.header.includes('blue') ? C.blue : report.header.includes('amber') ? C.orange : report.header.includes('sky') ? C.sky : C.pink}, transparent)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Formats */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.formats.map((fmt) => (
            <span
              key={fmt}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${formatBadgeColor(fmt)}`}
            >
              {formatIcon(fmt)}
              {fmt}
            </span>
          ))}
        </div>

        {/* Status */}
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('reports.page.card.available')}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <button
            onClick={onGenerate}
            className="group/btn relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/30"
          >
            <span className="absolute inset-0 bg-brand-500 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100" />
            <Zap className="relative h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
            <span className="relative">{t('reports.page.card.generate')}</span>
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
          >
            <FileDown className="h-3.5 w-3.5" />
            {t('common.export')}
          </button>
        </div>
      </div>
    </Card>
  )
}

/* -- Ligne rapport recent -- */
function RecentReportRow({
  report, onExport, onPreview, onDelete,
}: {
  report: RecentReport; onExport: () => void
  onPreview: () => void; onDelete: () => void
}) {
  const { t } = useI18n()
  const { isOpen: showMenu, close: closeMenu, triggerProps, dropdownProps } = useDropdown()
  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
      {/* Icone format */}
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${formatBadgeColor(report.format)}`}>
        {formatIcon(report.format)}
      </span>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{report.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>{report.period}</span>
          <span>·</span>
          <span>{report.generatedBy}</span>
          <span>·</span>
          <span>{report.size}</span>
        </div>
      </div>

      {/* Badge statut */}
      <span className="hidden shrink-0 sm:inline-flex"><StatusBadge value={report.status} /></span>

      {/* Badge format */}
      <span className={`hidden shrink-0 md:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${formatBadgeColor(report.format)}`}>
        {report.format}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onExport}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
          title={t('reports.download')}
        >
          <Download className="h-4 w-4" />
        </button>
        <div className="relative">
          <button {...triggerProps}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div {...dropdownProps} className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
              <div className="space-y-0.5">
                <button
                  onClick={() => { onPreview(); closeMenu() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  {t('reports.preview')}
                </button>
                <button
                  onClick={() => { onExport(); closeMenu() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  {t('reports.download')}
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { onDelete(); closeMenu() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════ Blocs de synthèse ═══════════════════════════ */

function MoneyRow({ label, value, tone = 'text-slate-900 dark:text-slate-100' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  )
}

function RateBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{value.toFixed(1)} %</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════ Skeleton ═══════════════════════════ */
function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600" />
          <div className="h-4 w-96 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Category filters skeleton */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>

      {/* Report cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      {/* Recent reports skeleton */}
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
    </div>
  )
}
