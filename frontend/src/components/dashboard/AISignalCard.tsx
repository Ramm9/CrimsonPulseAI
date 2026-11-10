import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { Anomaly } from '@/types'

interface AISignalCardProps {
  anomaly?: Anomaly | null
  className?: string
}

export function AISignalCard({ anomaly, className }: AISignalCardProps) {
  const isLatencyMetric = anomaly?.metric.toLowerCase().includes('latency')
  const unit = isLatencyMetric ? 'ms' : '%'

  const changePct = anomaly && anomaly.baselineValue > 0
    ? Math.round(((anomaly.observedValue - anomaly.baselineValue) / anomaly.baselineValue) * 100)
    : null

  const targetLink = anomaly?.relatedIncidentId
    ? `/incidents/${anomaly.relatedIncidentId}`
    : anomaly ? `/anomalies` : '/anomalies'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-cp-border bg-cp-card',
        anomaly ? 'border-l-2 border-l-cp-crimson' : 'border-l-2 border-l-emerald-500',
        className
      )}
    >
      {/* Subtle glow at top */}
      <div
        className={cn(
          "absolute -top-24 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full blur-3xl",
          anomaly ? "bg-cp-crimson/5" : "bg-emerald-500/5"
        )}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                anomaly ? "bg-cp-crimson/10 text-cp-crimson" : "bg-emerald-500/10 text-emerald-400"
              )}
            >
              {anomaly ? <Sparkles size={16} /> : <ShieldCheck size={16} />}
            </div>
            <div>
              <span className="text-sm font-semibold text-cp-text">AI Signal</span>
              <p className="text-[10px] font-mono text-cp-text-secondary">
                {anomaly ? (anomaly.modelVersion || 'Rule-Based Engine') : 'Continuous Monitoring'}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  anomaly ? "bg-cp-crimson" : "bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  anomaly ? "bg-cp-crimson" : "bg-emerald-400"
                )}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider",
                anomaly ? "text-cp-crimson" : "text-emerald-400"
              )}
            >
              {anomaly ? (anomaly.severity || 'Active') : 'Nominal'}
            </span>
          </div>
        </div>

        {anomaly ? (
          <>
            {/* Signal description */}
            <p className="mb-4 text-sm leading-relaxed text-cp-text font-medium">
              {anomaly.description || `${anomaly.endpoint || 'Endpoint'} deviated from baseline.`}
            </p>

            {/* Evidence */}
            <div className="mb-5 space-y-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary">
                Evidence & Supporting Telemetry
              </p>

              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
                className="flex items-center justify-between rounded-lg bg-cp-secondary/80 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    anomaly.severity === 'critical' ? "bg-cp-critical" : "bg-cp-warning"
                  )} />
                  <span className="text-xs text-cp-text-secondary">{anomaly.metric}:</span>
                </div>
                <div className="text-xs">
                  <span className="font-mono text-cp-text-secondary">{anomaly.baselineValue}{unit}</span>
                  <span className="mx-1.5 text-cp-text-secondary">→</span>
                  <span className={cn(
                    "font-mono font-medium",
                    anomaly.severity === 'critical' ? "text-cp-critical" : "text-cp-warning"
                  )}>
                    {anomaly.observedValue}{unit}
                  </span>
                  {changePct !== null && (
                    <span className="ml-1.5 text-[11px] font-mono text-cp-crimson">
                      ({changePct > 0 ? `+${changePct}%` : `${changePct}%`})
                    </span>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.25 }}
                className="flex items-center justify-between rounded-lg bg-cp-secondary/80 px-3 py-2"
              >
                <span className="text-xs text-cp-text-secondary">Affected Route:</span>
                <span className="font-mono text-xs text-cp-text truncate max-w-[200px]">
                  {anomaly.method ? `[${anomaly.method}] ` : ''}{anomaly.endpoint}
                </span>
              </motion.div>
            </div>

            {/* Action button */}
            <Link
              to={targetLink}
              className="group/btn flex w-full items-center justify-center gap-2 rounded-lg border border-cp-crimson/30 bg-cp-crimson/10 px-4 py-2.5 text-sm font-medium text-cp-crimson transition-all hover:bg-cp-crimson/20 hover:border-cp-crimson/50"
            >
              {anomaly.relatedIncidentId ? 'Inspect Incident' : 'View Anomaly Details'}
              <ArrowRight
                size={14}
                className="transition-transform group-hover/btn:translate-x-0.5"
              />
            </Link>
          </>
        ) : (
          <div className="flex flex-col justify-between py-2">
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">All Baselines Healthy</span>
              </div>
              <p className="text-xs text-cp-text-secondary leading-relaxed">
                No active performance anomalies or error rate deviations detected in the selected project scope and environment.
              </p>
            </div>

            <Link
              to="/anomalies"
              className="group/btn flex w-full items-center justify-center gap-2 rounded-lg border border-cp-border bg-cp-secondary px-4 py-2 text-xs font-medium text-cp-text-secondary transition-all hover:bg-cp-elevated hover:text-cp-text"
            >
              View Detection History
              <ArrowRight
                size={12}
                className="transition-transform group-hover/btn:translate-x-0.5"
              />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
