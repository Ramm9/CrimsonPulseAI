import { Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore, type TimeRange } from '@/store/appStore'

const presets: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
]

interface DateRangePickerProps {
  className?: string
}

export function DateRangePicker({ className }: DateRangePickerProps) {
  const timeRange = useAppStore((s) => s.timeRange)
  const setTimeRange = useAppStore((s) => s.setTimeRange)

  return (
    <div className={cn('flex items-center gap-1 rounded-lg border border-cp-border bg-cp-secondary p-1', className)}>
      <Clock className="ml-1.5 h-3.5 w-3.5 text-cp-text-secondary" />
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => setTimeRange(preset.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            timeRange === preset.value
              ? 'bg-cp-crimson/10 text-cp-crimson'
              : 'text-cp-text-secondary hover:text-cp-text hover:bg-cp-elevated'
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
