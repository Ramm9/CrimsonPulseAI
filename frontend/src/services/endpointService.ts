import { simulateDelay } from '@/services/api'
import { endpoints, trafficMetrics } from '@/mock/data'
import type { Endpoint, MetricWindow, HttpMethod, HealthStatus } from '@/types'

interface EndpointFilters {
  method?: HttpMethod
  health?: HealthStatus
  search?: string
  sortBy?: 'requestCount' | 'errorRate' | 'p95Latency' | 'lastActivity'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Get endpoints, optionally filtered by project and other criteria.
 */
export async function getEndpoints(
  projectId?: string,
  filters?: EndpointFilters,
): Promise<Endpoint[]> {
  await simulateDelay()

  let result = [...endpoints]

  // Filter by project
  if (projectId) {
    result = result.filter((ep) => ep.projectId === projectId)
  }

  // Apply filters
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

  // Sort
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

/**
 * Get a single endpoint by ID.
 */
export async function getEndpoint(id: string): Promise<Endpoint> {
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

/**
 * Get time-series metrics for a specific endpoint.
 * Returns hourly metric windows based on the requested time range.
 */
export async function getEndpointMetrics(
  id: string,
  timeRange: '1h' | '6h' | '12h' | '24h' = '24h',
): Promise<MetricWindow[]> {
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

  const hours = hoursMap[timeRange]

  // Generate endpoint-specific metrics based on the global traffic pattern
  // but scaled to the endpoint's characteristics
  return trafficMetrics.slice(0, hours).map((window) => ({
    ...window,
    requests: Math.round(window.requests * (endpoint.requestCount / 1_280_000)),
    p95Latency: Math.round(
      window.p95Latency * (endpoint.p95Latency / 184),
    ),
    p50Latency: Math.round(
      window.p50Latency * (endpoint.p50Latency / 55),
    ),
    avgLatency: Math.round(
      window.avgLatency * (endpoint.avgLatency / 80),
    ),
    errorRate: parseFloat(
      (window.errorRate * (endpoint.errorRate / 0.42)).toFixed(2),
    ),
  }))
}

export const endpointService = {
  getEndpoints,
  getEndpoint,
  getEndpointMetrics,
}

export default endpointService
