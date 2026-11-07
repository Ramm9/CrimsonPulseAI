import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
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

interface MobileNavigationProps {
  open: boolean
  onClose: () => void
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const location = useLocation()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-cp-border bg-cp-sidebar lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cp-border px-5 h-14">
              <Logo />
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
              >
                <X className="h-5 w-5" />
              </button>
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
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-cp-crimson/8 text-cp-crimson'
                          : 'text-cp-text-secondary hover:bg-cp-elevated hover:text-cp-text'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-cp-crimson" />
                      )}
                      <Icon className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </nav>

            {/* Workspace Info */}
            <div className="border-t border-cp-border px-4 py-4">
              <div className="rounded-lg bg-cp-secondary px-3 py-2">
                <p className="text-xs font-medium text-cp-text">Acme Corp</p>
                <p className="text-[11px] text-cp-text-secondary">Production</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
