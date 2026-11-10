import { apiClient, isDemoModeActive, simulateDelay } from '@/services/api'
import { telemetryEvents, trafficMetrics } from '@/mock/data'
import type { TelemetryEvent, MetricWindow } from '@/types'
import { generateId } from '@/utils/helpers'

export interface DashboardSummary {
  totalRequests: number
  appRequests?: number
  preflightRequests?: number
  avgLatency: number
  p50Latency?: number
  p95Latency: number
  p99Latency?: number
  errorRate: number
  clientErrorRate?: number
  serverErrorRate?: number
  totalEndpoints: number
  healthyEndpoints: number
  requestsChange?: number
  errorRateChange?: number
  p95Change?: number
  lastEventTimestamp?: string | null
  timeRange?: string
  environment?: string
  policy?: string
}

/**
 * Get high-level system overview summary from Django backend.
 */
export async function getDashboardSummary(
  projectId?: string,
  environment?: string,
  timeRange: string = '24h',
): Promise<DashboardSummary> {
  try {
    const params: Record<string, string> = { timeRange }
    if (projectId) params.projectId = projectId
    if (environment && environment !== 'all') params.environment = environment

    const res = await apiClient.get<DashboardSummary>('/metrics/dashboard/', { params })
    if (res.data && typeof res.data.totalRequests === 'number') {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return {
        totalRequests: 0,
        avgLatency: 0,
        p95Latency: 0,
        errorRate: 0,
        totalEndpoints: 0,
        healthyEndpoints: 0,
        requestsChange: 0,
        errorRateChange: 0,
        p95Change: 0,
        lastEventTimestamp: null,
      }
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()
    return {
      totalRequests: 1_280_000,
      avgLatency: 80,
      p95Latency: 184,
      errorRate: 0.42,
      totalEndpoints: 14,
      healthyEndpoints: 12,
      requestsChange: 12.5,
      errorRateChange: -0.08,
      p95Change: 2.1,
      lastEventTimestamp: new Date().toISOString(),
    }
  }

  return {
    totalRequests: 0,
    avgLatency: 0,
    p95Latency: 0,
    errorRate: 0,
    totalEndpoints: 0,
    healthyEndpoints: 0,
    requestsChange: 0,
    errorRateChange: 0,
    p95Change: 0,
    lastEventTimestamp: null,
  }
}

/**
 * Get traffic metrics for the dashboard charts.
 */
export async function getTrafficMetrics(
  timeRange: string = '24h',
  projectId?: string,
  environment?: string,
): Promise<MetricWindow[]> {
  try {
    const params: Record<string, string> = { timeRange }
    if (projectId) params.projectId = projectId
    if (environment && environment !== 'all') params.environment = environment

    const res = await apiClient.get<MetricWindow[]>('/metrics/traffic/', { params })
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

    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
      '7d': 24,
      '30d': 24,
    }

    const hours = hoursMap[timeRange] || 24
    return trafficMetrics.slice(0, hours)
  }

  return []
}

/**
 * Get recent telemetry events (live traffic feed).
 */
