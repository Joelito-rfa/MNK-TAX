import { useI18n } from '../../lib/i18n'
import { PRIORITY_CONFIG } from './constants'

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useI18n()
  const cfg = PRIORITY_CONFIG[priority]
  if (!cfg) {
    const fallback = t(`priority.${priority}`)
    return <span className="text-xs text-slate-500">{fallback !== `priority.${priority}` ? fallback : '—'}</span>
  }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${cfg.color}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {t(cfg.key)}
    </span>
  )
}
