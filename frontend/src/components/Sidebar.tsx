import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Banknote,
  BarChart3,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  FileSearch,
  FileText,
  Landmark,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  TrendingDown,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

export interface NavItem {
  to: string
  labelKey: string
  icon: ReactNode
  permission: string
  end?: boolean
  children?: NavItem[]
}

export interface NavSection {
  labelKey?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [{ to: '/dashboard', labelKey: 'sidebar.dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" />, permission: 'REPORT_READ', end: true }],
  },
  {
    labelKey: 'sidebar.section.gestion',
    items: [
      { to: '/taxpayers', labelKey: 'sidebar.taxpayers', icon: <Users className="h-4.5 w-4.5" />, permission: 'TAXPAYER_READ' },
      { to: '/declarations', labelKey: 'sidebar.declarations', icon: <FileText className="h-4.5 w-4.5" />, permission: 'DECLARATION_READ' },
      { to: '/assessments', labelKey: 'sidebar.assessments', icon: <Calculator className="h-4.5 w-4.5" />, permission: 'ASSESSMENT_READ' },
      { to: '/debts', labelKey: 'sidebar.debts', icon: <TrendingDown className="h-4.5 w-4.5" />, permission: 'DEBT_READ' },
      { to: '/collection', labelKey: 'sidebar.collection', icon: <ScrollText className="h-4.5 w-4.5" />, permission: 'COLLECTION_READ', children: [
        { to: '/collection', labelKey: 'sidebar.collection.overview', icon: <ScrollText className="h-4 w-4" />, permission: 'COLLECTION_READ', end: true },
        { to: '/collection/overdue', labelKey: 'sidebar.collection.overdue', icon: <TrendingDown className="h-4 w-4" />, permission: 'COLLECTION_READ' },
        { to: '/collection/reminders', labelKey: 'sidebar.collection.reminders', icon: <Mail className="h-4 w-4" />, permission: 'COLLECTION_READ' },
        { to: '/collection/notices', labelKey: 'sidebar.collection.notices', icon: <FileText className="h-4 w-4" />, permission: 'COLLECTION_READ' },
        { to: '/collection/plans', labelKey: 'sidebar.collection.plans', icon: <CalendarDays className="h-4 w-4" />, permission: 'COLLECTION_READ' },
        { to: '/collection/history', labelKey: 'sidebar.collection.history', icon: <ClipboardList className="h-4 w-4" />, permission: 'COLLECTION_READ' },
      ]},
      { to: '/payments', labelKey: 'sidebar.payments', icon: <Wallet className="h-4.5 w-4.5" />, permission: 'PAYMENT_READ', children: [
        { to: '/payments', labelKey: 'sidebar.payments.list', icon: <Wallet className="h-4 w-4" />, permission: 'PAYMENT_READ', end: true },
        { to: '/payments/new', labelKey: 'sidebar.payments.new', icon: <Receipt className="h-4 w-4" />, permission: 'PAYMENT_WRITE' },
        { to: '/receipts', labelKey: 'sidebar.payments.receipts', icon: <Receipt className="h-4 w-4" />, permission: 'RECEIPT_READ' },
        { to: '/payments/pending', labelKey: 'sidebar.payments.pending', icon: <CalendarDays className="h-4 w-4" />, permission: 'PAYMENT_READ' },
        { to: '/payments/stats', labelKey: 'sidebar.payments.stats', icon: <BarChart3 className="h-4 w-4" />, permission: 'PAYMENT_READ' },
      ]},
      { to: '/controls', labelKey: 'sidebar.controls', icon: <FileSearch className="h-4.5 w-4.5" />, permission: 'CONTROL_READ' },
      { to: '/complaints', labelKey: 'sidebar.complaints', icon: <FileQuestion className="h-4.5 w-4.5" />, permission: 'COMPLAINT_READ' },
      { to: '/refunds', labelKey: 'sidebar.refunds', icon: <Banknote className="h-4.5 w-4.5" />, permission: 'REFUND_READ' },
      { to: '/messages', labelKey: 'sidebar.messages', icon: <MessageSquare className="h-4.5 w-4.5" />, permission: 'MESSAGE_READ' },
    ],
  },
  {
    labelKey: 'sidebar.section.referentiels',
    items: [
      { to: '/deadlines', labelKey: 'sidebar.deadlines', icon: <CalendarDays className="h-4.5 w-4.5" />, permission: 'TAXONOMY_READ' },
      { to: '/tax-rules', labelKey: 'sidebar.tax-rules', icon: <Calculator className="h-4.5 w-4.5" />, permission: 'RULE_READ' },
      { to: '/reports', labelKey: 'sidebar.reports', icon: <BarChart3 className="h-4.5 w-4.5" />, permission: 'REPORT_READ' },
    ],
  },
  {
    labelKey: 'sidebar.section.administration',
    items: [
      { to: '/users', labelKey: 'sidebar.users', icon: <Users className="h-4.5 w-4.5" />, permission: 'USER_READ' },
      { to: '/registrations', labelKey: 'sidebar.registrations', icon: <Mail className="h-4.5 w-4.5" />, permission: 'USER_READ' },
      { to: '/roles', labelKey: 'sidebar.roles', icon: <Shield className="h-4.5 w-4.5" />, permission: 'ROLE_READ' },
      { to: '/audit', labelKey: 'sidebar.audit', icon: <ClipboardList className="h-4.5 w-4.5" />, permission: 'AUDIT_READ' },
      { to: '/parameters', labelKey: 'sidebar.parameters', icon: <Settings className="h-4.5 w-4.5" />, permission: 'PARAMETER_READ' },
    ],
  },
]

export function filterNavSections(permissions: string[]): NavSection[] {
  const can = (p: string) => permissions.includes(p)
  return navSections
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => can(i.permission))
        .map((i) => i.children
          ? { ...i, children: i.children.filter((c) => can(c.permission)) }
          : i
        ),
    }))
    .filter((s) => s.items.length > 0)
}

