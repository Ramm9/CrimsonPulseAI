import { apiClient, isDemoModeActive, simulateDelay } from '@/services/api'
import { endpoints, trafficMetrics } from '@/mock/data'
import type { Endpoint, MetricWindow, HttpMethod, HealthStatus } from '@/types'

interface EndpointFilters {
  method?: HttpMethod
  health?: HealthStatus
  search?: string
  environment?: string
  timeRange?: string
  excludeOptions?: boolean
  sortBy?: 'requestCount' | 'errorRate' | 'p95Latency' | 'lastActivity'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Get endpoints, optionally filtered by project and other criteria.
 * In live mode, requests real endpoints from Django backend and returns [] if none exist.
 */
export async function getEndpoints(
  projectId?: string,
  filters?: EndpointFilters,
): Promise<Endpoint[]> {
  try {
    const params: Record<string, string> = {}
    if (projectId) params.projectId = projectId
    if (filters?.environment && filters.environment !== 'all') params.environment = filters.environment
    if (filters?.timeRange && filters.timeRange !== 'all') params.timeRange = filters.timeRange
    if (filters?.excludeOptions) params.excludeOptions = 'true'
    if (filters?.method) params.method = filters.method
    if (filters?.health) params.health = filters.health
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sortBy = filters.sortBy
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder

    const res = await apiClient.get<Endpoint[]>('/endpoints/', { params })
    if (Array.isArray(res.data)) {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return []
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    let result = [...endpoints]

    if (projectId) {
      result = result.filter((ep) => ep.projectId === projectId)
    }

    if (filters?.method) {
      result = result.filter((ep) => ep.method === filters.method)
    }

    if (filters?.health) {
      result = result.filter((ep) => ep.health === filters.health)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      result = result.filter((ep) => ep.path.toLowerCase().includes(search))
    }

    if (filters?.sortBy) {
      const order = filters.sortOrder === 'asc' ? 1 : -1
      result.sort((a, b) => {
        const aVal = a[filters.sortBy!]
        const bVal = b[filters.sortBy!]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order
        }
        return ((aVal as number) - (bVal as number)) * order
      })
    }

    return result
  }

  return []
}

/**
 * Get a single endpoint by ID.
 */
export async function getEndpoint(id: string): Promise<Endpoint> {
  try {
    const res = await apiClient.get<Endpoint>(`/endpoints/${id}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || `Endpoint not found: ${id}`)
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const normalized = id.toLowerCase().replace(/[-_]/g, '')
    const endpoint = endpoints.find(
      (ep) =>
        ep.id === id ||
        ep.id.toLowerCase().replace(/[-_]/g, '') === normalized ||
        ep.id.replace('ep_', 'ep-00') === id ||
        ep.id.replace('ep_', 'ep-0') === id ||
        id.replace('ep-00', 'ep_') === ep.id ||
        id.replace('ep-0', 'ep_') === ep.id,
    )
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${id}`)
    }

    return { ...endpoint }
  }

  throw new Error(`Endpoint not found: ${id}`)
}

/**
 * Get time-series metrics for a specific endpoint.
 */
export async function getEndpointMetrics(
  id: string,
  timeRange: '1h' | '6h' | '12h' | '24h' = '24h',
): Promise<MetricWindow[]> {
  try {
    const res = await apiClient.get<MetricWindow[]>(`/endpoints/${id}/metrics/`, {
      params: { timeRange },
    })
    if (Array.isArray(res.data)) {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return []
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const endpoint = endpoints.find((ep) => ep.id === id)
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${id}`)
    }

    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
    }

    const hours = hoursMap[timeRange] || 24

    return trafficMetrics.slice(0, hours).map((window) => ({
      ...window,
      requests: Math.round(window.requests * (endpoint.requestCount / 1_280_000)),
      p95Latency: Math.round(window.p95Latency * (endpoint.p95Latency / 184)),
      p50Latency: Math.round(window.p50Latency * (endpoint.p50Latency / 55)),
      avgLatency: Math.round(window.avgLatency * (endpoint.avgLatency / 80)),
      errorRate: parseFloat((window.errorRate * (endpoint.errorRate / 0.42)).toFixed(2)),
    }))
  }

  return []
}

export const endpointService = {
  getEndpoints,
  getEndpoint,
  getEndpointMetrics,
}

export default endpointService
