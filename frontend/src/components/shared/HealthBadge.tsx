import { cn } from '@/utils/cn'
import type { HealthStatus } from '@/types'

interface HealthBadgeProps {
  status: HealthStatus
  className?: string
  showLabel?: boolean
}

const statusConfig: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  healthy: {
    dot: 'bg-cp-healthy',
    text: 'text-cp-healthy',
    label: 'Healthy',
  },
  degraded: {
    dot: 'bg-cp-warning',
    text: 'text-cp-warning',
    label: 'Degraded',
  },
  critical: {
    dot: 'bg-cp-critical',
    text: 'text-cp-critical',
    label: 'Critical',
  },
  unknown: {
    dot: 'bg-zinc-500',
    text: 'text-zinc-400',
    label: 'Insufficient Data',
  },
}

export function HealthBadge({ status, className, showLabel = true }: HealthBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('h-2 w-2 rounded-full', config.dot)}>
        {status === 'critical' && (
          <span className={cn('absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75', config.dot)} />
        )}
      </span>
      {showLabel && (
        <span className={cn('text-xs font-medium capitalize', config.text)}>
          {config.label}
        </span>
      )}
    </span>
  )
}
