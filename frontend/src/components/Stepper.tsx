export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        />
      ))}
    </div>
  )
}

export function StepLabels({ labels, step }: { labels: string[]; step: number }) {
  return (
    <div className="mt-1.5 flex justify-between gap-2 text-[11px] font-medium uppercase tracking-wide">
      {labels.map((label, i) => (
        <span key={label} className={i <= step ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}>
          {label}
        </span>
      ))}
    </div>
  )
}
