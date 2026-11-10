import { useState, useEffect, useRef } from 'react'
import {
  Radio,
  Play,
  Pause,
  Filter,
  Trash2,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { telemetryService } from '@/services/telemetryService'
import { isDemoModeActive } from '@/services/api'
import type { TelemetryEvent, HttpMethod, EnvironmentType } from '@/types'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatNumber } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function LiveTrafficPage() {
  const currentProject = useAppStore((s) => s.currentProject)
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [isLive, setIsLive] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')

  const intervalRef = useRef<number | null>(null)

  // Initialize with initial telemetry events
  useEffect(() => {
    async function loadInitial() {
      const initial = await telemetryService.getLiveTraffic(50, currentProject || undefined)
      setEvents(initial)
    }
    loadInitial()
  }, [currentProject])

  // Auto-stream events when isLive: in demo mode, synthesizes events; in live mode, polls real telemetry
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    if (isDemoModeActive()) {
      intervalRef.current = window.setInterval(async () => {
        const newEvent = await telemetryService.generateLiveEvent(currentProject || undefined)
        setEvents((prev) => [newEvent, ...prev.slice(0, 99)])
      }, 1800)
    } else {
      intervalRef.current = window.setInterval(async () => {
        const liveFeed = await telemetryService.getLiveTraffic(50, currentProject || undefined)
        setEvents(liveFeed)
      }, 3000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLive, currentProject])

  const clearEvents = () => {
    setEvents([])
  }

  // Filtered list
  const filteredEvents = events.filter((ev) => {
    if (search && !ev.endpoint.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (methodFilter !== 'all' && ev.method !== methodFilter) {
      return false
    }
    if (environmentFilter !== 'all' && ev.environment !== environmentFilter) {
      return false
    }
    if (statusFilter !== 'all') {
      const codeStr = ev.statusCode.toString()
      if (statusFilter === '2xx' && !codeStr.startsWith('2')) return false
      if (statusFilter === '3xx' && !codeStr.startsWith('3')) return false
      if (statusFilter === '4xx' && !codeStr.startsWith('4')) return false
      if (statusFilter === '5xx' && !codeStr.startsWith('5')) return false
    }
    return true
  })

  // Quick stats computed from current event buffer
  const serverErrors5xx = events.filter((e) => e.statusCode >= 500).length
  const clientErrors4xx = events.filter((e) => e.statusCode >= 400 && e.statusCode < 500).length
  const avgResponse =
    events.length > 0
      ? Math.round(events.reduce((acc, e) => acc + e.responseTime, 0) / events.length)
      : 0

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
              <Radio className="h-7 w-7 text-cp-crimson" />
              Live Traffic Stream
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-cp-elevated px-2.5 py-1 text-xs border border-cp-border">
              <span
                className={`h-2 w-2 rounded-full ${
                  isLive ? 'bg-cp-healthy animate-pulse' : 'bg-cp-text-secondary'
                }`}
              />
              <span className="font-mono uppercase font-semibold text-cp-text">
                {isLive ? 'Streaming' : 'Paused'}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-cp-text-secondary">
            Simulated live telemetry stream • Connect the CrimsonPulse Python SDK for production ingress
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              isLive
                ? 'bg-cp-elevated border border-cp-border text-cp-text hover:bg-cp-border'
                : 'bg-cp-crimson text-white hover:bg-cp-red'
            }`}
          >
            {isLive ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause Stream
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Resume Stream
              </>
            )}
          </button>

          <button
            onClick={clearEvents}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-card px-3 py-2 text-xs text-cp-text-secondary hover:text-cp-text hover:bg-cp-elevated transition-colors"
            title="Clear buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary uppercase">BUFFERED REQUESTS</div>
          <div className="mt-1 text-xl font-bold font-mono text-cp-text">{events.length} / 100</div>
          <div className="mt-0.5 text-[10px] text-cp-text-secondary">Rolling memory buffer</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary uppercase">AVG LATENCY</div>
          <div className="mt-1 text-xl font-bold font-mono text-cp-healthy">{avgResponse} ms</div>
          <div className="mt-0.5 text-[10px] text-cp-healthy">Nominal throughput</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary uppercase">5xx SERVER FAULTS</div>
          <div className="mt-1 text-xl font-bold font-mono text-cp-critical">{serverErrors5xx}</div>
          <div className="mt-0.5 text-[10px] text-cp-critical">Critical infrastructure errors</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary uppercase">4xx CLIENT ERRORS</div>
          <div className="mt-1 text-xl font-bold font-mono text-cp-warning">{clientErrors4xx}</div>
          <div className="mt-0.5 text-[10px] text-cp-text-secondary">Expected route/auth client errors</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter by endpoint path..."
            className="w-full sm:w-72"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Status Codes</option>
            <option value="2xx">2xx Success</option>
            <option value="3xx">3xx Redirect</option>
            <option value="4xx">4xx Client Error</option>
            <option value="5xx">5xx Server Error</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>

        <div className="text-xs text-cp-text-secondary font-mono">
          Showing {filteredEvents.length} events
        </div>
      </div>

      {/* Live Table */}
      <div className="rounded-xl border border-cp-border bg-cp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-cp-secondary/80 text-cp-text-secondary uppercase select-none border-b border-cp-border">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Endpoint</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Latency</th>
                <th className="py-2.5 px-4 text-center">Environment</th>
                <th className="py-2.5 px-4">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/30">
              <AnimatePresence initial={false}>
                {filteredEvents.map((ev) => {
                  const is5xx = ev.statusCode >= 500
                  const is4xx = ev.statusCode >= 400 && ev.statusCode < 500
                  const is2xx = ev.statusCode >= 200 && ev.statusCode < 300

                  return (
                    <motion.tr
                      key={ev.id}
                      initial={{ opacity: 0, y: -6, backgroundColor: 'rgba(230, 57, 70, 0.15)' }}
                      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-cp-elevated/40"
                    >
                      <td className="py-2 px-4 text-cp-text-secondary whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-4">
                        <MethodBadge method={ev.method} />
                      </td>
                      <td className="py-2 px-4 font-semibold text-cp-text">
                        {ev.endpoint}
                        {ev.error && (
                          <div
                            className={`mt-0.5 text-[10px] font-normal ${
                              is5xx ? 'text-cp-critical font-medium' : 'text-cp-warning'
                            }`}
                          >
                            {is4xx ? `Client: ${ev.error}` : `Fault: ${ev.error}`}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span
                          title={
                            is5xx
                              ? 'HTTP 5xx: Server fault'
                              : is4xx
                              ? 'HTTP 4xx: Client request error'
                              : 'HTTP 2xx: Success'
                          }
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                            is5xx
                              ? 'bg-cp-critical/15 text-cp-critical border border-cp-critical/30'
                              : is4xx
                              ? 'bg-cp-warning/15 text-cp-warning'
                              : is2xx
                              ? 'bg-cp-healthy/15 text-cp-healthy'
                              : 'bg-blue-400/15 text-blue-400'
                          }`}
                        >
                          {ev.statusCode}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-medium">
                        <span
                          className={
                            ev.responseTime > 800
                              ? 'text-cp-critical font-bold'
                              : ev.responseTime > 300
                              ? 'text-cp-warning'
                              : 'text-cp-healthy'
                          }
                        >
                          {ev.responseTime} ms
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center font-sans">
                        <span className="rounded-full bg-cp-elevated px-2 py-0.5 text-[10px] text-cp-text-secondary capitalize">
                          {ev.environment}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-cp-text-secondary text-[11px]">
                        {ev.appVersion}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default LiveTrafficPage

