import { cn } from '@/utils/cn'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-cp-border', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-cp-crimson'
                : 'text-cp-text-secondary hover:text-cp-text'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-mono',
                    isActive
                      ? 'bg-cp-crimson/10 text-cp-crimson'
                      : 'bg-cp-elevated text-cp-text-secondary'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>

            {/* Active indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cp-crimson rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
