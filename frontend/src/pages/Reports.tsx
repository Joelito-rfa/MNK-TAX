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
  CheckCircle2,
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
import { apiErrorMessage, apiGet } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import type {
  Page, Payment, TaxDebt, Declaration, TaxpayerSummary,
  ReportStats,
} from '../types'
import { Button, Card, EmptyState, Modal } from '../components/ui'
import { useToast } from '../components/Toast'

/* ═══════════════════════════ Types ═══════════════════════════ */

interface ReportCardDef {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  gradient: string
  available: boolean
  formats: string[]
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
  { id: 'year', label: 'Annee en cours' },
  { id: 'quarter', label: 'Dernier trimestre' },
  { id: 'month', label: 'Dernier mois' },
  { id: '6months', label: '6 derniers mois' },
  { id: 'all', label: "Tout l'historique" },
]

const REPORT_CATEGORIES = [
  { id: 'all', label: 'Tous', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'recouvrement', label: 'Recouvrement', icon: <Wallet className="h-4 w-4" /> },
  { id: 'paiements', label: 'Paiements', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'quittances', label: 'Quittances', icon: <FileText className="h-4 w-4" /> },
  { id: 'declarations', label: 'Declarations', icon: <FileText className="h-4 w-4" /> },
  { id: 'contribuables', label: 'Contribuables', icon: <Users className="h-4 w-4" /> },
  { id: 'activite', label: 'Activite', icon: <Activity className="h-4 w-4" /> },
]

const FORMAT_FILTERS = [
  { id: 'all', label: 'Tous les formats' },
  { id: 'PDF', label: 'PDF' },
  { id: 'Excel', label: 'Excel' },
  { id: 'CSV', label: 'CSV' },
]

const methodLabels: Record<string, string> = {
  CASH: 'Especes',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Cheque',
  MOBILE_MONEY: 'Mobile Money',
}



/* ═══════════════════════════ Helpers ═══════════════════════════ */



function fmtMGA(v: number): string {
  return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(v) + ' MGA'
}

