import type { ReactNode } from 'react'

/* Mini-dashboard aligné sur le style des Règles fiscales :
   label uppercase, valeur 26px, pastille icône 11x11 avec scale au survol,
   sous-texte, entrée en cascade via .grid + animation fx-spot de Card. */
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
  void bar
  return (
    <div className="card fx-spot group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[26px] font-[650] leading-tight tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${wrap} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
      {sub && <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  )
}
