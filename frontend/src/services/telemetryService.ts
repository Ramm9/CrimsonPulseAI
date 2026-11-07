import { simulateDelay } from '@/services/api'
import { telemetryEvents, trafficMetrics } from '@/mock/data'
import type { TelemetryEvent, MetricWindow } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get traffic metrics for the dashboard charts.
 */
export async function getTrafficMetrics(
  timeRange: string = '24h',
): Promise<MetricWindow[]> {
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

/**
 * Get recent telemetry events (live traffic feed).
 */
export async function getLiveTraffic(limit = 30): Promise<TelemetryEvent[]> {
  await simulateDelay(200, 500)
  return telemetryEvents.slice(0, limit)
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

// Build weighted selection array
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
 * Generate a single live telemetry event.
 * Used by the real-time traffic feed to add new events.
 */
export function generateLiveEvent(): TelemetryEvent {
  const template = weightedTemplates[Math.floor(Math.random() * weightedTemplates.length)]
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

  // Add to the front of the telemetry events array
  telemetryEvents.unshift(event)

  // Keep array bounded
  if (telemetryEvents.length > 200) {
    telemetryEvents.length = 200
  }

  return event
}

export const telemetryService = {
  getTrafficMetrics,
  getLiveTraffic,
  generateLiveEvent,
}

export default telemetryService
