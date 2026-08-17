import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
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

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  permission: string
  end?: boolean
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [{ to: '/', label: 'Tableau de bord', icon: <LayoutDashboard className="h-4.5 w-4.5" />, permission: 'REPORT_READ', end: true }],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/taxpayers', label: 'Contribuables', icon: <Users className="h-4.5 w-4.5" />, permission: 'TAXPAYER_READ' },
      { to: '/declarations', label: 'Déclarations', icon: <FileText className="h-4.5 w-4.5" />, permission: 'DECLARATION_READ' },
      { to: '/debts', label: 'Créances', icon: <TrendingDown className="h-4.5 w-4.5" />, permission: 'DEBT_READ' },
      { to: '/collection', label: 'Recouvrement', icon: <ScrollText className="h-4.5 w-4.5" />, permission: 'COLLECTION_READ' },
      { to: '/payments', label: 'Paiements', icon: <Wallet className="h-4.5 w-4.5" />, permission: 'PAYMENT_READ' },
      { to: '/receipts', label: 'Quittances', icon: <Receipt className="h-4.5 w-4.5" />, permission: 'RECEIPT_READ' },
      { to: '/messages', label: 'Messages', icon: <MessageSquare className="h-4.5 w-4.5" />, permission: 'MESSAGE_READ' },
    ],
  },
  {
    label: 'Référentiels',
    items: [
      { to: '/deadlines', label: 'Calendrier fiscal', icon: <CalendarDays className="h-4.5 w-4.5" />, permission: 'TAXONOMY_READ' },
      { to: '/tax-rules', label: 'Règles fiscales', icon: <Calculator className="h-4.5 w-4.5" />, permission: 'RULE_READ' },
      { to: '/reports', label: 'Rapports', icon: <BarChart3 className="h-4.5 w-4.5" />, permission: 'REPORT_READ' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', label: 'Utilisateurs', icon: <Users className="h-4.5 w-4.5" />, permission: 'USER_READ' },
      { to: '/roles', label: 'Rôles', icon: <Shield className="h-4.5 w-4.5" />, permission: 'ROLE_READ' },
      { to: '/audit', label: 'Journal d\'audit', icon: <ClipboardList className="h-4.5 w-4.5" />, permission: 'AUDIT_READ' },
      { to: '/parameters', label: 'Paramètres', icon: <Settings className="h-4.5 w-4.5" />, permission: 'PARAMETER_READ' },
    ],
  },
]

export function filterNavSections(permissions: string[]): NavSection[] {
  const can = (p: string) => permissions.includes(p)
  return navSections
    .map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission)) }))
    .filter((s) => s.items.length > 0)
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <img
        src="/logo.webp"
        alt="MNK-TAX"
        className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-lg shadow-brand-900/40"
      />
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight tracking-tight text-white">MNK-TAX</p>
        <p className="truncate text-[10px] uppercase tracking-widest text-slate-400">Gestion des impôts</p>
      </div>
    </div>
  )
}

function NifCard() {
  return (
    <div className="group relative mx-3 mb-3 animate-fade-in overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-brand-900/30 transition-all duration-300 hover:border-brand-400/40 hover:shadow-brand-900/50">
      <img
        src="/menu.png"
        alt="DGI Manakara"
        loading="lazy"
        className="h-52 w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sidebar via-sidebar/85 to-transparent px-4 pb-4 pt-12">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Landmark className="h-3.5 w-3.5 text-brand-300 transition-transform duration-300 group-hover:rotate-12" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-200">DGI MANAKARA</p>
        </div>
        <p className="text-[11px] font-semibold leading-snug text-white">
          Service des impôts de Manakara
        </p>
        <p className="animate-slide-up mt-1 text-[11px] leading-snug text-slate-300 transition-colors duration-300 group-hover:text-white">
          Suivi des contribuables, déclarations et recouvrement des impôts.
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

  const content = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between pr-2">
        <Brand />
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, idx) => {
          const label = section.label ?? ''
          const isOpen = openSections[label] ?? true
          const toggle = () =>
            setOpenSections((s) => ({ ...s, [label]: !(s[label] ?? true) }))
          return (
            <div key={label || idx} className="mt-5">
              {section.label ? (
                <button
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className="group mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                >
                  {section.label}
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
                    {section.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-brand-600/15 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
                              )}
                              <span className={`shrink-0 ${isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                {item.icon}
                              </span>
                              {item.label}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
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
        className={`fixed inset-y-0 left-0 z-40 hidden w-72 transition-transform duration-300 lg:block ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 left-0 w-72 animate-drawer-in bg-sidebar shadow-popover">{content}</div>
        </div>
      )}
    </>
  )
}
