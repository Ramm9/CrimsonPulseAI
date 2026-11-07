import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { formatRelativeTime, getTimeAgo, getHoursAgo, getDaysAgo } from '@/utils/helpers'
import type { Anomaly, AnomalySeverity, HttpMethod } from '@/types'

type AnomalyStatus = Anomaly['status']

const mockAnomalies: Anomaly[] = [
  {
    id: 'anom-001',
    projectId: 'proj-001',
    endpointId: 'ep-001',
    endpoint: '/api/orders/',
    method: 'POST',
    severity: 'critical',
    metric: 'P95 Latency',
    baselineValue: 180,
    observedValue: 2100,
    anomalyScore: 0.94,
    modelVersion: 'v2.3.1',
    description: 'P95 latency surged from 180ms to 2,100ms on the orders endpoint.',
    detectedAt: getTimeAgo(12).toISOString(),
    status: 'active',
    relatedIncidentId: 'inc-001',
  },
  {
    id: 'anom-002',
    projectId: 'proj-001',
    endpointId: 'ep-002',
    endpoint: '/api/payments/',
    method: 'POST',
    severity: 'high',
    metric: 'Error Rate',
    baselineValue: 0.5,
    observedValue: 8.2,
    anomalyScore: 0.89,
    modelVersion: 'v2.3.1',
    description: 'Error rate increased from 0.5% to 8.2% on the payments endpoint.',
    detectedAt: getTimeAgo(45).toISOString(),
    status: 'active',
  },
  {
    id: 'anom-003',
    projectId: 'proj-001',
    endpointId: 'ep-003',
    endpoint: '/api/search',
    method: 'GET',
    severity: 'medium',
    metric: 'P95 Latency',
    baselineValue: 120,
    observedValue: 850,
    anomalyScore: 0.76,
    modelVersion: 'v2.3.1',
    description: 'P95 latency increased from 120ms to 850ms on the search endpoint.',
    detectedAt: getHoursAgo(3).toISOString(),
    status: 'acknowledged',
  },
  {
    id: 'anom-004',
    projectId: 'proj-001',
    endpointId: 'ep-004',
    endpoint: '/api/users/{id}/',
    method: 'GET',
    severity: 'medium',
    metric: 'P95 Latency',
    baselineValue: 45,
    observedValue: 320,
    anomalyScore: 0.65,
    modelVersion: 'v2.3.1',
    description: 'P95 latency rose from 45ms to 320ms on the users endpoint.',
    detectedAt: getDaysAgo(1).toISOString(),
    status: 'resolved',
  },
  {
    id: 'anom-005',
    projectId: 'proj-001',
    endpointId: 'ep-005',
    endpoint: '/api/inventory/',
    method: 'GET',
    severity: 'low',
    metric: 'Error Rate',
    baselineValue: 0.08,
    observedValue: 2.1,
    anomalyScore: 0.58,
    modelVersion: 'v2.3.1',
    description: 'Error rate climbed from 0.08% to 2.1% on the inventory endpoint.',
    detectedAt: getHoursAgo(6).toISOString(),
    status: 'active',
  },
  {
    id: 'anom-006',
    projectId: 'proj-001',
    endpointId: 'ep-006',
    endpoint: '/api/webhooks/',
    method: 'POST',
    severity: 'low',
    metric: 'P95 Latency',
    baselineValue: 95,
    observedValue: 180,
    anomalyScore: 0.32,
    modelVersion: 'v2.3.1',
    description: 'P95 latency increased modestly from 95ms to 180ms on the webhooks endpoint.',
    detectedAt: getDaysAgo(2).toISOString(),
    status: 'false_positive',
  },
]

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

function formatMetricValue(metric: string, value: number): string {
  if (metric.toLowerCase().includes('latency')) return `${value}ms`
  if (metric.toLowerCase().includes('error')) return `${value}%`
  return String(value)
}

export default function AnomaliesPage() {
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'all'>('all')
  const [endpointFilter, setEndpointFilter] = useState<string>('all')

  const uniqueEndpoints = useMemo(
    () => Array.from(new Set(mockAnomalies.map((a) => a.endpoint))),
    []
  )

  const filteredAnomalies = useMemo(() => {
    return mockAnomalies.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (endpointFilter !== 'all' && a.endpoint !== endpointFilter) return false
      return true
    })
  }, [severityFilter, statusFilter, endpointFilter])

  const stats = [
    { label: 'Total Detected', value: 24, icon: Activity, color: 'text-cp-text' },
    { label: 'Critical', value: 3, icon: AlertTriangle, color: 'text-cp-critical' },
    { label: 'Medium', value: 12, icon: ShieldCheck, color: 'text-cp-warning' },
    { label: 'False Positives', value: 2, icon: ShieldOff, color: 'text-cp-text-secondary' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-crimson/10">
          <BrainCircuit className="h-5 w-5 text-cp-crimson" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-cp-text">AI Anomaly Intelligence</h1>
          <p className="text-sm text-cp-text-secondary">
            ML-powered anomaly detection across your API surface
          </p>
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
              <span className="text-sm text-cp-text-secondary">{stat.label}</span>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <p className={cn('mt-2 text-3xl font-bold font-mono', stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cp-border bg-cp-card p-4">
        <Filter className="h-4 w-4 text-cp-text-secondary" />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | 'all')}
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
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
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
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
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
        >
          <option value="all">All Endpoints</option>
          {uniqueEndpoints.map((ep) => (
            <option key={ep} value={ep}>
              {ep}
            </option>
          ))}
        </select>
      </div>

      {/* Anomaly Cards */}
      <div className="space-y-3">
        {filteredAnomalies.map((anomaly, i) => {
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
                'group cursor-pointer rounded-xl border border-cp-border bg-cp-card p-5 transition-all hover:border-cp-crimson/30 hover:bg-cp-elevated border-l-4',
                severityBorderColors[anomaly.severity]
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Endpoint & Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <MethodBadge method={anomaly.method} />
                    <span className="font-mono text-sm text-cp-text">{anomaly.endpoint}</span>
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
                    <span>Metric: {anomaly.metric}</span>
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
                        <span className="font-mono text-cp-crimson">
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

                  {/* Anomaly Score */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-cp-text-secondary">
                      Model Score:{' '}
                      <span className="font-mono font-semibold text-cp-text">
                        {(anomaly.anomalyScore * 100).toFixed(0)}%
                      </span>
                    </span>
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
        })}

        {filteredAnomalies.length === 0 && (
          <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-cp-text-secondary/50" />
            <p className="mt-3 text-sm text-cp-text-secondary">
              No anomalies match the current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
