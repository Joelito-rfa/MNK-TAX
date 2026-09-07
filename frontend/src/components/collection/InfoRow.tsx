import type { ReactNode } from 'react'

export function InfoRow({ label, value, strong, mono, paid, balance, warn, overdue }: {
  label: string
  value: ReactNode
  strong?: boolean
  mono?: boolean
  paid?: boolean
  balance?: boolean
  warn?: boolean
  overdue?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`max-w-[65%] truncate text-right text-sm ${
          strong ? 'font-semibold text-slate-800 dark:text-slate-200'
            : paid ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : balance && Number(value) > 0 ? 'font-semibold text-amber-600 dark:text-amber-400'
                : balance ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : warn ? 'font-medium text-amber-600 dark:text-amber-400'
                    : overdue ? 'font-semibold text-red-500 dark:text-red-400'
                      : 'font-medium text-slate-700 dark:text-slate-300'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
