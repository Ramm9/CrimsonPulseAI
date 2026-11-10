import { useState, useEffect, useCallback } from 'react'
import { Activity, AlertCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrafficChart } from '@/components/dashboard/TrafficChart'
import { AISignalCard } from '@/components/dashboard/AISignalCard'
import { EndpointHealthTable } from '@/components/dashboard/EndpointHealthTable'
import { IncidentSummaryCard } from '@/components/dashboard/IncidentSummaryCard'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { SkeletonCard, SkeletonChart } from '@/components/shared/SkeletonLoader'
import { telemetryService, type DashboardSummary } from '@/services/telemetryService'
import { endpointService } from '@/services/endpointService'
import { incidentService } from '@/services/incidentService'
import { anomalyService } from '@/services/anomalyService'
import type { MetricWindow, Endpoint, Incident, Anomaly } from '@/types'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/helpers'

export function DashboardPage() {
  const { timeRange, currentProject, currentEnvironment, projects, backendConnected } = useAppStore()
  const [metrics, setMetrics] = useState<MetricWindow[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [summary, setSummary] = useState<DashboardSummary>({
    totalRequests: 0,
    avgLatency: 0,
    p95Latency: 0,
    errorRate: 0,
    totalEndpoints: 0,
    healthyEndpoints: 0,
    requestsChange: 0,
    errorRateChange: 0,
    p95Change: 0,
    lastEventTimestamp: null,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeProject = projects.find((p) => p.id === currentProject || p.slug === currentProject)

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const projId = currentProject || undefined
      const [metricData, endpointData, incidentData, summaryData, anomalyData] = await Promise.all([
        telemetryService.getTrafficMetrics(timeRange, projId, currentEnvironment),
        endpointService.getEndpoints(projId, { environment: currentEnvironment, timeRange }),
        incidentService.getIncidents({ status: 'open', projectId: projId, environment: currentEnvironment }),
        telemetryService.getDashboardSummary(projId, currentEnvironment, timeRange),
        anomalyService.getAnomalies({ projectId: projId, environment: currentEnvironment, status: 'active', timeRange }),
      ])
      setMetrics(metricData)
      setEndpoints(endpointData)
      setIncidents(incidentData)
      setSummary(summaryData)
      setAnomalies(anomalyData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Unable to load telemetry metrics. Please ensure backend connectivity.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange, currentProject, currentEnvironment])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Compute telemetry freshness status
  let freshnessText = "No Telemetry Recorded"
  let freshnessColor = "bg-zinc-500"
  if (summary.lastEventTimestamp) {
    const lastMs = new Date(summary.lastEventTimestamp).getTime()
    const diffMins = Math.floor((Date.now() - lastMs) / 60000)
    if (diffMins < 5) {
      freshnessText = "Live Telemetry Streaming"
      freshnessColor = "bg-emerald-400 animate-pulse"
    } else if (diffMins < 60) {
      freshnessText = `Telemetry Fresh (${diffMins}m ago)`
      freshnessColor = "bg-emerald-400"
    } else if (diffMins < 1440) {
      const diffHours = Math.floor(diffMins / 60)
      freshnessText = `Telemetry Idle (${diffHours}h ago)`
      freshnessColor = "bg-amber-400"
    } else {
      const diffDays = Math.floor(diffMins / 1440)
      freshnessText = `Telemetry Stale (${diffDays}d ago)`
      freshnessColor = "bg-zinc-400"
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl">
            System Overview
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Continuous API observation, baseline validation & telemetry intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeProject && (
            <span className="rounded-lg border border-cp-border bg-cp-secondary px-2.5 py-1 text-xs font-medium text-cp-text">
              Project: <span className="text-cp-crimson font-mono">{activeProject.name}</span>
            </span>
          )}

          <span className="rounded-lg border border-cp-border bg-cp-secondary px-2.5 py-1 text-xs font-medium uppercase font-mono text-cp-text-secondary">
            Env: <span className="text-cp-text font-semibold">{currentEnvironment}</span>
          </span>

          {/* Time Range Selector */}
          <DateRangePicker />

          {/* Telemetry Freshness Indicator */}
          <div className="flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-card px-2.5 py-1 text-xs">
            <span className={cn("h-2 w-2 rounded-full", freshnessColor)} />
            <span className="font-mono text-[11px] text-cp-text-secondary">{freshnessText}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing || loading}
            title="Refresh dashboard metrics"
            className="flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-secondary px-2.5 py-1 text-xs text-cp-text-secondary hover:bg-cp-elevated hover:text-cp-text transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-cp-critical/30 bg-cp-critical/10 p-3 text-xs text-cp-critical flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadDashboardData(true)}
            className="underline hover:text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            title="Total Requests"
            value={formatNumber(summary.totalRequests)}
            change={summary.requestsChange ?? 0}
            changeLabel={
              summary.preflightRequests && summary.preflightRequests > 0
                ? `${formatNumber(summary.preflightRequests)} preflights`
                : (summary.totalRequests > 0 ? "vs previous window" : "no traffic in window")
            }
            icon={Activity}
            trend={summary.totalRequests > 0 ? "up" : "neutral"}
            tooltip={`Application Requests: ${formatNumber(summary.totalRequests)} | Preflight Requests (OPTIONS): ${formatNumber(summary.preflightRequests ?? 0)} | Total Events: ${formatNumber(summary.totalRequests + (summary.preflightRequests ?? 0))}. Policy: Preflight requests are accounted separately to avoid skewing latency and throughput curves.`}
            sparklineData={metrics.length > 0 ? metrics.map((m) => m.requests) : [0, 0, 0, 0]}
          />
          <MetricCard
            title="Error Rate"
            value={`${summary.errorRate}%`}
            change={summary.errorRateChange ?? 0}
            changeLabel={summary.clientErrorRate !== undefined ? `${summary.clientErrorRate}% 4xx · ${summary.serverErrorRate}% 5xx` : "vs previous window"}
            icon={AlertCircle}
            trend={summary.errorRate > 1.5 ? "up" : "down"}
            tooltip={`Error Rate: ${summary.errorRate}%. Breakdown: ${summary.clientErrorRate ?? 0}% client errors (HTTP 4xx) and ${summary.serverErrorRate ?? 0}% server faults (HTTP 5xx).`}
            sparklineData={metrics.length > 0 ? metrics.map((m) => m.errorRate) : [0, 0, 0, 0]}
          />
          <MetricCard
            title="P95 Latency"
            value={`${summary.p95Latency} ms`}
            change={summary.p95Change ?? 0}
            changeLabel={summary.p50Latency ? `P50: ${summary.p50Latency}ms` : "vs previous window"}
            icon={Clock}
            trend={summary.p95Latency > 600 ? "up" : "neutral"}
            tooltip={`P95 Latency: ${summary.p95Latency}ms. Median (P50): ${summary.p50Latency ?? 0}ms. Calculated using exact percentiles across observed request timings (95% of traffic completed faster than this threshold).`}
            sparklineData={metrics.length > 0 ? metrics.map((m) => m.p95Latency) : [0, 0, 0, 0]}
          />
          <MetricCard
            title="Open Incidents"
            value={String(incidents.length).padStart(2, '0')}
            change={incidents.length}
            changeLabel="active now"
            icon={AlertTriangle}
            trend={incidents.length > 0 ? "up" : "neutral"}
            tooltip={`Operational gauge: Count of currently open, unresolved incidents scoped to ${activeProject?.name || 'this project'} and environment "${currentEnvironment}" (${incidents.length} active). Represents immediate operational state.`}
          />
        </motion.div>
      )}

      {/* Middle Section: Traffic & Latency Chart + AI Signal Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <SkeletonChart className="h-[380px]" />
          ) : (
            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-cp-text">Traffic & Latency Performance</h3>
                  <p className="text-xs text-cp-text-secondary">
                    Request throughput volume vs P95 latency curve across the {timeRange} window
                  </p>
                </div>
              </div>
              <TrafficChart data={metrics} anomalies={anomalies} timeRange={timeRange} />
            </div>
          )}
        </div>
        <div className="xl:col-span-1">
          <AISignalCard anomaly={anomalies[0] || null} className="h-full" />
        </div>
      </div>

      {/* Bottom Section: Endpoint Health Table + Latest Incidents */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-cp-text">Endpoint Health</h3>
                <p className="text-xs text-cp-text-secondary">
                  Real-time health telemetry across active discovery endpoints
                </p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-10 bg-cp-elevated animate-pulse rounded" />
                <div className="h-10 bg-cp-elevated animate-pulse rounded" />
                <div className="h-10 bg-cp-elevated animate-pulse rounded" />
                <div className="h-10 bg-cp-elevated animate-pulse rounded" />
              </div>
            ) : (
              <EndpointHealthTable endpoints={endpoints} />
            )}
          </div>
        </div>
        <div className="xl:col-span-1">
          <IncidentSummaryCard incidents={incidents} />
        </div>
      </div>
    </div>
  )
}
export default DashboardPage
