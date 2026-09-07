import type { ReactNode } from 'react'

export function KpiCard({
  label,
  value,
  icon,
  wrap,
  bar,
  sub,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  wrap: string
  bar: string
  sub?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/60 p-5 transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-800/40">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${wrap}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {sub && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>}
        </div>
      </div>
    </div>
  )
}