function fmtNumber(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(v)
}

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
      title: 'Rapport de recouvrement',
      description: 'Analyse des creances, montants recouvrés, retards et taux de recouvrement.',
      icon: <Wallet className="h-6 w-6" />,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      gradient: 'from-violet-500 to-violet-600',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'paiements',
      title: 'Rapport des paiements',
      description: 'Historique et analyse des paiements effectués sur la periode selectionnee.',
      icon: <CreditCard className="h-6 w-6" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      gradient: 'from-emerald-500 to-emerald-600',
      available: true,
      formats: ['PDF', 'Excel'],
    },
    {
      id: 'quittances',
      title: 'Rapport des quittances',
      description: 'Registre des quittances émises, vérifiées, annulées et remboursées.',
      icon: <FileText className="h-6 w-6" />,
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
      gradient: 'from-pink-500 to-rose-500',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'declarations',
      title: 'Rapport des declarations',
      description: 'Statistiques des declarations validees, en attente et rejetees.',
      icon: <ClipboardList className="h-6 w-6" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      gradient: 'from-blue-500 to-blue-600',
      available: true,
      formats: ['PDF', 'Excel', 'CSV'],
    },
    {
      id: 'contribuables',
      title: 'Rapport des contribuables',
      description: 'Liste et statistiques des contribuables actifs, nouveaux et inactifs.',
      icon: <Users className="h-6 w-6" />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      gradient: 'from-amber-500 to-amber-600',
      available: true,
      formats: ['PDF', 'Excel'],
    },
    {
      id: 'creances',
      title: 'Rapport des creances fiscales',
      description: 'Analyse des creances restantes, echues et recouvrées.',
      icon: <TrendingUp className="h-6 w-6" />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      gradient: 'from-rose-500 to-rose-600',
      available: true,
      formats: ['PDF', 'CSV'],
    },
    {
      id: 'activite',
      title: "Rapport d'activite",
      description: 'Journal des activites administratives et operations realisees dans le systeme.',
      icon: <Activity className="h-6 w-6" />,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      gradient: 'from-sky-500 to-sky-600',
      available: true,
      formats: ['PDF'],
    },
  ]
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export default function Reports() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [periodOpen, setPeriodOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('year')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{ title: string; headers: string[]; rows: (string | number)[][] } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const periodRef = useRef<HTMLDivElement>(null)

  const currentPeriod = PERIOD_OPTIONS.find((p) => p.id === selectedPeriod) ?? PERIOD_OPTIONS[0]

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

  /* -- Rapports filtres -- */
  const reportCards = useMemo(() => {
    let cards = getReportCards()
    if (activeCategory !== 'all') {
      cards = cards.filter((c) => c.id === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      cards = cards.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
      )
    }
    return cards
  }, [activeCategory, search])

  /* -- Rapports recents (donnees reelles) -- */
  const recentReports = useMemo(() => {
    const reports: RecentReport[] = []

    if (debts?.content) {
      reports.push({
        id: 'debts',
        name: `Rapport de recouvrement -- ${debts.totalElements} creances`,
        type: 'recouvrement',
        format: 'CSV',
        period: 'Toutes les periodes',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Admin Fiscal',
        size: `${debts.totalElements} lignes`,
        status: 'available',
      })
    }

    if (payments?.content) {
      reports.push({
        id: 'payments',
        name: `Rapport des paiements -- ${payments.totalElements} paiements`,
        type: 'paiements',
        format: 'CSV',
        period: 'Toutes les periodes',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Admin Fiscal',
        size: `${payments.totalElements} lignes`,
        status: 'available',
      })
    }

    if (declarations?.content) {
      reports.push({
        id: 'declarations',
        name: `Rapport des declarations -- ${declarations.totalElements} declarations`,
        type: 'declarations',
        format: 'CSV',
        period: 'Toutes les periodes',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Admin Fiscal',
        size: `${declarations.totalElements} lignes`,
        status: 'available',
      })
    }

    if (taxpayers?.content) {
      reports.push({
        id: 'taxpayers',
        name: `Rapport des contribuables -- ${taxpayers.totalElements} contribuables`,
        type: 'contribuables',
        format: 'Excel',
        period: 'Toutes les periodes',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Admin Fiscal',
        size: `${taxpayers.totalElements} lignes`,
        status: 'available',
      })
    }

    if (receipts?.content) {
      reports.push({
        id: 'receipts',
        name: `Rapport des quittances -- ${receipts.totalElements} quittances`,
        type: 'quittances',
        format: 'CSV',
        period: 'Toutes les periodes',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Admin Fiscal',
        size: `${receipts.totalElements} lignes`,
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
  }, [debts, payments, declarations, taxpayers, receipts, formatFilter, search, deletedIds])

  /* -- Mutations export -- */
  const exportDebts = useMutation({
    mutationFn: async () => {
      const rows = await apiGet<Page<TaxDebt>>('/reports/collection?size=9999')
      downloadCsv(
        `rapport_recouvrement_${new Date().toISOString().slice(0, 10)}.csv`,
        ['Reference', 'NIF', 'Contribuable', 'Impot', 'Periode', 'Total', 'Paye', 'Solde', 'Echeance', 'Statut'],
        rows.content.map((d) => [
          d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period,
          d.totalAmount, d.paidAmount, d.balance, d.dueDate, d.status,
        ]),
      )
    },
    onSuccess: () => toast.success('Export recouvrement termine'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportPayments = useMutation({
    mutationFn: async () => {
      const rows = await apiGet<Page<Payment>>('/reports/payments?size=9999')
      downloadCsv(
        `rapport_paiements_${new Date().toISOString().slice(0, 10)}.csv`,
        ['Reference', 'NIF', 'Contribuable', 'Date', 'Montant', 'Mode', 'Alloue', 'Quittance'],
        rows.content.map((p) => [
          p.reference, p.nif, p.taxpayerName, p.paymentDate, p.amount,
          methodLabels[p.method] ?? p.method, p.allocatedAmount, p.receiptReference ?? '',
        ]),
      )
    },
    onSuccess: () => toast.success('Export paiements termine'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportDeclarations = useMutation({
    mutationFn: async () => {
      const rows = await apiGet<Page<Declaration>>('/reports/declarations?size=9999')
      downloadCsv(
        `rapport_declarations_${new Date().toISOString().slice(0, 10)}.csv`,
        ['Reference', 'NIF', 'Contribuable', 'Impot', 'Periode', 'Montant declare', 'Impot calcule', 'Paye', 'Reste', 'Statut'],
        rows.content.map((d) => [
          d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period,
          d.declaredAmount, d.calculatedTax, d.montantPaye ?? 0, d.resteAPayer ?? 0, d.status,
        ]),
      )
    },
    onSuccess: () => toast.success('Export declarations termine'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportTaxpayers = useMutation({
    mutationFn: async () => {
      const rows = await apiGet<Page<TaxpayerSummary>>('/reports/taxpayers?size=9999')
      downloadCsv(
        `rapport_contribuables_${new Date().toISOString().slice(0, 10)}.csv`,
        ['NIF', 'Nom', 'Raison sociale', 'Type', 'Telephone', 'Email', 'Statut', 'Centre fiscal', 'Regime', 'Date creation'],
        rows.content.map((t) => [
          t.nif, t.name, t.businessName ?? '', t.type, t.phone ?? '', t.email ?? '',
          t.status, t.taxCenterCode ?? '', t.taxRegimeCode ?? '', t.createdAt,
        ]),
      )
    },
    onSuccess: () => toast.success('Export contribuables termine'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  const exportReceipts = useMutation({
    mutationFn: async () => {
      const rows = await apiGet<Page<import('../types').Receipt>>('/receipts?size=9999')
      downloadCsv(
        `rapport_quittances_${new Date().toISOString().slice(0, 10)}.csv`,
        ['N\u00b0', 'Reference', 'Contribuable', 'NIF', 'Impot', 'Periode', 'Montant', 'Mode', 'Statut', 'Emise le'],
        rows.content.map((r) => [
          r.receiptNumber, r.reference, r.taxpayerName, r.nif, r.taxTypeCode,
          r.period, r.amount, r.method, r.status, r.issuedAt,
        ]),
      )
    },
    onSuccess: () => toast.success('Export quittances termine'),
    onError: (err: Error) => toast.error(apiErrorMessage(err)),
  })

  /* -- Handlers -- */
  const handleExport = useCallback((reportId: string) => {
    switch (reportId) {
      case 'recouvrement': exportDebts.mutate(); break
      case 'paiements': exportPayments.mutate(); break
      case 'quittances': exportReceipts.mutate(); break
      case 'declarations': exportDeclarations.mutate(); break
      case 'contribuables': exportTaxpayers.mutate(); break
      case 'creances': exportDebts.mutate(); break
      default: toast.info('Export en cours...')
    }
  }, [exportDebts, exportPayments, exportReceipts, exportDeclarations, exportTaxpayers, toast])

  const handleGenerate = useCallback((reportId: string) => {
    toast.success(`Generation du rapport en cours...`)
    setTimeout(() => {
      handleExport(reportId)
    }, 500)
  }, [handleExport, toast])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['report-stats'] })
    queryClient.invalidateQueries({ queryKey: ['report-collection'] })
    queryClient.invalidateQueries({ queryKey: ['report-payments'] })
    queryClient.invalidateQueries({ queryKey: ['report-declarations'] })
    queryClient.invalidateQueries({ queryKey: ['report-taxpayers'] })
    toast.success('Donnees actualisees')
  }, [queryClient, toast])

  const handlePreview = useCallback((reportId: string) => {
    switch (reportId) {
      case 'recouvrement':
      case 'creances': {
        const data = debts?.content ?? []
        setPreviewData({
          title: 'Rapport de recouvrement',
          headers: ['Reference', 'NIF', 'Contribuable', 'Impot', 'Periode', 'Total', 'Paye', 'Solde', 'Statut'],
          rows: data.slice(0, 50).map((d) => [d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period, d.totalAmount, d.paidAmount, d.balance, d.status]),
        })
        break
      }
      case 'paiements': {
        const data = payments?.content ?? []
        setPreviewData({
          title: 'Rapport des paiements',
          headers: ['Reference', 'NIF', 'Contribuable', 'Date', 'Montant', 'Mode', 'Statut'],
          rows: data.slice(0, 50).map((p) => [p.reference, p.nif, p.taxpayerName, p.paymentDate, p.amount, p.method, p.status]),
        })
        break
      }
      case 'quittances': {
        const data = receipts?.content ?? []
        setPreviewData({
          title: 'Rapport des quittances',
          headers: ['N°', 'Reference', 'Contribuable', 'NIF', 'Impot', 'Periode', 'Montant', 'Statut'],
          rows: data.slice(0, 50).map((r) => [r.receiptNumber, r.reference, r.taxpayerName, r.nif, r.taxTypeCode, r.period, r.amount, r.status]),
        })
        break
      }
      case 'declarations': {
        const data = declarations?.content ?? []
        setPreviewData({
          title: 'Rapport des declarations',
          headers: ['Reference', 'NIF', 'Contribuable', 'Impot', 'Periode', 'Declare', 'Calcule', 'Statut'],
          rows: data.slice(0, 50).map((d) => [d.reference, d.nif, d.taxpayerName, d.taxTypeCode, d.period, d.declaredAmount, d.calculatedTax ?? 0, d.status]),
        })
        break
      }
      case 'contribuables': {
        const data = taxpayers?.content ?? []
        setPreviewData({
          title: 'Rapport des contribuables',
          headers: ['NIF', 'Nom', 'Type', 'Telephone', 'Email', 'Statut'],
          rows: data.slice(0, 50).map((t) => [t.nif, t.name, t.type, t.phone ?? '', t.email ?? '', t.status]),
        })
        break
      }
      default:
        toast.info('Apercu non disponible pour ce type')
    }
  }, [debts, payments, declarations, taxpayers, receipts, toast])

  const handleRegenerate = useCallback((reportId: string) => {
    queryClient.invalidateQueries({ queryKey: ['report-collection'] })
    queryClient.invalidateQueries({ queryKey: ['report-payments'] })
    queryClient.invalidateQueries({ queryKey: ['report-declarations'] })
    queryClient.invalidateQueries({ queryKey: ['report-taxpayers'] })
    queryClient.invalidateQueries({ queryKey: ['report-receipts'] })
    toast.success('Rapport regenere avec succes')
    setTimeout(() => handleExport(reportId), 300)
  }, [queryClient, handleExport, toast])

  const handleDelete = useCallback((reportId: string) => {
    setDeletedIds((prev) => new Set(prev).add(reportId))
    setDeleteConfirm(null)
    toast.success('Rapport supprime')
  }, [toast])

  /* -- Skeleton -- */
  if (isLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* === 1. HEADER === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Rapports et analyses
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultez, analysez et exportez les donnees fiscales et financieres.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Selecteur de periode */}
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {currentPeriod.label}
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            {periodOpen && (
              <div className="absolute right-0 z-[60] mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Periode</p>
                </div>
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
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actualiser */}
          <Button variant="secondary" size="md" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>

          {/* Generer un rapport */}
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Plus className="relative h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span className="relative">Generer un rapport</span>
          </button>
        </div>
      </div>

      {/* === 2. STATISTIQUES === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="RAPPORTS DISPONIBLES"
          value={stats.totalReports}
          sub="Types de rapports"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="CREANCES TOTALES"
          value={fmtNumber(stats.totalDebts)}
          sub={`${fmtNumber(stats.totalPayments)} paiements enregistres`}
          delta={stats.totalCollected > 0 ? `${fmtMGA(stats.totalCollected)} recouvre` : undefined}
          deltaTone="up"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="CONTRIBUABLES"
          value={fmtNumber(stats.totalTaxpayers)}
          sub={`${fmtNumber(stats.totalDeclarations)} declarations`}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
          label="QUITTANCES"
          value={fmtNumber(stats.totalReceipts)}
          sub={`${fmtNumber(stats.validReceipts)} valides`}
          delta={stats.receiptTotalAmount > 0 ? `${fmtMGA(stats.receiptTotalAmount)} total` : undefined}
          deltaTone="up"
        />
        <StatCard
          icon={<Download className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="DONNEES DISPONIBLES"
          value={fmtNumber((debts?.totalElements ?? 0) + (payments?.totalElements ?? 0) + (receipts?.totalElements ?? 0))}
          sub="Lignes exportables"
          delta="+ CSV / Excel"
          deltaTone="up"
        />
      </div>

      {/* === 3. RAPPORTS DISPONIBLES === */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Rapports disponibles
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {reportCards.length} rapport{reportCards.length > 1 ? 's' : ''} disponible{reportCards.length > 1 ? 's' : ''}
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
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {reportCards.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10" />}
            title="Aucun rapport trouve"
            subtitle={search ? `Aucun resultat pour "${search}"` : 'Aucun rapport disponible dans cette categorie'}
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
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Rapports recemment generes
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {recentReports.length} rapport{recentReports.length > 1 ? 's' : ''} disponible{recentReports.length > 1 ? 's' : ''} au telechargement
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
                placeholder="Rechercher un rapport..."
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
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Liste */}
          {recentReports.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<FolderOpen className="h-10 w-10" />}
                title="Aucun rapport disponible"
                subtitle="Aucun rapport n'a encore ete genere pour cette periode."
              />
              <div className="mt-4 flex justify-center">
                <Button variant="primary" onClick={() => setGenerateModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Generer un rapport
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentReports.map((report) => (
                <RecentReportRow
                  key={report.id}
                  report={report}
                  onExport={() => handleExport(report.type)}
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
                {recentReports.length} rapport{recentReports.length > 1 ? 's' : ''} affiche{recentReports.length > 1 ? 's' : ''}
                {search && ` pour "${search}"`}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* === 5. MODAL GENERER RAPPORT === */}
      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generer un rapport"
        subtitle="Selectionnez un type de rapport a generer"
        wide
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {getReportCards().map((report) => (
            <button
              key={report.id}
              onClick={() => {
                setGenerateModalOpen(false)
                handleGenerate(report.id)
              }}
              className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-500"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.iconBg} ${report.iconColor} transition-transform duration-200 group-hover:scale-110`}>
                {report.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{report.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{report.description}</p>
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
      </Modal>

      {/* === 6. MODAL APERCU === */}
      <Modal
        open={!!previewData}
        onClose={() => setPreviewData(null)}
        title={previewData?.title ?? ''}
        subtitle={`${previewData?.rows.length ?? 0} ligne${(previewData?.rows.length ?? 0) > 1 ? 's' : ''} affichees (max 50)`}
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
        title="Supprimer le rapport"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Voulez-vous supprimer le rapport <span className="font-semibold text-slate-800 dark:text-slate-200">"{deleteConfirm?.name}"</span> ?
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Cette action est reversible uniquement pour cette session.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}>
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/* ═══════════════════════════ Sous-composants ═══════════════════════════ */

/* -- Carte KPI -- */
function StatCard({
  icon, iconBg, iconColor, label, value, sub, delta, deltaTone = 'neutral',
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: React.ReactNode; sub: string; delta?: string; deltaTone?: 'up' | 'down' | 'neutral'
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
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
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
  const { isOpen: menuOpen, close: closeMenu, triggerProps, dropdownProps } = useDropdown()

  return (
    <Card hover className="group relative flex flex-col overflow-hidden">
      {/* Header colore */}
      <div className={`relative bg-gradient-to-r ${report.gradient} px-5 py-4`}>
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
                    Apercu
                  </button>
                  <button
                    onClick={() => { onRegenerate(); closeMenu() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    Regenerer
                  </button>
                  <button
                    onClick={() => { onExport(); closeMenu() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    Exporter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">{report.title}</h3>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{report.description}</p>

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
            Disponible
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <button
            onClick={onGenerate}
            className="group/btn relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100" />
            <Zap className="relative h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
            <span className="relative">Generer</span>
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exporter
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
      <span className="hidden shrink-0 sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Disponible
      </span>

      {/* Badge format */}
      <span className={`hidden shrink-0 md:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${formatBadgeColor(report.format)}`}>
        {report.format}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onExport}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-400"
          title="Telecharger"
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
                  Apercu
                </button>
                <button
                  onClick={() => { onExport(); closeMenu() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  Telecharger
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { onDelete(); closeMenu() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
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
