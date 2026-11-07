import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="mb-4 rounded-xl bg-cp-elevated p-4">
        <Icon className="h-8 w-8 text-cp-text-secondary" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-cp-text">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-cp-text-secondary">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cp-crimson/90"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
