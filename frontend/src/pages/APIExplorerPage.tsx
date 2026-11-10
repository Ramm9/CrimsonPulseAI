import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass,
  ArrowUpDown,
  ChevronDown,
  Layers,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { endpointService } from '@/services/endpointService'
import type { Endpoint, HttpMethod, HealthStatus } from '@/types'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { HealthBadge } from '@/components/shared/HealthBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatNumber, formatLatency, formatPercentage, formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

type SortField = 'requestCount' | 'p95Latency' | 'avgLatency' | 'errorRate' | 'path'
type SortOrder = 'asc' | 'desc'

export function APIExplorerPage() {
  const navigate = useNavigate()
  const currentProject = useAppStore((s) => s.currentProject)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [healthFilter, setHealthFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('requestCount')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    async function loadEndpoints() {
      setLoading(true)
      try {
        const data = await endpointService.getEndpoints(currentProject || undefined)
        setEndpoints(data)
      } catch (err) {
        console.error('Failed to load endpoints:', err)
      } finally {
        setLoading(false)
      }
    }
    loadEndpoints()
  }, [currentProject])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredEndpoints = useMemo(() => {
    return endpoints
      .filter((ep) => {
        if (search) {
          const q = search.toLowerCase()
          if (!ep.path.toLowerCase().includes(q) && !ep.method.toLowerCase().includes(q)) {
            return false
          }
        }
        if (methodFilter !== 'all' && ep.method !== methodFilter) {
          return false
        }
        if (healthFilter !== 'all' && ep.health !== healthFilter) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        let valA = a[sortField]
        let valB = b[sortField]
        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string)
        }
        return sortOrder === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      })
  }, [endpoints, search, methodFilter, healthFilter, sortField, sortOrder])

  // Aggregate stats
  const totalRequests = endpoints.reduce((acc, ep) => acc + ep.requestCount, 0)
  const avgP95 =
    endpoints.length > 0
      ? Math.round(endpoints.reduce((acc, ep) => acc + ep.p95Latency, 0) / endpoints.length)
      : 0
  const degradedCount = endpoints.filter((ep) => ep.health !== 'healthy').length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
            <Compass className="h-7 w-7 text-cp-crimson" />
            API Explorer
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Automatic endpoint discovery, service telemetry, and contract performance tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-cp-elevated px-3 py-1.5 font-mono text-xs text-cp-text border border-cp-border">
            Total Endpoints: <strong className="text-cp-crimson">{endpoints.length}</strong>
          </span>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-elevated text-cp-crimson">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">DISCOVERED TRAFFIC</div>
            <div className="text-xl font-bold text-cp-text">{formatNumber(totalRequests)} reqs</div>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-elevated text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">AVG P95 LATENCY</div>
            <div className="text-xl font-bold text-cp-text">{avgP95} ms</div>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-elevated text-cp-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">NEEDS ATTENTION</div>
            <div className="text-xl font-bold text-cp-text">{degradedCount} Endpoints</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search endpoint path (e.g. /api/orders)..."
            className="w-full sm:w-80"
          />

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All HTTP Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Health States</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="text-xs text-cp-text-secondary">
          Showing <span className="text-cp-text font-medium">{filteredEndpoints.length}</span> of {endpoints.length} endpoints
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="rounded-xl border border-cp-border bg-cp-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cp-border bg-cp-secondary/80 text-cp-text-secondary uppercase select-none">
              <tr>
                <th className="py-3 px-4">Method</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-cp-text"
                  onClick={() => handleSort('path')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Endpoint Path</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-cp-text"
                  onClick={() => handleSort('requestCount')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Requests</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-cp-text"
                  onClick={() => handleSort('avgLatency')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Avg Latency</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-cp-text"
                  onClick={() => handleSort('p95Latency')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>P95 Latency</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-cp-text"
                  onClick={() => handleSort('errorRate')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Error Rate</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Health</th>
                <th className="py-3 px-4 text-right">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/40 font-mono">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-cp-elevated animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm font-sans text-cp-text-secondary">
                    <p>No API endpoints matched your search criteria.</p>
                    {(search || methodFilter !== 'all' || healthFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearch('')
                          setMethodFilter('all')
                          setHealthFilter('all')
                        }}
                        className="mt-3 rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-xs text-cp-text hover:bg-cp-elevated transition-colors"
                      >
                        Reset Search Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEndpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() => navigate(`/api-explorer/${ep.id}`)}
                    className="cursor-pointer hover:bg-cp-elevated/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <MethodBadge method={ep.method} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-cp-text group-hover:text-cp-crimson transition-colors">
                      {ep.path}
                    </td>
                    <td className="py-3.5 px-4 text-right text-cp-text">
                      {formatNumber(ep.requestCount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-cp-text-secondary">
                      {formatLatency(ep.avgLatency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-cp-text">
                      {formatLatency(ep.p95Latency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={
                          ep.errorRate > 1.0
                            ? 'text-cp-critical font-bold'
                            : ep.errorRate > 0.3
                            ? 'text-cp-warning'
                            : 'text-cp-healthy'
                        }
                      >
                        {formatPercentage(ep.errorRate)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <HealthBadge status={ep.health} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-cp-text-secondary font-sans text-xs">
                      {formatRelativeTime(ep.lastActivity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default APIExplorerPage

