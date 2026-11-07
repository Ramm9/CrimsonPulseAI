import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ShieldOff,
  ChevronRight,
  Filter,
  Info,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { formatRelativeTime } from '@/utils/helpers'
import { anomalyService } from '@/services/anomalyService'
import type { Anomaly, AnomalySeverity } from '@/types'

type AnomalyStatus = Anomaly['status']

const severityBorderColors: Record<AnomalySeverity, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-amber-400',
  low: 'border-l-blue-400',
}

const statusConfig: Record<AnomalyStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: 'bg-red-500/10', text: 'text-red-400' },
  acknowledged: { label: 'Acknowledged', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  false_positive: { label: 'False Positive', bg: 'bg-cp-text-secondary/10', text: 'text-cp-text-secondary' },
}

function formatMetricLabel(metric: string): string {
  const m = metric.toLowerCase()
  if (m === 'p95_latency' || m.includes('latency')) return 'P95 Latency'
  if (m === 'error_rate' || m.includes('error')) return 'Error Rate'
  if (m === 'request_volume' || m.includes('volume')) return 'Request Volume'
  return metric.replace(/_/g, ' ')
}

function formatMetricValue(metric: string, value: number): string {
  const m = metric.toLowerCase()
  if (m.includes('latency')) return `${value} ms`
  if (m.includes('error')) return `${value}%`
  if (m.includes('volume') || m.includes('request')) return `${value.toLocaleString()} req/m`
  return String(value)
}

