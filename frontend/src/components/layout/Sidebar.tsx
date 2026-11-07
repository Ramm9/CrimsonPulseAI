import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Compass,
  Radio,
  BrainCircuit,
  AlertTriangle,
  FileCheck,
  Sparkles,
  Plug,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/appStore'
import { Logo } from './Logo'

interface NavItem {
  path: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/explorer', label: 'API Explorer', icon: Compass },
  { path: '/traffic', label: 'Live Traffic', icon: Radio },
  { path: '/anomalies', label: 'Anomalies', icon: BrainCircuit },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/contracts', label: 'Contract Validation', icon: FileCheck },
  { path: '/investigator', label: 'AI Investigator', icon: Sparkles },
  { path: '/integrations', label: 'Integrations', icon: Plug },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-cp-border bg-cp-sidebar transition-all duration-300 ease-in-out h-screen sticky top-0',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-cp-border h-14', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Logo collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cp-crimson/8 text-cp-crimson'
                    : 'text-cp-text-secondary hover:bg-cp-elevated hover:text-cp-text'
                )}
                title={collapsed ? item.label : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-cp-crimson" />
                )}

                <Icon className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'mx-auto')} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Workspace Info */}
      <div className="border-t border-cp-border px-3 py-3">
        {!collapsed && (
          <div className="mb-2 rounded-lg bg-cp-secondary px-3 py-2">
            <p className="text-xs font-medium text-cp-text">Acme Corp</p>
            <p className="text-[11px] text-cp-text-secondary">Production</p>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
