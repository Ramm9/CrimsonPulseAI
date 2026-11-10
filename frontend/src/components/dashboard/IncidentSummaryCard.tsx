import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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
    <div className={cn('rounded-xl border border-cp-border bg-cp-card p-5 h-full flex flex-col', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-cp-text">Active Incidents</h3>
          <p className="text-xs text-cp-text-secondary">
            Triggered alerts requiring investigation and triage
          </p>
        </div>
        <span className="rounded-full bg-cp-secondary px-2.5 py-0.5 text-xs font-mono font-medium text-cp-text-secondary">
          {incidents.length} open
        </span>
      </div>

      <div className="flex-1 space-y-1">
        {displayedIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-cp-text-secondary">
            <p className="font-medium text-cp-text">No Open Incidents</p>
            <p className="mt-1 text-[11px] text-cp-text-secondary">
              All monitored service endpoints are operating normally.
            </p>
          </div>
        ) : (
          displayedIncidents.map((incident) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="group flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-cp-elevated/50"
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
                <p className="text-sm font-medium text-cp-text group-hover:text-cp-crimson transition-colors truncate">
                  {incident.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-cp-text-secondary">
                  <span className="font-mono text-[11px] truncate">{incident.endpoint}</span>
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
            </Link>
          ))
        )}
      </div>

      {/* View all link */}
      <Link
        to="/incidents"
        className="group/link mt-3 flex items-center justify-between border-t border-cp-border/60 pt-3 text-xs font-medium text-cp-text-secondary transition-colors hover:text-cp-crimson"
      >
        <span>View all incidents ({incidents.length})</span>
        <ArrowRight
          size={12}
          className="transition-transform group-hover/link:translate-x-0.5"
        />
      </Link>
    </div>
  )
}
