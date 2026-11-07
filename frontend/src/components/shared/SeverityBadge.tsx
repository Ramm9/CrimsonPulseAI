import { cn } from '@/utils/cn'
import type { IncidentSeverity, AnomalySeverity } from '@/types'

type Severity = IncidentSeverity | AnomalySeverity

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        severityStyles[severity],
        className
      )}
    >
      {severity}
    </span>
  )
}
