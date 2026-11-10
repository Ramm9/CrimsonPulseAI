import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, Filter, Info } from 'lucide-react'
import type { Endpoint, HttpMethod } from '@/types'
import { cn } from '@/utils/cn'
import { formatNumber, formatLatency, formatPercentage } from '@/utils/helpers'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { HealthBadge } from '@/components/shared/HealthBadge'

interface EndpointHealthTableProps {
  endpoints: Endpoint[]
  className?: string
}

type SortKey = 'path' | 'requestCount' | 'p95Latency' | 'errorRate' | 'health'
type SortDirection = 'asc' | 'desc'

const healthOrder: Record<string, number> = {
  critical: 0,
  degraded: 1,
  healthy: 2,
  unknown: 3,
}

export function EndpointHealthTable({ endpoints, className }: EndpointHealthTableProps) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('requestCount')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [hidePreflight, setHidePreflight] = useState<boolean>(true)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      if (hidePreflight && ep.method === 'OPTIONS') return false
      if (methodFilter !== 'ALL' && ep.method !== methodFilter) return false
      return true
    })
  }, [endpoints, hidePreflight, methodFilter])

  const sortedEndpoints = useMemo(() => {
    return [...filteredEndpoints].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'path':
          cmp = a.path.localeCompare(b.path)
          break
        case 'requestCount':
          cmp = a.requestCount - b.requestCount
          break
        case 'p95Latency':
          cmp = a.p95Latency - b.p95Latency
          break
        case 'errorRate':
          cmp = a.errorRate - b.errorRate
          break
        case 'health':
          cmp = healthOrder[a.health] - healthOrder[b.health]
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredEndpoints, sortKey, sortDir])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ChevronDown size={12} className="text-cp-text-secondary/40" />
    }
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-cp-crimson" />
    ) : (
      <ChevronDown size={12} className="text-cp-crimson" />
    )
  }

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']

  return (
    <div className={cn('space-y-3', className)}>
      {/* Table controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <Filter size={13} className="text-cp-text-secondary mr-1" />
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[11px] transition-colors",
                methodFilter === m
                  ? "bg-cp-crimson/15 text-cp-crimson font-medium"
                  : "text-cp-text-secondary hover:text-cp-text hover:bg-cp-elevated"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-cp-text-secondary hover:text-cp-text">
          <input
            type="checkbox"
            checked={hidePreflight}
            onChange={(e) => setHidePreflight(e.target.checked)}
            className="rounded border-cp-border bg-cp-secondary text-cp-crimson focus:ring-0"
          />
          <span className="text-[11px]">Hide CORS Preflight (OPTIONS)</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cp-border">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary">
                Method
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary hover:text-cp-text"
                onClick={() => handleSort('path')}
              >
                <span className="inline-flex items-center gap-1">
                  Endpoint <SortIcon columnKey="path" />
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary hover:text-cp-text"
                onClick={() => handleSort('requestCount')}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Requests <SortIcon columnKey="requestCount" />
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary hover:text-cp-text"
                onClick={() => handleSort('p95Latency')}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  P95 Latency <SortIcon columnKey="p95Latency" />
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary hover:text-cp-text"
                onClick={() => handleSort('errorRate')}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Error Rate <SortIcon columnKey="errorRate" />
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary hover:text-cp-text"
                onClick={() => handleSort('health')}
              >
                <span className="inline-flex items-center gap-1">
                  Health <SortIcon columnKey="health" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEndpoints.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-cp-text-secondary">
                  No discovery endpoints found matching the active filter and environment.
                </td>
              </tr>
            ) : (
              sortedEndpoints.map((endpoint) => (
                <tr
                  key={endpoint.id}
                  onClick={() => {
                    navigate(`/api-explorer/${endpoint.id}`)
                  }}
                  className="group cursor-pointer border-b border-cp-border/50 transition-colors hover:bg-cp-elevated/50"
                >
                  <td className="px-4 py-3">
                    <MethodBadge method={endpoint.method} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-cp-text group-hover:text-cp-crimson transition-colors">
                    {endpoint.path}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-cp-text-secondary">
                    {formatNumber(endpoint.requestCount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-cp-text-secondary">
                    {formatLatency(endpoint.p95Latency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-cp-text-secondary">
                    {formatPercentage(endpoint.errorRate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="group/health relative inline-flex items-center gap-1.5">
                      <HealthBadge status={endpoint.health} />
                      {endpoint.healthReason && (
                        <div className="pointer-events-none absolute right-0 bottom-full z-50 mb-2 w-52 rounded-lg border border-cp-border bg-cp-elevated p-2 text-[11px] font-normal normal-case tracking-normal text-cp-text shadow-xl opacity-0 transition-opacity group-hover/health:opacity-100">
                          {endpoint.healthReason}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
