import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { Endpoint } from '@/types'
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
  const [sortKey, setSortKey] = useState<SortKey>('requestCount')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedEndpoints = useMemo(() => {
    return [...endpoints].sort((a, b) => {
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
  }, [endpoints, sortKey, sortDir])

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

  return (
    <div className={cn('overflow-x-auto', className)}>
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
          {sortedEndpoints.map((endpoint) => (
            <tr
              key={endpoint.id}
              onClick={() => {
                window.location.href = `/api-explorer/${endpoint.id}`
              }}
              className="cursor-pointer border-b border-cp-border/50 transition-colors hover:bg-cp-elevated/50"
            >
              <td className="px-4 py-3">
                <MethodBadge method={endpoint.method} />
              </td>
              <td className="px-4 py-3 font-mono text-sm text-cp-text">
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
                <HealthBadge status={endpoint.health} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
