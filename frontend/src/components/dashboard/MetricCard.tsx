import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface MetricCardProps {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: LucideIcon
  trend: 'up' | 'down' | 'neutral'
  sparklineData?: number[]
  className?: string
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const width = 80
  const height = 28
  const padding = 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#969AA5" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#969AA5" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="#969AA5"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  sparklineData,
  className,
}: MetricCardProps) {
  const isPositiveChange = change >= 0
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  // Determine if the change is "good" or "bad" based on context
  // For most metrics, up=good. But for error-related, down=good.
  const isGoodChange =
    (trend === 'up' && isPositiveChange) ||
    (trend === 'down' && !isPositiveChange) ||
    trend === 'neutral'

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-cp-border bg-cp-card p-5 transition-all duration-200 hover:border-cp-border/80 hover:border-[#3a3d48]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Icon */}
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cp-crimson/10">
            <Icon className="h-4.5 w-4.5 text-cp-crimson" size={18} />
          </div>

          {/* Title */}
          <p className="text-xs font-medium uppercase tracking-wider text-cp-text-secondary">
            {title}
          </p>

          {/* Value */}
          <p className="mt-1 text-2xl font-semibold text-cp-text">{value}</p>

          {/* Change indicator */}
          <div className="mt-2 flex items-center gap-1.5">
            <TrendIcon
              size={14}
              className={cn(
                isGoodChange ? 'text-cp-healthy' : 'text-cp-critical'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                isGoodChange ? 'text-cp-healthy' : 'text-cp-critical'
              )}
            >
              {isPositiveChange ? '+' : ''}
              {changeLabel}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-auto self-end">
            <Sparkline data={sparklineData} />
          </div>
        )}
      </div>
    </div>
  )
}
