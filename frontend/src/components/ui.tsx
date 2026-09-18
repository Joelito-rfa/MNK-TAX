import {
  useEffect,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import { useI18n } from '../lib/i18n'

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 dark:text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
          {icon}
        </div>
      )}
      <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  )
}

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'danger' | 'ghost' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500/30',
  dark: 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm hover:bg-slate-700 focus-visible:ring-slate-500/30 dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  danger: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600 focus-visible:ring-rose-500/30',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200',
  success: 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 focus-visible:ring-emerald-500/30',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}) {
  return (
    <button
      className={`fx-btn inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${buttonStyles[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <SpinnerSmall />}
      {children}
    </button>
  )
}

function SpinnerSmall() {
  return (
    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
  )
}

export function Card({ children, className = '', hover = false, onClick, style }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`card card-3d fx-spot animate-fade-in transition-all duration-200 ${hover ? 'hover:-translate-y-0.5 hover:shadow-card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50 ${className}`}>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex animate-slide-up flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-[28px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input-base ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input-base ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`input-base appearance-none ${className}`} {...props}>
      {children}
    </select>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = '',
  onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-700 dark:focus:ring-brand-400/10"
      />
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  )
}

type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet' | 'indigo' | 'rose'

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export function Badge({ tone = 'slate', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex animate-pop-in items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export const statusTone = (value: string): BadgeTone => {
  const v = value.toLowerCase()
  if (['active', 'paid', 'validated', 'allocated', 'issued', 'submitted', 'accepted', 'approved', 'valid', 'generated'].includes(v)) return 'green'
  if (['suspended', 'rejected', 'void', 'cancelled', 'overdue', 'in_collection', 'failed', 'refunded'].includes(v)) return 'red'
  if (['draft', 'closed', 'inactive', 'recorded', 'pending', 'review', 'waiting', 'under_review', 'redressement', 'unpaid', 'partially_paid', 'not_submitted'].includes(v)) return 'amber'
  if (['replaced'].includes(v)) return 'amber'
  if (v.includes('collection')) return 'violet'
  if (v.includes('open')) return 'blue'
  return 'slate'
}

export function StatusBadge({ value }: { value: string }) {
  const { t } = useI18n()
  const key = `status.${value}`
  const translated = t(key)
  const labels: Record<string, string> = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
    SUSPENDED: 'Suspendu',
    CLOSED: 'Clôturé',
    DRAFT: 'Brouillon',
    SUBMITTED: 'Déclarée',
    REVIEW: 'En revue',
    VALIDATED: 'Validée',
    REJECTED: 'Rejetée',
    CANCELLED: 'Annulée',
    OPEN: 'En attente',
    IN_PROGRESS: 'En cours',
    ANOMALY_DETECTED: 'Anomalies détectées',
    REDRESSEMENT: 'Redressement',
    UNDER_REVIEW: 'En examen',
    ACCEPTED: 'Acceptée',
    APPROVED: 'Approuvé',
    PENDING: 'En attente',
    OVERDUE: 'En retard',
    IN_COLLECTION: 'Recouvrement',
    PAID: 'Payée',
    UNPAID: 'Impayé',
    PARTIALLY_PAID: 'Partiellement payé',
    NOT_SUBMITTED: 'Non déclarée',
    RECORDED: 'Enregistré',
    ALLOCATED: 'Alloué',
    ISSUED: 'Émise',
    GENERATED: 'Générée',
    VALID: 'Valide',
    REPLACED: 'Remplacée',
    REFUNDED: 'Remboursée',
    VOID: 'Annulée',
  }
  return <Badge tone={statusTone(value)}>{translated !== key ? translated : (labels[value] ?? value)}</Badge>
}

const iconTiles: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

export type IconTone = keyof typeof iconTiles

export function IconTile({ tone = 'brand', children, className = '' }: { tone?: IconTone; children: ReactNode; className?: string }) {
  return (
    <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${iconTiles[tone]} ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  delta,
  deltaTone = 'neutral',
  sub,
  className = '',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: IconTone
  delta?: string
  deltaTone?: 'up' | 'down' | 'neutral'
  sub?: string
  className?: string
}) {
  return (
    <Card hover className={`group relative overflow-hidden p-5 ${className}`} >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {icon && (
          <span className="transition-transform duration-200 group-hover:scale-110">
            <IconTile tone={tone}>{icon}</IconTile>
          </span>
        )}
      </div>
      {(delta || sub) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                deltaTone === 'up'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : deltaTone === 'down'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {deltaTone === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {deltaTone === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {delta}
            </span>
          )}
          {sub && <span className="text-slate-400 dark:text-slate-500">{sub}</span>}
        </div>
      )}
    </Card>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  onBackdrop = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
  onBackdrop?: boolean
}) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-8"
      onMouseDown={onBackdrop ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <div
        className={`relative my-auto flex max-h-[calc(100vh-1.5rem)] w-full flex-col sm:max-h-[calc(100vh-4rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-scale-in rounded-2xl bg-white border border-slate-200/70 shadow-popover dark:bg-slate-800 dark:border-slate-700/50`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={t('a11y.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const okLabel = confirmLabel ?? t('common.confirm')
  const koLabel = cancelLabel ?? t('common.cancel')
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">{message}</div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {koLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {okLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function Drawer({
  open,
  onClose,
  children,
  side = 'left',
  width = 'w-72',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`fixed inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} ${width} max-w-full animate-drawer-in bg-white border-r border-slate-200/70 shadow-popover dark:bg-slate-800 dark:border-slate-700/50`}
      >
        {children}
      </div>
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  onChange,
  pageSize,
  onPageSizeChange,
  totalElements,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
  pageSize?: number
  onPageSizeChange?: (n: number) => void
  totalElements?: number
}) {
  const { t } = useI18n()
  if (totalPages <= 1 && !pageSize) return null

  const pages: number[] = []
  const start = Math.max(0, Math.min(page - 2, totalPages - 5))
  const end = Math.min(totalPages - 1, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)

  const firstItem = totalElements != null && totalElements > 0 ? page * (pageSize ?? 20) + 1 : 0
  const lastItem = totalElements != null ? Math.min(totalElements, firstItem + (pageSize ?? 20) - 1) : 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-5 py-3 dark:border-slate-700/50">
      <div className="flex items-center gap-3">
        {pageSize && onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">{t('pagination.rowsPerPage')}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-brand-400"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {totalElements != null
            ? (<>{firstItem}–{lastItem} {t('pagination.of')} <span className="font-medium text-slate-700 dark:text-slate-300">{totalElements}</span></>)
            : <>{t('pagination.page')} <span className="font-medium text-slate-700 dark:text-slate-300">{page + 1}</span> {t('pagination.of')} {totalPages}</>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page === 0} onClick={() => onChange(page - 1)} aria-label={t('pagination.prev')}>
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>
        {pages[0] > 0 && (
          <>
            <PageBtn onClick={() => onChange(0)}>1</PageBtn>
            {pages[0] > 1 && <span className="px-1 text-sm text-slate-400 dark:text-slate-500">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageBtn key={p} active={p === page} onClick={() => onChange(p)}>
            {p + 1}
          </PageBtn>
        ))}
        {pages[pages.length - 1] < totalPages - 1 && (
          <>
            {pages[pages.length - 1] < totalPages - 2 && <span className="px-1 text-sm text-slate-400 dark:text-slate-500">…</span>}
            <PageBtn onClick={() => onChange(totalPages - 1)}>{totalPages}</PageBtn>
          </>
        )}
        <PageBtn disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label={t('pagination.next')}>
          <ChevronRight className="h-4 w-4" />
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition ${
        active
          ? 'bg-brand-600 font-semibold text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <table className={`w-full text-left text-sm ${className}`}>{children}</table>
    </div>
  )
}

export function Th({ children, className = '', onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400 ${className}`}>{children}</td>
}

export function Tabs({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: { id: string; label: ReactNode }[]
  active: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            active === t.id ? 'tab-active' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50 ${className}`}>{children}</div>
  )
}

export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 'w-72',
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  width?: string
}) {
  return (
    <div className="relative">
      {trigger}
      <div
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${width} top-full z-40 mt-2 animate-scale-in`}
      >
        {children}
      </div>
    </div>
  )
}

export function Chevron() {
  return <ChevronDown className="h-4 w-4 opacity-60" />
}