export async function getLiveTraffic(limit = 30, projectId?: string): Promise<TelemetryEvent[]> {
  try {
    const params: Record<string, string | number> = { limit }
    if (projectId) params.projectId = projectId

    const res = await apiClient.get<TelemetryEvent[]>('/traffic/', { params })
    if (Array.isArray(res.data)) {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return []
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay(200, 500)
    let feed = [...telemetryEvents]
    if (projectId) {
      feed = feed.filter((e) => e.projectId === projectId || e.projectId.replace('proj_', 'proj-') === projectId)
    }
    return feed.slice(0, limit)
  }

  return []
}

// Paths and weights for realistic event generation
const eventTemplates: Array<{
  path: string
  method: TelemetryEvent['method']
  projectId: string
  weight: number
  baseLatency: number
}> = [
  { path: '/api/products/', method: 'GET', projectId: 'proj_01', weight: 30, baseLatency: 45 },
  { path: '/api/orders/', method: 'POST', projectId: 'proj_01', weight: 18, baseLatency: 320 },
  { path: '/api/users/{id}/', method: 'GET', projectId: 'proj_01', weight: 14, baseLatency: 32 },
  { path: '/api/payments/', method: 'POST', projectId: 'proj_01', weight: 10, baseLatency: 280 },
  { path: '/api/inventory/', method: 'GET', projectId: 'proj_01', weight: 6, baseLatency: 52 },
  { path: '/api/auth/login', method: 'POST', projectId: 'proj_02', weight: 12, baseLatency: 88 },
  { path: '/api/auth/register', method: 'POST', projectId: 'proj_02', weight: 4, baseLatency: 120 },
  { path: '/api/auth/refresh', method: 'POST', projectId: 'proj_02', weight: 5, baseLatency: 35 },
  { path: '/api/analytics/events', method: 'POST', projectId: 'proj_03', weight: 9, baseLatency: 18 },
  { path: '/api/webhooks/', method: 'POST', projectId: 'proj_03', weight: 3, baseLatency: 65 },
  { path: '/api/health', method: 'GET', projectId: 'proj_04', weight: 5, baseLatency: 8 },
  { path: '/api/notifications/', method: 'POST', projectId: 'proj_04', weight: 1, baseLatency: 95 },
  { path: '/api/search', method: 'GET', projectId: 'proj_05', weight: 2, baseLatency: 280 },
  { path: '/api/analytics/reports', method: 'GET', projectId: 'proj_05', weight: 1, baseLatency: 340 },
]

const weightedTemplates: typeof eventTemplates = []
for (const t of eventTemplates) {
  for (let i = 0; i < t.weight; i++) {
    weightedTemplates.push(t)
  }
}

function pickRandomStatus(): number {
  const r = Math.random()
  if (r < 0.88) return [200, 201, 204][Math.floor(Math.random() * 3)]
  if (r < 0.94) return [301, 302, 304][Math.floor(Math.random() * 3)]
  if (r < 0.97) return [400, 401, 403, 404, 422][Math.floor(Math.random() * 5)]
  return [500, 502, 503, 504][Math.floor(Math.random() * 4)]
}

/**
 * Generate a single live telemetry event (Demo mode only).
 */
export function generateLiveEvent(projectId?: string): TelemetryEvent {
  const eligibleTemplates = projectId
    ? weightedTemplates.filter((t) => t.projectId === projectId || t.projectId.replace('proj_', 'proj-') === projectId)
    : weightedTemplates

  const source = eligibleTemplates.length > 0 ? eligibleTemplates : weightedTemplates
  const template = source[Math.floor(Math.random() * source.length)]
  const statusCode = pickRandomStatus()
  const isError = statusCode >= 500
  const isOrdersSpike = template.path === '/api/orders/' && Math.random() < 0.4

  const latency = isError
    ? Math.round(template.baseLatency * (3 + Math.random() * 4))
    : isOrdersSpike
      ? Math.round(1800 + Math.random() * 600)
      : Math.round(template.baseLatency * (0.5 + Math.random() * 1.2))

  const event: TelemetryEvent = {
    id: `tel_${generateId()}`,
    projectId: template.projectId,
    endpoint: template.path,
    method: template.method,
    statusCode,
    responseTime: latency,
    timestamp: new Date().toISOString(),
    environment: 'production',
    appVersion: '2.4.1',
    error: isError
      ? `HTTP ${statusCode}: ${
          statusCode === 500
            ? 'Internal Server Error'
            : statusCode === 502
              ? 'Bad Gateway'
              : statusCode === 503
                ? 'Service Unavailable'
                : 'Gateway Timeout'
        }`
      : undefined,
  }

  telemetryEvents.unshift(event)
  if (telemetryEvents.length > 200) {
    telemetryEvents.length = 200
  }

  return event
}

export const telemetryService = {
  getDashboardSummary,
  getTrafficMetrics,
  getLiveTraffic,
  generateLiveEvent,
}

export default telemetryService