function Brand() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <img
        src="/logo.webp"
        alt="MNK-TAX"
        className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-lg shadow-brand-900/40"
      />
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{t('sidebar.brand')}</p>
        <p className="truncate text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('sidebar.brand.subtitle')}</p>
      </div>
    </div>
  )
}

function NifCard() {
  const { t } = useI18n()
  return (
    <div className="group relative mx-3 mb-3 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:border-brand-400/40 hover:shadow-brand-900/20 dark:border-white/10 dark:bg-transparent dark:shadow-brand-900/30 dark:hover:shadow-brand-900/50">
      <img
        src="/menu.png"
        alt="DRI Manakara"
        loading="lazy"
        className="h-52 w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
      />
      {/* ── Astre 3D : soleil (clair) / lune (sombre) en haut à gauche ── */}
      <div className="nif-celestial pointer-events-none absolute left-3 top-3 z-10" aria-hidden="true">
        <div className="nif-celestial-card">
          {/* Soleil - visible en mode clair */}
          <div className="nif-sun">
            <span className="nif-sun-core" />
            <span className="nif-sun-ray nif-sun-ray-1" />
            <span className="nif-sun-ray nif-sun-ray-2" />
            <span className="nif-sun-ray nif-sun-ray-3" />
            <span className="nif-sun-ray nif-sun-ray-4" />
          </div>
          {/* Lune - visible en mode sombre */}
          <div className="nif-moon">
            <span className="nif-moon-crater nif-moon-crater-1" />
            <span className="nif-moon-crater nif-moon-crater-2" />
            <span className="nif-moon-crater nif-moon-crater-3" />
          </div>
        </div>
      </div>
      {/* ── Fond flottant animé ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Halos flottants */}
        <span className="absolute -left-8 -top-8 h-28 w-28 animate-float rounded-full bg-brand-400/25 blur-2xl dark:bg-brand-500/25" />
        <span
          className="absolute -right-6 top-10 h-20 w-20 animate-float-slow rounded-full bg-emerald-400/20 blur-2xl dark:bg-emerald-400/20"
          style={{ animationDelay: '-3s' }}
        />
        <span
          className="absolute bottom-16 left-1/3 h-16 w-16 animate-float rounded-full bg-sky-400/20 blur-xl dark:bg-sky-400/15"
          style={{ animationDelay: '-1.5s' }}
        />
        {/* Particules flottantes */}
        <span
          className="absolute left-[18%] top-[18%] h-1.5 w-1.5 animate-float rounded-full bg-brand-500/60 dark:bg-brand-300/70"
          style={{ animationDelay: '-0.8s', animationDuration: '5s' }}
        />
        <span
          className="absolute right-[22%] top-[32%] h-1 w-1 animate-float rounded-full bg-emerald-500/60 dark:bg-emerald-300/70"
          style={{ animationDelay: '-2.2s', animationDuration: '6s' }}
        />
        <span
          className="absolute bottom-[38%] left-[30%] h-1 w-1 animate-float rounded-full bg-sky-500/60 dark:bg-sky-300/70"
          style={{ animationDelay: '-4s', animationDuration: '7s' }}
        />
        <span
          className="absolute right-[14%] top-[12%] h-2 w-2 animate-float-slow rounded-full border border-brand-500/40 dark:border-brand-300/40"
          style={{ animationDelay: '-1s' }}
        />
        {/* Reflet balayant au survol */}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full dark:via-white/10" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-4 pb-4 pt-12 dark:from-sidebar dark:via-sidebar/85 dark:to-transparent">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Landmark className="h-3.5 w-3.5 text-brand-600 transition-transform duration-300 group-hover:rotate-12 dark:text-brand-300" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">{t('sidebar.nifCard.title')}</p>
        </div>
        <p className="text-[11px] font-semibold leading-snug text-slate-900 dark:text-white">
          {t('sidebar.nifCard.subtitle')}
        </p>
        <p className="animate-slide-up mt-1 text-[11px] leading-snug text-slate-600 transition-colors duration-300 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
          {t('sidebar.nifCard.text')}
        </p>
      </div>
    </div>
  )
}

