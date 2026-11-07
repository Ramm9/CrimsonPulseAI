import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
} from 'recharts'
import type { MetricWindow } from '@/types'
import { cn } from '@/utils/cn'
import { formatNumber, formatLatency, formatPercentage } from '@/utils/helpers'
import { format } from 'date-fns'

interface TrafficChartProps {
  data: MetricWindow[]
  className?: string
}

interface ChartDataPoint {
  timestamp: string
  hour: string
  requests: number
  p95Latency: number
  errorRate: number
  anomaly?: number | null
}

interface CustomTooltipPayloadItem {
  dataKey: string
  value: number
  color: string
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-cp-border bg-cp-elevated px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-cp-text-secondary">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          if (entry.dataKey === 'anomaly') return null
          let formattedValue: string
          switch (entry.dataKey) {
            case 'requests':
              formattedValue = formatNumber(entry.value)
              break
            case 'p95Latency':
              formattedValue = formatLatency(entry.value)
              break
            case 'errorRate':
              formattedValue = formatPercentage(entry.value)
              break
            default:
              formattedValue = String(entry.value)
          }
          return (
            <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-cp-text-secondary">{entry.name}:</span>
              <span className="font-medium text-cp-text">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DiamondDotProps {
  cx?: number
  cy?: number
  payload?: ChartDataPoint
}

function AnomalyDot({ cx, cy, payload }: DiamondDotProps) {
  if (!payload?.anomaly || cx === undefined || cy === undefined) return null

  return (
    <g>
      <polygon
        points={`${cx},${cy - 8} ${cx + 6},${cy} ${cx},${cy + 8} ${cx - 6},${cy}`}
        fill="#E63946"
        stroke="#090A0D"
        strokeWidth={1.5}
      />
      <polygon
        points={`${cx},${cy - 8} ${cx + 6},${cy} ${cx},${cy + 8} ${cx - 6},${cy}`}
        fill="#E63946"
        opacity={0.4}
        className="animate-pulse"
      />
    </g>
  )
}

export function TrafficChart({ data, className }: TrafficChartProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d, index) => {
      const date = new Date(d.timestamp)
      const isAnomaly = d.p95Latency > 500 || d.errorRate > 3
      return {
        timestamp: d.timestamp,
        hour: format(date, 'HH:mm'),
        requests: d.requests,
        p95Latency: d.p95Latency,
        errorRate: d.errorRate,
        anomaly: isAnomaly ? d.p95Latency : null,
        index,
      }
    })
  }, [data])

  return (
    <div className={cn('h-[340px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#969AA5" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#969AA5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E63946" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#E63946" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#292C35"
            vertical={false}
          />

          <XAxis
            dataKey="hour"
            tick={{ fill: '#969AA5', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#292C35' }}
            interval="preserveStartEnd"
          />

          <YAxis
            yAxisId="left"
            tick={{ fill: '#969AA5', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#969AA5', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}ms`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              paddingTop: '12px',
              fontSize: '12px',
            }}
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-cp-text-secondary">{value}</span>
            )}
          />

          {/* Request count area */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            name="Requests"
            stroke="#969AA5"
            strokeWidth={1.5}
            fill="url(#requestsGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#969AA5', stroke: '#090A0D', strokeWidth: 2 }}
          />

          {/* P95 Latency line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="p95Latency"
            name="P95 Latency"
            stroke="#E63946"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#E63946', stroke: '#090A0D', strokeWidth: 2 }}
          />

          {/* Anomaly scatter markers */}
          <Scatter
            yAxisId="right"
            dataKey="anomaly"
            name="Anomaly"
            fill="#E63946"
            shape={<AnomalyDot />}
            legendType="diamond"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
