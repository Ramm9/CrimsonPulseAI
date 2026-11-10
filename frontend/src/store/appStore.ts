import { create } from 'zustand'
import type { EnvironmentType, Notification, Project } from '@/types'
import { generateId } from '@/utils/helpers'

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
}

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Backend Connection & Offline / Demo Mode
  backendConnected: boolean | null
  setBackendConnected: (connected: boolean) => void
  isDemoMode: boolean
  setDemoMode: (isDemo: boolean) => void

  // Projects
  projects: Project[]
  setProjects: (projects: Project[]) => void
  currentProject: string | null
  setCurrentProject: (id: string | null) => void

  // Environment
  currentEnvironment: EnvironmentType
  setEnvironment: (env: EnvironmentType) => void

  // Time range
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void

  // Notifications
  notifications: Notification[]
  markNotificationRead: (id: string) => void
  markAllRead: () => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void
  removeToast: (id: string) => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Search
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Backend Connection & Offline / Demo Mode
  backendConnected: false,
  setBackendConnected: (connected) => set({ backendConnected: connected, isDemoMode: !connected }),
  isDemoMode: true,
  setDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),
  currentProject: null,
  setCurrentProject: (id) => set({ currentProject: id }),

  // Environment
  currentEnvironment: 'production',
  setEnvironment: (env) => set({ currentEnvironment: env }),

  // Time range
  timeRange: '24h',
  setTimeRange: (range) => set({ timeRange: range }),

  // Notifications
  notifications: [
    {
      id: 'notif-1',
      type: 'incident',
      title: 'New Critical Incident',
      message: 'POST /api/payments endpoint returning 500 errors at 12% rate',
      read: false,
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      link: '/incidents/inc-1',
    },
    {
      id: 'notif-2',
      type: 'anomaly',
      title: 'Latency Anomaly Detected',
      message: 'GET /api/users p95 latency spiked to 2.4s (baseline: 180ms)',
      read: false,
      createdAt: new Date(Date.now() - 22 * 60_000).toISOString(),
      link: '/anomalies',
    },
    {
      id: 'notif-3',
      type: 'deployment',
      title: 'Deployment Completed',
      message: 'v2.14.0 deployed to production successfully',
      read: true,
      createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
    {
      id: 'notif-4',
      type: 'contract',
      title: 'Contract Violation',
      message: '3 new contract violations detected in Orders API spec',
      read: false,
      createdAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
      link: '/contracts',
    },
  ],
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { id: toast.id || generateId(), ...toast }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
