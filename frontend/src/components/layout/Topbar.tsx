import { useState, useRef, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from '@/services/authService'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Check,
  Server,
  Cloud,
  Code2,
  Database,
  Info,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/appStore'
import { projectService } from '@/services/projectService'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { formatRelativeTime } from '@/utils/helpers'
import type { EnvironmentType, Notification } from '@/types'

const routeNames: Record<string, string> = {
  '/': 'Landing',
  '/dashboard': 'System Overview',
  '/projects': 'Projects',
  '/explorer': 'API Explorer',
  '/api-explorer': 'API Explorer',
  '/traffic': 'Live Traffic',
  '/live-traffic': 'Live Traffic',
  '/anomalies': 'Anomalies',
  '/incidents': 'Incidents',
  '/contracts': 'Contract Validation',
  '/investigator': 'AI Investigator',
  '/ai-investigator': 'AI Investigator',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
}

const envConfig: Record<EnvironmentType, { label: string; icon: typeof Server; color: string }> = {
  production: { label: 'Production', icon: Server, color: 'text-cp-healthy' },
  staging: { label: 'Staging', icon: Cloud, color: 'text-cp-warning' },
  development: { label: 'Development', icon: Code2, color: 'text-blue-400' },
}

interface TopbarProps {
  onMobileMenuOpen: () => void
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const currentEnvironment = useAppStore((s) => s.currentEnvironment)
  const setEnvironment = useAppStore((s) => s.setEnvironment)
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const markAllRead = useAppStore((s) => s.markAllRead)

  const currentProject = useAppStore((s) => s.currentProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const projects = useAppStore((s) => s.projects)
  const setProjects = useAppStore((s) => s.setProjects)
  const backendConnected = useAppStore((s) => s.backendConnected)

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    try {
      const stored = localStorage.getItem('cp_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    authService.getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user)
      }
    })
  }, [])

  const handleLogout = async () => {
    setUserDropdownOpen(false)
    await authService.logout()
    navigate('/login')
  }

  const projectRef = useRef<HTMLDivElement>(null)
  const envRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Load projects if not populated
  useEffect(() => {
    projectService.getProjects().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data)
        const initial = data.find((p) => p.id === currentProject || p.slug === currentProject) || data[0]
        if (initial && !currentProject) {
          setCurrentProject(initial.id)
          if (initial.environment) {
            setEnvironment(initial.environment as EnvironmentType)
          }
        }
      }
    }).catch(() => {})
  }, [setProjects, currentProject, setCurrentProject, setEnvironment])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectDropdownOpen(false)
      if (envRef.current && !envRef.current.contains(e.target as Node)) setEnvDropdownOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifDropdownOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Get breadcrumb parts
  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentPage = routeNames[location.pathname] ?? routeNames[`/${pathParts[0]}`] ?? pathParts[0] ?? 'Overview'

  const EnvIcon = envConfig[currentEnvironment].icon
  const activeProject = projects.find((p) => p.id === currentProject || p.slug === currentProject)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-cp-border bg-cp-bg/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuOpen}
        className="rounded-lg p-2 text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-cp-text-secondary">Dashboard</span>
        <ChevronRight className="h-3.5 w-3.5 text-cp-text-secondary/50" />
        <span className="font-medium text-cp-text">{currentPage}</span>
      </div>

      <div className="flex-1" />

      {/* Backend Connection Indicator */}
      <div className="group relative hidden lg:flex items-center">
        {backendConnected ? (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">Live API Connected</span>
          </div>
        ) : (
          <Link
            to="/integrations"
            className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[11px]">Demo Mode — Backend Disconnected</span>
            <Info className="h-3 w-3 text-amber-400/80" />
          </Link>
        )}
        <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-xs text-cp-text shadow-xl opacity-0 transition-opacity group-hover:opacity-100">
          <p className="font-semibold text-amber-300">
            {backendConnected ? 'Live PostgreSQL Telemetry Pipeline' : 'Demo Simulation Mode'}
          </p>
          <p className="mt-0.5 text-[11px] text-cp-text-secondary">
            {backendConnected
              ? 'Telemetry pipeline actively connected and streaming records from PostgreSQL backend.'
              : 'Displays realistic mock telemetry until the Python SDK and backend server are connected.'}
          </p>
        </div>
      </div>

      {/* Project Selector */}
      <div ref={projectRef} className="relative hidden md:block">
        <button
          onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
          className="flex items-center gap-2 rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm transition-colors hover:bg-cp-elevated"
          title="Select active project context"
        >
          <FolderKanban className="h-3.5 w-3.5 text-cp-crimson" />
          <span className="text-cp-text-secondary max-w-[130px] truncate">
            {activeProject ? activeProject.name : 'All Projects'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-cp-text-secondary/50" />
        </button>

        <AnimatePresence>
          {projectDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-cp-border bg-cp-card py-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-cp-text-secondary uppercase tracking-wider">
                Project Scope
              </div>
              <button
                onClick={() => {
                  setCurrentProject(null)
                  setProjectDropdownOpen(false)
                }}
                className="flex w-full items-center justify-between px-3.5 py-2 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
              >
                <span className="truncate">All Projects</span>
                {!currentProject && <Check className="h-4 w-4 text-cp-crimson shrink-0" />}
              </button>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setCurrentProject(proj.id)
                    if (proj.environment) {
                      setEnvironment(proj.environment as EnvironmentType)
                    }
                    setProjectDropdownOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3.5 py-2 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
                >
                  <span className="truncate">{proj.name}</span>
                  {(currentProject === proj.id || currentProject === proj.slug) && (
                    <Check className="h-4 w-4 text-cp-crimson shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Environment Selector */}
      <div ref={envRef} className="relative hidden md:block">
        <button
          onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
          className="flex items-center gap-2 rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm transition-colors hover:bg-cp-elevated"
        >
          <EnvIcon className={cn('h-3.5 w-3.5', envConfig[currentEnvironment].color)} />
          <span className="text-cp-text-secondary">{envConfig[currentEnvironment].label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-cp-text-secondary/50" />
        </button>

        <AnimatePresence>
          {envDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-cp-border bg-cp-card py-1.5 shadow-xl"
            >
              {(Object.entries(envConfig) as [EnvironmentType, typeof envConfig.production][]).map(
                ([env, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={env}
                      onClick={() => {
                        setEnvironment(env)
                        setEnvDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span className="flex-1 text-left">{config.label}</span>
                      {currentEnvironment === env && (
                        <Check className="h-4 w-4 text-cp-crimson" />
                      )}
                    </button>
                  )
                }
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Time Range */}
      <div className="hidden md:block">
        <DateRangePicker />
      </div>

      {/* Search Button */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-cp-border bg-cp-secondary px-3 py-1.5 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-cp-border bg-cp-elevated px-1 py-0.5 text-[10px] font-mono sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
          className="relative rounded-lg p-2 text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cp-crimson text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-cp-border bg-cp-card shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-cp-border px-4 py-3">
                <h3 className="text-sm font-semibold text-cp-text">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-cp-crimson hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-cp-text-secondary">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif: Notification) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id)
                        setNotifDropdownOpen(false)
                      }}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-cp-elevated',
                        !notif.read && 'bg-cp-crimson/5'
                      )}
                    >
                      {!notif.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cp-crimson" />
                      )}
                      <div className={cn('flex-1 min-w-0', notif.read && 'ml-5')}>
                        <p className="text-sm font-medium text-cp-text truncate">{notif.title}</p>
                        <p className="mt-0.5 text-xs text-cp-text-secondary line-clamp-2">{notif.message}</p>
                        <p className="mt-1 text-[11px] text-cp-text-secondary/60">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Avatar */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-cp-elevated"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cp-crimson to-cp-deep-crimson text-sm font-semibold text-white">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </button>

        <AnimatePresence>
          {userDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-cp-border bg-cp-card py-1.5 shadow-xl"
            >
              <div className="border-b border-cp-border px-3.5 pb-3 pt-2">
                <p className="text-sm font-medium text-cp-text truncate">{currentUser?.name || 'Workspace User'}</p>
                <p className="text-xs text-cp-text-secondary truncate">{currentUser?.email || 'user@crimsonpulse.ai'}</p>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-cp-text-secondary transition-colors hover:bg-cp-elevated hover:text-cp-text"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>
              <div className="border-t border-cp-border pt-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-cp-critical transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