export default function Sidebar({
  open,
  permissions,
  mobileOpen,
  onCloseMobile,
}: {
  open: boolean
  permissions: string[]
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const sections = filterNavSections(permissions)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const { t } = useI18n()

  const toggleGroup = (key: string) =>
    setOpenGroups((s) => ({ ...s, [key]: !(s[key] ?? false) }))

  const content = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-sidebar">
      <div className="flex items-center justify-between pr-2">
        <Brand />
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, idx) => {
          const label = section.labelKey ? t(section.labelKey) : ''
          const isOpen = openSections[label] ?? true
          const toggle = () =>
            setOpenSections((s) => ({ ...s, [label]: !(s[label] ?? true) }))
          return (
            <div key={label || idx} className="mt-5">
              {section.labelKey ? (
                <button
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className="group mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                >
                  {label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : null}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const hasChildren = item.children && item.children.length > 0
                      if (hasChildren) {
                        const groupOpen = openGroups[item.to] ?? false
                        return (
                          <li key={item.to}>
                            <button
                              onClick={() => toggleGroup(item.to)}
                              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                                groupOpen
                                  ? 'bg-brand-600/10 text-brand-700 dark:text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                              }`}
                            >
                              <span className={`shrink-0 ${groupOpen ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`}>
                                {item.icon}
                              </span>
                              <span className="flex-1 text-left">{t(item.labelKey)}</span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                  groupOpen ? 'rotate-0 text-slate-400 dark:text-slate-400' : '-rotate-90 text-slate-400 dark:text-slate-600'
                                }`}
                              />
                            </button>
                            {groupOpen && (
                              <ul className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-3 dark:border-white/10">
                                {item.children!.map((child) => (
                                  <li key={child.to}>
                                    <NavLink
                                      to={child.to}
                                      end={child.end}
                                      className={({ isActive }) =>
                                        `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                                          isActive
                                            ? 'bg-brand-600/15 text-brand-700 dark:text-white'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white'
                                        }`
                                      }
                                    >
                                      {({ isActive }) => (
                                        <>
                                          {isActive && (
                                            <span className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 dark:bg-brand-400" />
                                          )}
                                          <span className={`shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400'}`}>
                                            {child.icon}
                                          </span>
                                          {t(child.labelKey)}
                                        </>
                                      )}
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      }
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                                isActive
                                  ? 'bg-brand-600/15 text-brand-700 dark:text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500 dark:bg-brand-400" />
                                )}
                                <span className={`shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`}>
                                  {item.icon}
                                </span>
                                {t(item.labelKey)}
                              </>
                            )}
                          </NavLink>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="mt-auto">
        <NifCard />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white transition-transform duration-300 dark:border-white/10 dark:bg-sidebar lg:block ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-drawer-in bg-white shadow-popover dark:bg-sidebar">{content}</div>
        </div>
      )}
    </>
  )
}
