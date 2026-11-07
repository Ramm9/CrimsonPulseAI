import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldAlert,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { endpointService } from '@/services/endpointService'
import { anomalyService } from '@/services/anomalyService'
import { contractService } from '@/services/contractService'
import type { Endpoint, Anomaly, ContractViolation, MetricWindow } from '@/types'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { HealthBadge } from '@/components/shared/HealthBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { formatNumber, formatLatency, formatPercentage, formatRelativeTime, formatTimestamp } from '@/utils/helpers'

export function EndpointDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null)
  const [metrics, setMetrics] = useState<MetricWindow[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [violations, setViolations] = useState<ContractViolation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEndpointData() {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [ep, metricData, anomalyList, violationList] = await Promise.all([
          endpointService.getEndpoint(id),
          endpointService.getEndpointMetrics(id, '24h'),
          anomalyService.getAnomalies({ endpointId: id }),
          contractService.getViolations(),
        ])
        if (ep) {
          setEndpoint(ep)
          // Filter violations that match this endpoint path
          setViolations(violationList.filter((v: ContractViolation) => v.endpoint === ep.path))
        }
        setMetrics(metricData)
        setAnomalies(anomalyList)
      } catch (err) {
        console.error('Failed to load endpoint details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadEndpointData()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-cp-elevated animate-pulse rounded" />
        <div className="h-28 bg-cp-card animate-pulse rounded-xl" />
        <div className="h-72 bg-cp-card animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!endpoint) {
    return (
      <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
        <h2 className="text-xl font-bold text-cp-text">Endpoint Not Found</h2>
        <p className="mt-2 text-sm text-cp-text-secondary">
          No telemetry stream discovered for endpoint ID {id}.
        </p>
        <button
          onClick={() => navigate('/api-explorer')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to API Explorer
        </button>
      </div>
    )
  }

  // Simulated recent requests
  const recentRequests = [
    { id: 'req_1', statusCode: 200, latency: 85, time: '20s ago', ip: '10.0.4.12' },
    { id: 'req_2', statusCode: 200, latency: 92, time: '45s ago', ip: '10.0.4.19' },
    { id: 'req_3', statusCode: endpoint.errorRate > 1.0 ? 500 : 200, latency: 310, time: '1m ago', ip: '10.0.2.8' },
    { id: 'req_4', statusCode: 200, latency: 78, time: '1m ago', ip: '10.0.1.15' },
    { id: 'req_5', statusCode: 201, latency: 110, time: '2m ago', ip: '10.0.8.22' },
    { id: 'req_6', statusCode: 400, latency: 45, time: '3m ago', ip: '10.0.3.5' },
    { id: 'req_7', statusCode: 200, latency: 88, time: '3m ago', ip: '10.0.4.12' },
  ]

  const totalStatus =
    endpoint.statusDistribution['2xx'] +
    endpoint.statusDistribution['3xx'] +
    endpoint.statusDistribution['4xx'] +
    endpoint.statusDistribution['5xx'] || 1

  const p2xx = Math.round((endpoint.statusDistribution['2xx'] / totalStatus) * 100)
  const p3xx = Math.round((endpoint.statusDistribution['3xx'] / totalStatus) * 100)
  const p4xx = Math.round((endpoint.statusDistribution['4xx'] / totalStatus) * 100)
  const p5xx = Math.round((endpoint.statusDistribution['5xx'] / totalStatus) * 100)

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Title */}
      <div>
        <button
          onClick={() => navigate('/api-explorer')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-cp-text-secondary hover:text-cp-text transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to API Explorer
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MethodBadge method={endpoint.method} />
            <h1 className="font-mono text-xl font-bold text-cp-text sm:text-2xl">{endpoint.path}</h1>
            <HealthBadge status={endpoint.health} />
          </div>
          <div className="text-xs text-cp-text-secondary">
            Last active: <strong className="text-cp-text">{formatRelativeTime(endpoint.lastActivity)}</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary">REQUEST VOLUME</div>
          <div className="mt-2 text-xl font-bold font-mono text-cp-text">
            {formatNumber(endpoint.requestCount)}
          </div>
          <div className="mt-1 text-xs text-cp-healthy">24h active window</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary">P50 LATENCY</div>
          <div className="mt-2 text-xl font-bold font-mono text-cp-healthy">
            {formatLatency(endpoint.p50Latency)}
          </div>
          <div className="mt-1 text-xs text-cp-text-secondary">Median duration</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary">P95 LATENCY</div>
          <div className="mt-2 text-xl font-bold font-mono text-cp-crimson">
            {formatLatency(endpoint.p95Latency)}
          </div>
          <div className="mt-1 text-xs text-cp-text-secondary">Tail performance</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary">P99 LATENCY</div>
          <div className="mt-2 text-xl font-bold font-mono text-purple-400">
            {formatLatency(endpoint.p99Latency)}
          </div>
          <div className="mt-1 text-xs text-cp-text-secondary">Max percentile</div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4">
          <div className="text-xs text-cp-text-secondary">ERROR RATE</div>
          <div className="mt-2 text-xl font-bold font-mono text-cp-warning">
            {formatPercentage(endpoint.errorRate)}
          </div>
          <div className="mt-1 text-xs text-cp-text-secondary">4xx/5xx responses</div>
        </div>
      </div>

      {/* Status Code Distribution Bar */}
      <div className="rounded-xl border border-cp-border bg-cp-card p-5">
        <h3 className="text-sm font-semibold text-cp-text mb-3">HTTP Status Distribution</h3>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-cp-secondary">
          <div style={{ width: `${p2xx}%` }} className="bg-cp-healthy" title={`2xx: ${p2xx}%`} />
          <div style={{ width: `${p3xx}%` }} className="bg-blue-400" title={`3xx: ${p3xx}%`} />
          <div style={{ width: `${p4xx}%` }} className="bg-cp-warning" title={`4xx: ${p4xx}%`} />
          <div style={{ width: `${p5xx}%` }} className="bg-cp-critical" title={`5xx: ${p5xx}%`} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-cp-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cp-healthy" />
            <span>2xx OK: {p2xx}% ({formatNumber(endpoint.statusDistribution['2xx'])})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span>3xx Redirect: {p3xx}% ({formatNumber(endpoint.statusDistribution['3xx'])})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cp-warning" />
            <span>4xx Client Err: {p4xx}% ({formatNumber(endpoint.statusDistribution['4xx'])})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cp-critical" />
            <span>5xx Server Err: {p5xx}% ({formatNumber(endpoint.statusDistribution['5xx'])})</span>
          </div>
        </div>
      </div>

      {/* Latency & Throughput Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-cp-border bg-cp-card p-5">
          <h3 className="text-sm font-semibold text-cp-text mb-4">Request Throughput (24 Hours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="epReqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#969AA5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#969AA5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#969AA5" fontSize={11} tickLine={false} />
                <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#969AA5"
                  strokeWidth={2}
                  fill="url(#epReqGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-5">
          <h3 className="text-sm font-semibold text-cp-text mb-4">Latency Percentiles (P50, P95, P99)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#969AA5" fontSize={11} tickLine={false} />
                <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                <Line
                  type="monotone"
                  dataKey="p95Latency"
                  stroke="#E63946"
                  strokeWidth={2}
                  dot={false}
                  name="P95 Latency (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="p50Latency"
                  stroke="#48C78E"
                  strokeWidth={1.5}
                  dot={false}
                  name="P50 Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Requests Stream */}
      <div className="rounded-xl border border-cp-border bg-cp-card overflow-hidden">
        <div className="p-4 border-b border-cp-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-cp-text">Sample Telemetry Requests</h3>
          <span className="text-xs text-cp-text-secondary">Simulated real-time request telemetry stream</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-cp-secondary/80 text-cp-text-secondary uppercase">
              <tr>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Method & Path</th>
                <th className="py-2.5 px-4 text-right">Response Time</th>
                <th className="py-2.5 px-4 text-right">Caller IP</th>
                <th className="py-2.5 px-4 text-right font-sans">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/40">
              {recentRequests.map((r) => (
                <tr key={r.id} className="hover:bg-cp-elevated/40">
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold ${
                        r.statusCode >= 500
                          ? 'bg-cp-critical/10 text-cp-critical'
                          : r.statusCode >= 400
                          ? 'bg-cp-warning/10 text-cp-warning'
                          : 'bg-cp-healthy/10 text-cp-healthy'
                      }`}
                    >
                      {r.statusCode}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-cp-text">
                    <span className="text-cp-crimson font-semibold">{endpoint.method}</span> {endpoint.path}
                  </td>
                  <td className="py-2.5 px-4 text-right text-cp-text">{r.latency} ms</td>
                  <td className="py-2.5 px-4 text-right text-cp-text-secondary">{r.ip}</td>
                  <td className="py-2.5 px-4 text-right text-cp-text-secondary font-sans">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalies and Contract Violations side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Anomalies Section */}
        <div className="rounded-xl border border-cp-border bg-cp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-cp-crimson" /> Anomaly History
            </h3>
            <span className="text-xs text-cp-text-secondary">{anomalies.length} recorded</span>
          </div>
          {anomalies.length === 0 ? (
            <div className="py-8 text-center text-xs text-cp-text-secondary">
              No anomalies flagged for this endpoint.
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  onClick={() => navigate(`/anomalies/${anom.id}`)}
                  className="cursor-pointer rounded-lg border border-cp-border/60 bg-cp-secondary/50 p-3 hover:border-cp-crimson/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cp-text">{anom.description}</span>
                    <SeverityBadge severity={anom.severity} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-cp-text-secondary font-mono">
                    <span>Baseline: {anom.baselineValue}ms</span>
                    <span className="text-cp-crimson font-bold">Observed: {anom.observedValue}ms</span>
                    <span>Score: {anom.anomalyScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contract Violations Section */}
        <div className="rounded-xl border border-cp-border bg-cp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
              <FileCode className="h-4 w-4 text-cp-warning" /> Contract Violations
            </h3>
            <span className="text-xs text-cp-text-secondary">{violations.length} recorded</span>
          </div>
          {violations.length === 0 ? (
            <div className="py-8 text-center text-xs text-cp-text-secondary">
              Payload conforms perfectly with registered OpenAPI specification.
            </div>
          ) : (
            <div className="space-y-3">
              {violations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border border-cp-border/60 bg-cp-secondary/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-cp-warning uppercase">
                      {v.type.replace('_', ' ')}: {v.field}
                    </span>
                    <span className="text-[10px] text-cp-text-secondary">
                      {formatRelativeTime(v.detectedAt)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="rounded bg-cp-card p-1.5 border border-cp-border">
                      <span className="text-cp-healthy">Expected:</span> {v.expected}
                    </div>
                    <div className="rounded bg-cp-card p-1.5 border border-cp-border">
                      <span className="text-cp-critical">Observed:</span> {v.observed}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default EndpointDetailsPage
