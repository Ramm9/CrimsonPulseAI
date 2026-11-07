import { ArrowRight } from 'lucide-react'
import type { Incident, IncidentSeverity } from '@/types'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/helpers'

interface IncidentSummaryCardProps {
  incidents: Incident[]
  className?: string
}

const severityDotColor: Record<IncidentSeverity, string> = {
  critical: 'bg-cp-critical',
  high: 'bg-cp-warning',
  medium: 'bg-amber-400',
  low: 'bg-cp-text-secondary',
}

const severityLabel: Record<IncidentSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function IncidentSummaryCard({ incidents, className }: IncidentSummaryCardProps) {
  const displayedIncidents = incidents.slice(0, 4)

  return (
    <div className={cn('space-y-1', className)}>
      {displayedIncidents.map((incident) => (
        <a
          key={incident.id}
          href={`/incidents/${incident.id}`}
          className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-cp-elevated/50"
        >
          {/* Severity indicator */}
          <div className="mt-1.5 flex-shrink-0">
            <span
              className={cn(
                'block h-2.5 w-2.5 rounded-full',
                severityDotColor[incident.severity]
              )}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cp-text group-hover:text-cp-crimson transition-colors">
              {incident.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-cp-text-secondary">
              <span className="font-mono text-[11px]">{incident.endpoint}</span>
              <span className="text-cp-border">·</span>
              <span className={cn(
                'text-xs',
                incident.severity === 'critical' ? 'text-cp-critical' : 'text-cp-text-secondary'
              )}>
                {severityLabel[incident.severity]}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-cp-text-secondary/70">
              {formatRelativeTime(incident.lastOccurred)}
            </p>
          </div>
        </a>
      ))}

      {/* View all link */}
      <a
        href="/incidents"
        className="group/link flex items-center gap-1.5 px-3 pt-2 text-xs font-medium text-cp-text-secondary transition-colors hover:text-cp-crimson"
      >
        View all incidents
        <ArrowRight
          size={12}
          className="transition-transform group-hover/link:translate-x-0.5"
        />
      </a>
    </div>
  )
}