export default function AnomaliesPage() {
  const navigate = useNavigate()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'all'>('all')
  const [endpointFilter, setEndpointFilter] = useState<string>('all')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await anomalyService.getAnomalies()
        setAnomalies(data)
      } catch (err) {
        console.error('Failed to load anomalies:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const uniqueEndpoints = useMemo(
    () => Array.from(new Set(anomalies.map((a) => a.endpoint))),
    [anomalies]
  )

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (endpointFilter !== 'all' && a.endpoint !== endpointFilter) return false
      return true
    })
  }, [anomalies, severityFilter, statusFilter, endpointFilter])

  const stats = useMemo(() => {
    const total = anomalies.length
    const critical = anomalies.filter((a) => a.severity === 'critical').length
    const highAndMed = anomalies.filter((a) => a.severity === 'high' || a.severity === 'medium').length
    const falsePositives = anomalies.filter((a) => a.status === 'false_positive').length

    return [
      { label: 'Total Detected', value: total, icon: Activity, color: 'text-cp-text' },
      { label: 'Critical Severity', value: critical, icon: AlertTriangle, color: 'text-cp-critical' },
      { label: 'High / Medium Severity', value: highAndMed, icon: ShieldCheck, color: 'text-cp-warning' },
      { label: 'False Positives', value: falsePositives, icon: ShieldOff, color: 'text-cp-text-secondary' },
    ]
  }, [anomalies])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-crimson/10 text-cp-crimson">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-cp-text">AI Anomaly Intelligence</h1>
            <p className="text-sm text-cp-text-secondary">
              Unsupervised ML detection measuring statistical telemetry drift from rolling baselines
            </p>
          </div>
        </div>

        {/* Methodology info badge */}
        <div className="group relative flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text-secondary">
          <Sparkles className="h-3.5 w-3.5 text-cp-crimson" />
          <span>Isolation Forest (scikit-learn) v2.3</span>
          <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-72 rounded-lg border border-cp-border bg-cp-elevated p-3 text-left text-xs text-cp-text shadow-xl group-hover:block">
            <p className="font-semibold text-cp-crimson">Isolation Forest Algorithm</p>
            <p className="mt-1 text-cp-text-secondary">
              Scikit-learn model computes normalized anomaly scores (0.00–1.00) from recursive partition tree depths against baseline telemetry. Scores represent statistical outlier distance, not probability of failure.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-xl border border-cp-border bg-cp-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-cp-text-secondary uppercase">{stat.label}</span>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <p className={cn('mt-2 text-2xl font-bold font-mono', stat.color)}>
              {loading ? '—' : stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cp-border bg-cp-card p-4">
        <Filter className="h-4 w-4 text-cp-text-secondary" />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | 'all')}
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | 'all')}
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>

        <select
          value={endpointFilter}
          onChange={(e) => setEndpointFilter(e.target.value)}
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
        >
          <option value="all">All Endpoints</option>
          {uniqueEndpoints.map((ep) => (
            <option key={ep} value={ep}>
              {ep}
            </option>
          ))}
        </select>

        <div className="ml-auto text-xs text-cp-text-secondary font-mono">
          Showing {filteredAnomalies.length} of {anomalies.length} anomalies
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-cp-border bg-cp-card animate-pulse" />
          ))
        ) : filteredAnomalies.length === 0 ? (
          <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-cp-text-secondary/50" />
            <p className="mt-3 text-sm text-cp-text-secondary">
              No anomalies match the current filters.
            </p>
            {(severityFilter !== 'all' || statusFilter !== 'all' || endpointFilter !== 'all') && (
              <button
                onClick={() => {
                  setSeverityFilter('all')
                  setStatusFilter('all')
                  setEndpointFilter('all')
                }}
                className="mt-3 rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text hover:bg-cp-elevated transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredAnomalies.map((anomaly, i) => {
            const deviation =
              anomaly.observedValue > 0
                ? Math.min((anomaly.observedValue / (anomaly.baselineValue || 1)) * 100, 100)
                : 0
            const baselinePercent = Math.min(
              (anomaly.baselineValue / anomaly.observedValue) * 100,
              100
            )
            const sc = statusConfig[anomaly.status]

            return (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={() => navigate(`/anomalies/${anomaly.id}`)}
                className={cn(
                  'group cursor-pointer rounded-xl border border-cp-border bg-cp-card p-5 transition-all hover:border-cp-crimson/40 hover:bg-cp-elevated border-l-4',
                  severityBorderColors[anomaly.severity]
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Endpoint & Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <MethodBadge method={anomaly.method} />
                      <span className="font-mono text-sm font-semibold text-cp-text group-hover:text-cp-crimson transition-colors">
                        {anomaly.endpoint}
                      </span>
                      {/* Severity badge is separate and distinct */}
                      <SeverityBadge severity={anomaly.severity} />
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          sc.bg,
                          sc.text
                        )}
                      >
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-cp-text-secondary">
                      <span>Detected {formatRelativeTime(anomaly.detectedAt)}</span>
                      <span className="text-cp-border">•</span>
                      <span>Metric: <strong className="text-cp-text">{formatMetricLabel(anomaly.metric)}</strong></span>
                      <span className="text-cp-border">•</span>
                      <span className="font-mono text-cp-text-secondary">
                        Model {anomaly.modelVersion}
                      </span>
                    </div>

                    {/* Comparison Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cp-text-secondary">
                          Baseline:{' '}
                          <span className="font-mono text-cp-text">
                            {formatMetricValue(anomaly.metric, anomaly.baselineValue)}
                          </span>
                        </span>
                        <span className="text-cp-text-secondary">
                          Observed:{' '}
                          <span className="font-mono text-cp-crimson font-bold">
                            {formatMetricValue(anomaly.metric, anomaly.observedValue)}
                          </span>
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-cp-secondary">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/40"
                          style={{ width: `${baselinePercent}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-cp-crimson/70"
                          style={{ width: `${Math.min(deviation, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Anomaly Score (Statistical Drift Metric) */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="group/tooltip relative flex items-center gap-1.5 text-xs text-cp-text-secondary">
                        <span>Anomaly Score:</span>
                        <span className="font-mono font-bold text-cp-text">
                          {anomaly.anomalyScore.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-cp-text-secondary font-mono">/ 1.00</span>
                        <HelpCircle className="h-3.5 w-3.5 text-cp-text-secondary/70 group-hover/tooltip:text-cp-crimson cursor-help" />

                        {/* Tooltip explaining the anomaly score */}
                        <div className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-64 rounded-lg border border-cp-border bg-cp-elevated p-2.5 text-xs text-cp-text shadow-xl group-hover/tooltip:block">
                          <p className="font-semibold text-cp-text">Isolation Forest Score</p>
                          <p className="mt-1 text-[11px] text-cp-text-secondary leading-snug">
                            Normalized anomaly score between 0.00 and 1.00 computed via scikit-learn Isolation Forest. Represents partition tree isolation depth, not probability or confidence percentage.
                          </p>
                        </div>
                      </div>

                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-cp-secondary">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            anomaly.anomalyScore >= 0.8
                              ? 'bg-cp-critical'
                              : anomaly.anomalyScore >= 0.6
                                ? 'bg-cp-warning'
                                : 'bg-blue-400'
                          )}
                          style={{ width: `${anomaly.anomalyScore * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Navigate arrow */}
                  <ChevronRight className="hidden h-5 w-5 text-cp-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-cp-crimson lg:block" />
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
