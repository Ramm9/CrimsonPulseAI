import { useState, useEffect } from 'react'
import { Activity, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrafficChart } from '@/components/dashboard/TrafficChart'
import { AISignalCard } from '@/components/dashboard/AISignalCard'
import { EndpointHealthTable } from '@/components/dashboard/EndpointHealthTable'
import { IncidentSummaryCard } from '@/components/dashboard/IncidentSummaryCard'
import { SkeletonCard, SkeletonChart } from '@/components/shared/SkeletonLoader'
import { telemetryService } from '@/services/telemetryService'
import { endpointService } from '@/services/endpointService'
import { incidentService } from '@/services/incidentService'
import type { MetricWindow, Endpoint, Incident } from '@/types'
import { useAppStore } from '@/store/appStore'

export function DashboardPage() {
  const { timeRange } = useAppStore()
  const [metrics, setMetrics] = useState<MetricWindow[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        const [metricData, endpointData, incidentData] = await Promise.all([
          telemetryService.getTrafficMetrics(timeRange),
          endpointService.getEndpoints(),
          incidentService.getIncidents({ status: 'open' }),
        ])
        setMetrics(metricData)
        setEndpoints(endpointData)
        setIncidents(incidentData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [timeRange])

  // Sparkline mock data for KPIs
  const requestSparkline = [38, 42, 45, 40, 48, 52, 58, 54, 62, 65, 68, 72]
  const errorSparkline = [0.55, 0.52, 0.48, 0.5, 0.46, 0.44, 0.42, 0.43, 0.41, 0.4, 0.42, 0.42]
  const latencySparkline = [178, 180, 182, 179, 185, 183, 188, 182, 184, 186, 183, 184]

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl">
            System Overview
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Your APIs, under continuous observation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cp-healthy animate-pulse" />
          <span className="text-xs font-mono text-cp-text-secondary">
            All telemetry ingest pipelines healthy
          </span>
        </div>
      </div>

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
            value="1.28M"
            change={12.5}
            changeLabel="vs last window"
            icon={Activity}
            trend="up"
            sparklineData={requestSparkline}
          />
          <MetricCard
            title="Error Rate"
            value="0.42%"
            change={-0.08}
            changeLabel="vs last window"
            icon={AlertCircle}
            trend="down"
            sparklineData={errorSparkline}
          />
          <MetricCard
            title="P95 Latency"
            value="184 ms"
            change={2}
            changeLabel="vs last window"
            icon={Clock}
            trend="up"
            sparklineData={latencySparkline}
          />
          <MetricCard
            title="Open Incidents"
            value="03"
            change={1}
            changeLabel="active now"
            icon={AlertTriangle}
            trend="neutral"
          />
        </motion.div>
      )}

      {/* Middle Section: Traffic & Latency Chart + AI Signal Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <SkeletonChart className="h-[380px]" />
          ) : (
            <TrafficChart data={metrics} />
          )}
        </div>
        <div className="xl:col-span-1">
          <AISignalCard className="h-full" />
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

