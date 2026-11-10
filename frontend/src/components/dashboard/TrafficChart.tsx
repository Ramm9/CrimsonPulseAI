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
import type { MetricWindow, Anomaly } from '@/types'
import { cn } from '@/utils/cn'
import { formatNumber, formatLatency, formatPercentage } from '@/utils/helpers'
import { format } from 'date-fns'

interface TrafficChartProps {
  data: MetricWindow[]
  anomalies?: Anomaly[]
  timeRange?: string
  className?: string
}

interface ChartDataPoint {
  timestamp: string
  hour: string
  requests: number
  p95Latency: number
  errorRate: number
  anomaly?: number | null
  anomalyDescription?: string
  index: number
}

interface CustomTooltipPayloadItem {
  dataKey: string
  value: number
  color: string
  name: string
  payload?: ChartDataPoint
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const pointPayload = payload[0]?.payload

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
        {pointPayload?.anomaly && (
          <div className="mt-2 border-t border-cp-border/60 pt-1.5 flex items-center gap-1.5 text-xs text-cp-critical font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-cp-critical animate-ping" />
            <span>Anomaly: {pointPayload.anomalyDescription || 'Observed deviation from baseline'}</span>
          </div>
        )}
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
    <g className="cursor-pointer">
      <title>{payload.anomalyDescription || "Anomaly Marker"}</title>
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

export function TrafficChart({ data, anomalies = [], timeRange = '24h', className }: TrafficChartProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    const isMultiDay = timeRange === '7d' || timeRange === '30d'

    return data.map((d, index) => {
      const date = new Date(d.timestamp)
      const hourFormat = isMultiDay ? 'MMM dd HH:mm' : 'HH:mm'

      // Match against genuine anomalies
      const bucketTime = date.getTime()
      const stepMs = data.length > 1
        ? (new Date(data[1].timestamp).getTime() - new Date(data[0].timestamp).getTime())
        : 3600000

      const matchedAnomaly = anomalies.find((a) => {
        const aTime = new Date(a.detectedAt).getTime()
        return aTime >= bucketTime && aTime < bucketTime + stepMs
      })

      const isAnomaly = matchedAnomaly !== undefined || (d.errorRate > 10 && d.requests > 3)

      return {
        timestamp: d.timestamp,
        hour: format(date, hourFormat),
        requests: d.requests,
        p95Latency: d.p95Latency,
        errorRate: d.errorRate,
        anomaly: isAnomaly ? d.p95Latency : null,
        anomalyDescription: matchedAnomaly ? matchedAnomaly.description : undefined,
        index,
      }
    })
  }, [data, anomalies, timeRange])

  const hasTraffic = data.some((d) => d.requests > 0)

  return (
    <div className={cn('relative h-[340px] w-full', className)}>
      {!hasTraffic && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-cp-card/60 backdrop-blur-[1px]">
          <p className="text-sm font-medium text-cp-text">No traffic recorded</p>
          <p className="mt-1 text-xs text-cp-text-secondary">
            No API events captured for the selected project and environment in this window.
          </p>
        </div>
      )}
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
