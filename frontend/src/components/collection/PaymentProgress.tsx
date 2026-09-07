export function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  if (total <= 0) return <span className="text-xs text-slate-500">—</span>
  const pct = Math.min(100, Math.round((paid / total) * 100))
  const barColor =
    pct >= 100
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-blue-500'
        : pct > 0
          ? 'bg-amber-500'
          : 'bg-slate-600'
  return (
    <div className="flex items-center gap-2" aria-label={`Paiement : ${pct} %`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%`, transformOrigin: 'left' }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">{pct}%</span>
    </div>
  )
}
