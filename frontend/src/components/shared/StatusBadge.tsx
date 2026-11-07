import { cn } from '@/utils/cn'
import type { IncidentStatus } from '@/types'

interface StatusBadgeProps {
  status: IncidentStatus
  className?: string
}

const statusStyles: Record<IncidentStatus, { bg: string; text: string; dot: string; label: string }> = {
  open: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'Open',
  },
  acknowledged: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'Acknowledged',
  },
  investigating: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    label: 'Investigating',
  },
  resolved: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'Resolved',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusStyles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
