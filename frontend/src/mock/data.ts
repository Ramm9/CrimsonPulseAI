import { subHours, subMinutes, subDays } from 'date-fns'
import type {
  User,
  Organization,
  Project,
  Endpoint,
  TelemetryEvent,
  MetricWindow,
  Anomaly,
  Incident,
  ContractSpec,
  ContractViolation,
  AIInvestigation,
  Notification,
  ApiKey,
  TeamMember,
} from '@/types'
import { generateId } from '@/utils/helpers'

const now = new Date()

// ─── Current User ───────────────────────────────────────────────────────────

export const currentUser: User = {
  id: 'usr_01',
  name: 'Alex Rivera',
  email: 'alex.rivera@crimsonpulse.io',
  avatar: undefined,
  role: 'owner',
  createdAt: subDays(now, 180).toISOString(),
}

// ─── Organization ───────────────────────────────────────────────────────────

export const organization: Organization = {
  id: 'org_01',
  name: 'CrimsonPulse Labs',
  slug: 'crimsonpulse-labs',
  plan: 'enterprise',
  createdAt: subDays(now, 180).toISOString(),
}

// ─── Team Members ───────────────────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  {
    id: 'usr_01',
    name: 'Alex Rivera',
    email: 'alex.rivera@crimsonpulse.io',
    role: 'owner',
    joinedAt: subDays(now, 180).toISOString(),
    lastActive: subMinutes(now, 5).toISOString(),
  },
  {
    id: 'usr_02',
    name: 'Priya Sharma',
    email: 'priya.sharma@crimsonpulse.io',
    role: 'admin',
    joinedAt: subDays(now, 150).toISOString(),
    lastActive: subMinutes(now, 22).toISOString(),
  },
  {
    id: 'usr_03',
    name: 'Marcus Chen',
    email: 'marcus.chen@crimsonpulse.io',
    role: 'developer',
    joinedAt: subDays(now, 90).toISOString(),
    lastActive: subHours(now, 1).toISOString(),
  },
  {
    id: 'usr_04',
    name: 'Sofia Petrov',
    email: 'sofia.petrov@crimsonpulse.io',
    role: 'developer',
    joinedAt: subDays(now, 60).toISOString(),
    lastActive: subHours(now, 3).toISOString(),
  },
  {
    id: 'usr_05',
    name: 'James Okonkwo',
    email: 'james.okonkwo@crimsonpulse.io',
    role: 'viewer',
    joinedAt: subDays(now, 30).toISOString(),
    lastActive: subDays(now, 1).toISOString(),
  },
]

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: 'proj_01',
    name: 'Nexus Commerce API',
    slug: 'nexus-commerce-api',
    description: 'Core e-commerce REST API powering product catalog, orders, and payment processing.',
    environment: 'production',
    baseUrl: 'https://api.nexuscommerce.io/v2',
    endpointCount: 6,
    totalRequests: 842_500,
    errorRate: 0.38,
    health: 'degraded',
    apiKey: 'cpk_live_nxc_****7e91',
    createdAt: subDays(now, 120).toISOString(),
    updatedAt: subHours(now, 2).toISOString(),
  },
  {
    id: 'proj_02',
    name: 'Pulse Auth Service',
    slug: 'pulse-auth-service',
    description: 'Authentication and authorization microservice handling OAuth, JWT tokens, and session management.',
    environment: 'production',
    baseUrl: 'https://auth.pulseplatform.io/v1',
    endpointCount: 3,
    totalRequests: 215_800,
    errorRate: 0.61,
    health: 'degraded',
    apiKey: 'cpk_live_pas_****b4d8',
    createdAt: subDays(now, 110).toISOString(),
    updatedAt: subHours(now, 4).toISOString(),
  },
  {
    id: 'proj_03',
    name: 'DataStream Pipeline',
    slug: 'datastream-pipeline',
    description: 'Real-time event streaming and data transformation pipeline for analytics ingestion.',
    environment: 'production',
    baseUrl: 'https://stream.dataflow.io/v1',
    endpointCount: 2,
    totalRequests: 128_400,
    errorRate: 0.12,
    health: 'healthy',
    apiKey: 'cpk_live_dsp_****c2a1',
    createdAt: subDays(now, 95).toISOString(),
    updatedAt: subHours(now, 8).toISOString(),
  },
  {
    id: 'proj_04',
    name: 'Mercury Gateway',
    slug: 'mercury-gateway',
    description: 'API gateway handling rate limiting, request routing, and load balancing across services.',
    environment: 'staging',
    baseUrl: 'https://gw.mercuryplatform.dev/v1',
    endpointCount: 2,
    totalRequests: 64_200,
    errorRate: 0.08,
    health: 'healthy',
    apiKey: 'cpk_stg_mgw_****f5e3',
    createdAt: subDays(now, 45).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
  },
  {
    id: 'proj_05',
    name: 'Forge Analytics',
    slug: 'forge-analytics',
    description: 'Business intelligence and analytics dashboard API serving aggregated metrics and reports.',
    environment: 'production',
    baseUrl: 'https://analytics.forgebi.io/v1',
    endpointCount: 2,
    totalRequests: 29_100,
    errorRate: 0.55,
    health: 'degraded',
    apiKey: 'cpk_live_fan_****d910',
    createdAt: subDays(now, 30).toISOString(),
    updatedAt: subHours(now, 6).toISOString(),
  },
]

// ─── Endpoints ──────────────────────────────────────────────────────────────

export const endpoints: Endpoint[] = [
  // Nexus Commerce API (proj_01)
  {
    id: 'ep_01',
    projectId: 'proj_01',
    method: 'GET',
    path: '/api/products/',
    requestCount: 312_400,
    avgLatency: 45,
    p50Latency: 38,
    p95Latency: 92,
    p99Latency: 148,
    errorRate: 0.12,
    health: 'healthy',
    lastActivity: subMinutes(now, 1).toISOString(),
    statusDistribution: { '2xx': 96.2, '3xx': 2.8, '4xx': 0.8, '5xx': 0.2 },
  },
  {
    id: 'ep_02',
    projectId: 'proj_01',
    method: 'POST',
    path: '/api/orders/',
    requestCount: 189_200,
    avgLatency: 320,
    p50Latency: 210,
    p95Latency: 2100,
    p99Latency: 3400,
    errorRate: 1.82,
    health: 'critical',
    lastActivity: subMinutes(now, 0).toISOString(),
    statusDistribution: { '2xx': 91.4, '3xx': 0, '4xx': 4.8, '5xx': 3.8 },
  },
  {
    id: 'ep_03',
    projectId: 'proj_01',
    method: 'GET',
    path: '/api/users/{id}/',
    requestCount: 145_600,
    avgLatency: 32,
    p50Latency: 28,
    p95Latency: 68,
    p99Latency: 105,
    errorRate: 0.24,
    health: 'healthy',
    lastActivity: subMinutes(now, 3).toISOString(),
    statusDistribution: { '2xx': 97.8, '3xx': 1.2, '4xx': 0.8, '5xx': 0.2 },
  },
  {
    id: 'ep_04',
    projectId: 'proj_01',
    method: 'POST',
    path: '/api/payments/',
    requestCount: 98_700,
    avgLatency: 280,
    p50Latency: 240,
    p95Latency: 520,
    p99Latency: 890,
    errorRate: 2.14,
    health: 'degraded',
    lastActivity: subMinutes(now, 2).toISOString(),
    statusDistribution: { '2xx': 93.2, '3xx': 0, '4xx': 3.6, '5xx': 3.2 },
  },
  {
    id: 'ep_05',
    projectId: 'proj_01',
    method: 'GET',
    path: '/api/inventory/',
    requestCount: 67_300,
    avgLatency: 52,
    p50Latency: 42,
    p95Latency: 110,
    p99Latency: 165,
    errorRate: 0.08,
    health: 'healthy',
    lastActivity: subMinutes(now, 5).toISOString(),
    statusDistribution: { '2xx': 98.4, '3xx': 1.2, '4xx': 0.3, '5xx': 0.1 },
  },
  {
    id: 'ep_06',
    projectId: 'proj_01',
    method: 'GET',
    path: '/api/orders/{id}/',
    requestCount: 29_300,
    avgLatency: 55,
    p50Latency: 46,
    p95Latency: 125,
    p99Latency: 210,
    errorRate: 0.31,
    health: 'healthy',
    lastActivity: subMinutes(now, 8).toISOString(),
    statusDistribution: { '2xx': 97.0, '3xx': 1.8, '4xx': 1.0, '5xx': 0.2 },
  },
  // Pulse Auth Service (proj_02)
  {
    id: 'ep_07',
    projectId: 'proj_02',
    method: 'POST',
    path: '/api/auth/login',
    requestCount: 124_500,
    avgLatency: 88,
    p50Latency: 72,
    p95Latency: 195,
    p99Latency: 340,
    errorRate: 0.52,
    health: 'healthy',
    lastActivity: subMinutes(now, 1).toISOString(),
    statusDistribution: { '2xx': 94.8, '3xx': 0, '4xx': 4.7, '5xx': 0.5 },
  },
  {
    id: 'ep_08',
    projectId: 'proj_02',
    method: 'POST',
    path: '/api/auth/register',
    requestCount: 42_100,
    avgLatency: 120,
    p50Latency: 105,
    p95Latency: 260,
    p99Latency: 420,
    errorRate: 0.38,
    health: 'healthy',
    lastActivity: subMinutes(now, 12).toISOString(),
    statusDistribution: { '2xx': 95.6, '3xx': 0, '4xx': 4.0, '5xx': 0.4 },
  },
  {
    id: 'ep_09',
    projectId: 'proj_02',
    method: 'POST',
    path: '/api/auth/refresh',
    requestCount: 49_200,
    avgLatency: 35,
    p50Latency: 28,
    p95Latency: 82,
    p99Latency: 140,
    errorRate: 1.24,
    health: 'degraded',
    lastActivity: subMinutes(now, 2).toISOString(),
    statusDistribution: { '2xx': 92.4, '3xx': 0, '4xx': 6.4, '5xx': 1.2 },
  },
  // DataStream Pipeline (proj_03)
  {
    id: 'ep_10',
    projectId: 'proj_03',
    method: 'POST',
    path: '/api/analytics/events',
    requestCount: 98_200,
    avgLatency: 18,
    p50Latency: 14,
    p95Latency: 42,
    p99Latency: 68,
    errorRate: 0.09,
    health: 'healthy',
    lastActivity: subMinutes(now, 0).toISOString(),
    statusDistribution: { '2xx': 99.2, '3xx': 0, '4xx': 0.6, '5xx': 0.2 },
  },
  {
    id: 'ep_11',
    projectId: 'proj_03',
    method: 'POST',
    path: '/api/webhooks/',
    requestCount: 30_200,
    avgLatency: 65,
    p50Latency: 52,
    p95Latency: 145,
    p99Latency: 220,
    errorRate: 0.18,
    health: 'healthy',
    lastActivity: subMinutes(now, 4).toISOString(),
    statusDistribution: { '2xx': 98.0, '3xx': 0, '4xx': 1.5, '5xx': 0.5 },
  },
  // Mercury Gateway (proj_04)
  {
    id: 'ep_12',
    projectId: 'proj_04',
    method: 'GET',
    path: '/api/health',
    requestCount: 52_100,
    avgLatency: 8,
    p50Latency: 6,
    p95Latency: 18,
    p99Latency: 30,
    errorRate: 0.02,
    health: 'healthy',
    lastActivity: subMinutes(now, 0).toISOString(),
    statusDistribution: { '2xx': 99.8, '3xx': 0, '4xx': 0.1, '5xx': 0.1 },
  },
  {
    id: 'ep_13',
    projectId: 'proj_04',
    method: 'POST',
    path: '/api/notifications/',
    requestCount: 12_100,
    avgLatency: 95,
    p50Latency: 78,
    p95Latency: 210,
    p99Latency: 350,
    errorRate: 0.22,
    health: 'healthy',
    lastActivity: subMinutes(now, 15).toISOString(),
    statusDistribution: { '2xx': 97.4, '3xx': 0, '4xx': 2.2, '5xx': 0.4 },
  },
  // Forge Analytics (proj_05)
  {
    id: 'ep_14',
    projectId: 'proj_05',
    method: 'GET',
    path: '/api/search',
    requestCount: 18_400,
    avgLatency: 280,
    p50Latency: 220,
    p95Latency: 680,
    p99Latency: 1100,
    errorRate: 0.88,
    health: 'degraded',
    lastActivity: subMinutes(now, 6).toISOString(),
    statusDistribution: { '2xx': 95.2, '3xx': 0.4, '4xx': 3.2, '5xx': 1.2 },
  },
  {
    id: 'ep_15',
    projectId: 'proj_05',
    method: 'GET',
    path: '/api/analytics/reports',
    requestCount: 10_700,
    avgLatency: 340,
    p50Latency: 280,
    p95Latency: 720,
    p99Latency: 1250,
    errorRate: 0.42,
    health: 'healthy',
    lastActivity: subMinutes(now, 18).toISOString(),
    statusDistribution: { '2xx': 96.8, '3xx': 0.2, '4xx': 2.4, '5xx': 0.6 },
  },
]

// ─── Telemetry Events ───────────────────────────────────────────────────────

const telemetryPaths: Array<{
  path: string
  method: TelemetryEvent['method']
  projectId: string
}> = [
  { path: '/api/products/', method: 'GET', projectId: 'proj_01' },
  { path: '/api/orders/', method: 'POST', projectId: 'proj_01' },
  { path: '/api/users/{id}/', method: 'GET', projectId: 'proj_01' },
  { path: '/api/payments/', method: 'POST', projectId: 'proj_01' },
  { path: '/api/inventory/', method: 'GET', projectId: 'proj_01' },
  { path: '/api/auth/login', method: 'POST', projectId: 'proj_02' },
  { path: '/api/auth/register', method: 'POST', projectId: 'proj_02' },
  { path: '/api/auth/refresh', method: 'POST', projectId: 'proj_02' },
  { path: '/api/analytics/events', method: 'POST', projectId: 'proj_03' },
  { path: '/api/webhooks/', method: 'POST', projectId: 'proj_03' },
  { path: '/api/health', method: 'GET', projectId: 'proj_04' },
  { path: '/api/notifications/', method: 'POST', projectId: 'proj_04' },
  { path: '/api/search', method: 'GET', projectId: 'proj_05' },
  { path: '/api/analytics/reports', method: 'GET', projectId: 'proj_05' },
]

function randomStatus(): number {
  const r = Math.random()
  if (r < 0.90) return [200, 201, 204][Math.floor(Math.random() * 3)]
  if (r < 0.95) return [301, 302, 304][Math.floor(Math.random() * 3)]
  if (r < 0.98) return [400, 401, 403, 404, 422][Math.floor(Math.random() * 5)]
  return [500, 502, 503, 504][Math.floor(Math.random() * 4)]
}

function generateTelemetryEvents(count: number): TelemetryEvent[] {
  const events: TelemetryEvent[] = []
  for (let i = 0; i < count; i++) {
    const tp = telemetryPaths[Math.floor(Math.random() * telemetryPaths.length)]
    const statusCode = randomStatus()
    const isError = statusCode >= 500
    const baseLatency = tp.path.includes('orders') ? 320 : tp.path.includes('payments') ? 280 : tp.path.includes('search') ? 280 : 50
    const latencyJitter = isError ? baseLatency * (2 + Math.random() * 3) : baseLatency * (0.4 + Math.random() * 1.6)

    events.push({
      id: `tel_${generateId()}`,
      projectId: tp.projectId,
      endpoint: tp.path,
      method: tp.method,
      statusCode,
      responseTime: Math.round(latencyJitter),
      timestamp: subMinutes(now, Math.floor(Math.random() * 60)).toISOString(),
      environment: 'production',
      appVersion: '2.4.1',
      error: isError ? `HTTP ${statusCode}: ${statusCode === 500 ? 'Internal Server Error' : statusCode === 502 ? 'Bad Gateway' : statusCode === 503 ? 'Service Unavailable' : 'Gateway Timeout'}` : undefined,
    })
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export const telemetryEvents: TelemetryEvent[] = generateTelemetryEvents(35)

// ─── Traffic Metrics (24-hour hourly windows) ───────────────────────────────

export const trafficMetrics: MetricWindow[] = Array.from({ length: 24 }, (_, i) => {
  const hour = 23 - i
  const isBusinessHours = hour >= 8 && hour <= 20
  const baseRequests = isBusinessHours ? 58_000 : 22_000
  const requestVariation = Math.floor(baseRequests * (0.8 + Math.random() * 0.4))

  // Simulate the spike at ~4 hours ago
  const hoursAgo = 23 - i
  const isSpike = hoursAgo >= 3 && hoursAgo <= 5

  return {
    timestamp: subHours(now, hoursAgo).toISOString(),
    requests: requestVariation,
    p95Latency: isSpike ? 1800 + Math.floor(Math.random() * 400) : 140 + Math.floor(Math.random() * 80),
    p50Latency: isSpike ? 420 + Math.floor(Math.random() * 100) : 42 + Math.floor(Math.random() * 30),
    errorRate: isSpike ? 2.8 + Math.random() * 1.2 : 0.2 + Math.random() * 0.4,
    avgLatency: isSpike ? 580 + Math.floor(Math.random() * 120) : 65 + Math.floor(Math.random() * 40),
  }
})

// ─── Anomalies ──────────────────────────────────────────────────────────────

export const anomalies: Anomaly[] = [
  {
    id: 'anom_01',
    projectId: 'proj_01',
    endpointId: 'ep_02',
    endpoint: '/api/orders/',
    method: 'POST',
    severity: 'critical',
    metric: 'p95_latency',
    baselineValue: 180,
    observedValue: 2100,
    anomalyScore: 0.94,
    modelVersion: 'iso-forest-v2.3',
    description: 'P95 latency for POST /api/orders/ has increased from 180ms baseline to 2100ms — a 11.7x deviation detected over the last 3 hours. Strongly correlated with a downstream database connection pool saturation event.',
    detectedAt: subHours(now, 3).toISOString(),
    status: 'active',
    relatedIncidentId: 'inc_01',
  },
  {
    id: 'anom_02',
    projectId: 'proj_01',
    endpointId: 'ep_04',
    endpoint: '/api/payments/',
    method: 'POST',
    severity: 'high',
    metric: 'error_rate',
    baselineValue: 0.45,
    observedValue: 2.14,
    anomalyScore: 0.87,
    modelVersion: 'iso-forest-v2.3',
    description: 'Error rate for POST /api/payments/ has jumped from 0.45% baseline to 2.14%. Majority of errors are 502 Bad Gateway responses from the payment gateway provider.',
    detectedAt: subHours(now, 5).toISOString(),
    status: 'acknowledged',
    relatedIncidentId: 'inc_03',
  },
  {
    id: 'anom_03',
    projectId: 'proj_02',
    endpointId: 'ep_09',
    endpoint: '/api/auth/refresh',
    method: 'POST',
    severity: 'high',
    metric: 'error_rate',
    baselineValue: 0.3,
    observedValue: 1.24,
    anomalyScore: 0.82,
    modelVersion: 'iso-forest-v2.3',
    description: 'Token refresh endpoint showing 4x increase in 401 errors. JWT verification failures suggest token signing key rotation issue after recent deployment.',
    detectedAt: subHours(now, 8).toISOString(),
    status: 'active',
    relatedIncidentId: 'inc_04',
  },
  {
    id: 'anom_04',
    projectId: 'proj_05',
    endpointId: 'ep_14',
    endpoint: '/api/search',
    method: 'GET',
    severity: 'medium',
    metric: 'p95_latency',
    baselineValue: 320,
    observedValue: 680,
    anomalyScore: 0.71,
    modelVersion: 'iso-forest-v2.3',
    description: 'Search endpoint latency has doubled. Elasticsearch cluster showing elevated merge operations following index rebuild.',
    detectedAt: subHours(now, 12).toISOString(),
    status: 'active',
    relatedIncidentId: 'inc_05',
  },
  {
    id: 'anom_05',
    projectId: 'proj_01',
    endpointId: 'ep_01',
    endpoint: '/api/products/',
    method: 'GET',
    severity: 'low',
    metric: 'request_volume',
    baselineValue: 8200,
    observedValue: 12400,
    anomalyScore: 0.58,
    modelVersion: 'iso-forest-v2.3',
    description: 'Request volume for product listing endpoint has increased 51% above baseline. Likely correlated with ongoing flash sale campaign.',
    detectedAt: subHours(now, 6).toISOString(),
    status: 'resolved',
  },
  {
    id: 'anom_06',
    projectId: 'proj_01',
    endpointId: 'ep_02',
    endpoint: '/api/orders/',
    method: 'POST',
    severity: 'medium',
    metric: 'error_rate',
    baselineValue: 0.4,
    observedValue: 1.82,
    anomalyScore: 0.76,
    modelVersion: 'iso-forest-v2.3',
    description: 'Concurrent with the latency spike, error rate on orders endpoint has climbed to 1.82%. Primarily 504 Gateway Timeout errors.',
    detectedAt: subHours(now, 2).toISOString(),
    status: 'active',
    relatedIncidentId: 'inc_01',
  },
]

// ─── Incidents ──────────────────────────────────────────────────────────────

export const incidents: Incident[] = [
  {
    id: 'inc_01',
    projectId: 'proj_01',
    title: 'Orders Latency Spike',
    description: 'POST /api/orders/ P95 latency has surged from 180ms to 2100ms. Investigation indicates downstream PostgreSQL connection pool exhaustion caused by a long-running analytics query introduced in deploy v2.4.1.',
    severity: 'critical',
    status: 'investigating',
    endpoint: '/api/orders/',
    method: 'POST',
    occurrenceCount: 1842,
    firstDetected: subHours(now, 3).toISOString(),
    lastOccurred: subMinutes(now, 2).toISOString(),
    assignee: {
      id: 'usr_02',
      name: 'Priya Sharma',
      email: 'priya.sharma@crimsonpulse.io',
      role: 'admin',
      createdAt: subDays(now, 150).toISOString(),
    },
    relatedAnomalyIds: ['anom_01', 'anom_06'],
    aiSummary: 'Primary hypothesis: database connection pool exhaustion (Confidence: 88%). Correlated with deploy v2.4.1 which introduced an unindexed JOIN on the orders_analytics materialized view, causing connections to be held for 8–12 seconds instead of normal 50–80ms. Recommended verification: inspect pg_stat_activity and run EXPLAIN ANALYZE before applying composite index hotfix.',
    comments: [
      {
        id: 'cmt_01',
        userId: 'usr_02',
        userName: 'Priya Sharma',
        content: 'Confirmed the connection pool is saturated. pg_stat_activity shows 20/20 connections active with avg query time >8s. Rolling back the analytics query.',
        createdAt: subHours(now, 2).toISOString(),
      },
      {
        id: 'cmt_02',
        userId: 'usr_03',
        userName: 'Marcus Chen',
        content: "I authored that query in the v2.4.1 deploy. The JOIN was supposed to hit the indexed view but it's falling back to a sequential scan. Adding the index now.",
        createdAt: subHours(now, 1).toISOString(),
      },
    ],
    timeline: [
      {
        id: 'tl_01',
        type: 'anomaly_detected',
        description: 'Anomaly detected: P95 latency for POST /api/orders/ exceeded threshold (2100ms vs 180ms baseline)',
        timestamp: subHours(now, 3).toISOString(),
      },
      {
        id: 'tl_02',
        type: 'created',
        description: 'Incident automatically created from critical anomaly anom_01',
        timestamp: subHours(now, 3).toISOString(),
      },
      {
        id: 'tl_03',
        type: 'ai_analysis',
        description: 'AI investigation initiated — correlation analysis identified deploy v2.4.1 as probable trigger',
        timestamp: subHours(now, 2.8).toISOString(),
      },
      {
        id: 'tl_04',
        type: 'assignment',
        description: 'Assigned to Priya Sharma',
        timestamp: subHours(now, 2.5).toISOString(),
        userId: 'usr_02',
        userName: 'Priya Sharma',
      },
      {
        id: 'tl_05',
        type: 'status_change',
        description: 'Status changed from open to investigating',
        timestamp: subHours(now, 2.5).toISOString(),
        metadata: { from: 'open', to: 'investigating' },
      },
      {
        id: 'tl_06',
        type: 'comment',
        description: 'Priya Sharma confirmed connection pool saturation',
        timestamp: subHours(now, 2).toISOString(),
        userId: 'usr_02',
        userName: 'Priya Sharma',
      },
    ],
    deploymentInfo: {
      version: '2.4.1',
      deployedAt: subHours(now, 4).toISOString(),
      deployedBy: 'Marcus Chen',
      commitHash: 'a3f8c2d',
      changelog: 'Added orders analytics materialized view refresh, updated payment retry logic, bumped stripe-sdk to 4.2.0',
    },
  },
  {
    id: 'inc_02',
    projectId: 'proj_01',
    title: 'Contract Mismatch – Products',
    description: 'GET /api/products/ response schema has diverged from the OpenAPI contract. Fields "sku" and "warehouse_id" are present in responses but not defined in the spec. Field "stock_count" type changed from integer to string.',
    severity: 'medium',
    status: 'open',
    endpoint: '/api/products/',
    method: 'GET',
    occurrenceCount: 312,
    firstDetected: subDays(now, 2).toISOString(),
    lastOccurred: subHours(now, 1).toISOString(),
    relatedAnomalyIds: [],
    comments: [
      {
        id: 'cmt_03',
        userId: 'usr_04',
        userName: 'Sofia Petrov',
        content: 'This was introduced when we added the warehouse integration. The spec needs to be updated to include sku and warehouse_id.',
        createdAt: subDays(now, 1).toISOString(),
      },
    ],
    timeline: [
      {
        id: 'tl_07',
        type: 'created',
        description: 'Contract violation detected between API response and OpenAPI spec v2.1.0',
        timestamp: subDays(now, 2).toISOString(),
      },
    ],
  },
  {
    id: 'inc_03',
    projectId: 'proj_01',
    title: 'Payment 5xx Increase',
    description: 'POST /api/payments/ showing elevated 5xx error rate (2.14% vs 0.45% baseline). Stripe webhook delivery failures and 502 responses from payment gateway are the primary contributors.',
    severity: 'high',
    status: 'acknowledged',
    endpoint: '/api/payments/',
    method: 'POST',
    occurrenceCount: 423,
    firstDetected: subHours(now, 5).toISOString(),
    lastOccurred: subMinutes(now, 18).toISOString(),
    assignee: {
      id: 'usr_03',
      name: 'Marcus Chen',
      email: 'marcus.chen@crimsonpulse.io',
      role: 'developer',
      createdAt: subDays(now, 90).toISOString(),
    },
    relatedAnomalyIds: ['anom_02'],
    aiSummary: 'Stripe API status page confirms intermittent 502 errors in their webhook delivery system starting 5 hours ago. Recommended: implement idempotent retry with exponential backoff for failed payment confirmations.',
    comments: [],
    timeline: [
      {
        id: 'tl_08',
        type: 'anomaly_detected',
        description: 'Anomaly detected: Error rate for POST /api/payments/ exceeded threshold',
        timestamp: subHours(now, 5).toISOString(),
      },
      {
        id: 'tl_09',
        type: 'created',
        description: 'Incident created from high-severity anomaly',
        timestamp: subHours(now, 5).toISOString(),
      },
      {
        id: 'tl_10',
        type: 'status_change',
        description: 'Status changed from open to acknowledged',
        timestamp: subHours(now, 4).toISOString(),
        metadata: { from: 'open', to: 'acknowledged' },
      },
    ],
  },
  {
    id: 'inc_04',
    projectId: 'proj_02',
    title: 'Auth Token Expiry Flood',
    description: 'POST /api/auth/refresh seeing 4x increase in 401 errors. JWT signature verification failures after key rotation in deploy v1.8.3. Tokens signed with the previous key are being rejected instead of gracefully refreshed.',
    severity: 'high',
    status: 'investigating',
    endpoint: '/api/auth/refresh',
    method: 'POST',
    occurrenceCount: 2105,
    firstDetected: subHours(now, 8).toISOString(),
    lastOccurred: subMinutes(now, 5).toISOString(),
    assignee: {
      id: 'usr_04',
      name: 'Sofia Petrov',
      email: 'sofia.petrov@crimsonpulse.io',
      role: 'developer',
      createdAt: subDays(now, 60).toISOString(),
    },
    relatedAnomalyIds: ['anom_03'],
    aiSummary: 'Deploy v1.8.3 rotated the JWT signing key but did not configure the auth middleware to accept tokens signed with the previous key during the grace period. Fix: enable multi-key verification in the JWT middleware configuration.',
    comments: [
      {
        id: 'cmt_04',
        userId: 'usr_04',
        userName: 'Sofia Petrov',
        content: 'Confirmed — the JWKS endpoint is only serving the new key. Adding the old key back to the rotation set with a 24h TTL.',
        createdAt: subHours(now, 6).toISOString(),
      },
    ],
    timeline: [
      {
        id: 'tl_11',
        type: 'anomaly_detected',
        description: 'Anomaly detected: Token refresh failure rate 4x above baseline',
        timestamp: subHours(now, 8).toISOString(),
      },
      {
        id: 'tl_12',
        type: 'created',
        description: 'Incident created from anomaly detection',
        timestamp: subHours(now, 8).toISOString(),
      },
      {
        id: 'tl_13',
        type: 'assignment',
        description: 'Assigned to Sofia Petrov',
        timestamp: subHours(now, 7).toISOString(),
        userId: 'usr_04',
        userName: 'Sofia Petrov',
      },
      {
        id: 'tl_14',
        type: 'status_change',
        description: 'Status changed from open to investigating',
        timestamp: subHours(now, 7).toISOString(),
        metadata: { from: 'open', to: 'investigating' },
      },
    ],
    deploymentInfo: {
      version: '1.8.3',
      deployedAt: subHours(now, 9).toISOString(),
      deployedBy: 'Sofia Petrov',
      commitHash: 'e7b2f91',
      changelog: 'Rotated JWT signing keys, updated bcrypt rounds to 12, added rate limiting to login endpoint',
    },
  },
  {
    id: 'inc_05',
    projectId: 'proj_05',
    title: 'Search Index Degradation',
    description: 'GET /api/search latency has doubled (P95: 680ms vs 320ms baseline). Elasticsearch cluster is performing heavy segment merges after a full index rebuild triggered by schema migration.',
    severity: 'medium',
    status: 'open',
    endpoint: '/api/search',
    method: 'GET',
    occurrenceCount: 156,
    firstDetected: subHours(now, 12).toISOString(),
    lastOccurred: subHours(now, 1).toISOString(),
    relatedAnomalyIds: ['anom_04'],
    comments: [],
    timeline: [
      {
        id: 'tl_15',
        type: 'anomaly_detected',
        description: 'Anomaly detected: Search endpoint P95 latency doubled',
        timestamp: subHours(now, 12).toISOString(),
      },
      {
        id: 'tl_16',
        type: 'created',
        description: 'Incident created from medium-severity anomaly',
        timestamp: subHours(now, 12).toISOString(),
      },
    ],
  },
]

// ─── Contract Specs ─────────────────────────────────────────────────────────

export const contractSpecs: ContractSpec[] = [
  {
    id: 'spec_01',
    projectId: 'proj_01',
    name: 'Nexus Commerce API — OpenAPI 3.1',
    version: '2.1.0',
    uploadedAt: subDays(now, 14).toISOString(),
    endpointCount: 6,
    status: 'violations_found',
  },
  {
    id: 'spec_02',
    projectId: 'proj_02',
    name: 'Pulse Auth Service — OpenAPI 3.0',
    version: '1.4.0',
    uploadedAt: subDays(now, 30).toISOString(),
    endpointCount: 3,
    status: 'valid',
  },
  {
    id: 'spec_03',
    projectId: 'proj_03',
    name: 'DataStream Pipeline — AsyncAPI 2.6',
    version: '1.0.2',
    uploadedAt: subDays(now, 7).toISOString(),
    endpointCount: 2,
    status: 'valid',
  },
]

// ─── Contract Violations ────────────────────────────────────────────────────

export const contractViolations: ContractViolation[] = [
  {
    id: 'cv_01',
    specId: 'spec_01',
    endpoint: '/api/users/{id}/',
    method: 'GET',
    type: 'missing_field',
    field: 'email',
    expected: '{ id: 101, name: "John", email: "john@example.com" }',
    observed: '{ id: "101", full_name: "John" }',
    severity: 'error',
    detectedAt: subDays(now, 1).toISOString(),
  },
  {
    id: 'cv_02',
    specId: 'spec_01',
    endpoint: '/api/users/{id}/',
    method: 'GET',
    type: 'type_mismatch',
    field: 'id',
    expected: 'number (101)',
    observed: 'string ("101")',
    severity: 'error',
    detectedAt: subDays(now, 1).toISOString(),
  },
  {
    id: 'cv_03',
    specId: 'spec_01',
    endpoint: '/api/users/{id}/',
    method: 'GET',
    type: 'unexpected_field',
    field: 'full_name',
    expected: 'name (string)',
    observed: 'full_name (string) — field "name" renamed to "full_name" without spec update',
    severity: 'warning',
    detectedAt: subDays(now, 1).toISOString(),
  },
  {
    id: 'cv_04',
    specId: 'spec_01',
    endpoint: '/api/products/',
    method: 'GET',
    type: 'breaking_change',
    field: 'stock_count',
    expected: 'integer',
    observed: 'string — serialization changed from number to formatted string ("1,240 units")',
    severity: 'error',
    detectedAt: subDays(now, 2).toISOString(),
  },
  {
    id: 'cv_05',
    specId: 'spec_01',
    endpoint: '/api/products/',
    method: 'GET',
    type: 'unexpected_field',
    field: 'warehouse_id',
    expected: 'not defined in spec',
    observed: 'string ("wh_us_east_01") — added in warehouse integration, spec not updated',
    severity: 'warning',
    detectedAt: subDays(now, 2).toISOString(),
  },
]

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: 'notif_01',
    type: 'incident',
    title: 'Critical: Orders Latency Spike',
    message: 'POST /api/orders/ P95 latency has exceeded 2000ms. An incident has been automatically created.',
    read: false,
    createdAt: subHours(now, 3).toISOString(),
    link: '/incidents/inc_01',
  },
  {
    id: 'notif_02',
    type: 'anomaly',
    title: 'Anomaly Detected: Payment Errors',
    message: 'Error rate for POST /api/payments/ has increased 4.8x above baseline.',
    read: false,
    createdAt: subHours(now, 5).toISOString(),
    link: '/anomalies/anom_02',
  },
  {
    id: 'notif_03',
    type: 'deployment',
    title: 'Deployment: Nexus Commerce v2.4.1',
    message: 'Successfully deployed v2.4.1 to production. 3 changes included.',
    read: true,
    createdAt: subHours(now, 4).toISOString(),
  },
  {
    id: 'notif_04',
    type: 'contract',
    title: 'Contract Violations Found',
    message: '5 new violations detected in Nexus Commerce API spec v2.1.0.',
    read: false,
    createdAt: subDays(now, 1).toISOString(),
    link: '/contracts/spec_01',
  },
  {
    id: 'notif_05',
    type: 'incident',
    title: 'High: Auth Token Expiry Flood',
    message: 'Token refresh failures have spiked 4x. JWT key rotation issue suspected.',
    read: false,
    createdAt: subHours(now, 8).toISOString(),
    link: '/incidents/inc_04',
  },
  {
    id: 'notif_06',
    type: 'anomaly',
    title: 'Anomaly Resolved: Product Traffic',
    message: 'Request volume anomaly for GET /api/products/ has been resolved. Traffic returning to baseline.',
    read: true,
    createdAt: subHours(now, 2).toISOString(),
  },
  {
    id: 'notif_07',
    type: 'system',
    title: 'Model Update: iso-forest-v2.3',
    message: 'Anomaly detection model updated to v2.3. Improved false positive reduction by 18%.',
    read: true,
    createdAt: subDays(now, 3).toISOString(),
  },
  {
    id: 'notif_08',
    type: 'incident',
    title: 'Medium: Search Index Degradation',
    message: 'GET /api/search latency doubled after Elasticsearch index rebuild.',
    read: false,
    createdAt: subHours(now, 12).toISOString(),
    link: '/incidents/inc_05',
  },
]

// ─── API Keys ───────────────────────────────────────────────────────────────

export const apiKeys: ApiKey[] = [
  {
    id: 'key_01',
    name: 'Production Ingestion',
    key: 'cpk_live_****a3f2',
    prefix: 'cpk_live',
    createdAt: subDays(now, 90).toISOString(),
    lastUsed: subMinutes(now, 3).toISOString(),
    status: 'active',
  },
  {
    id: 'key_02',
    name: 'Staging Environment',
    key: 'cpk_stg_****d8e1',
    prefix: 'cpk_stg',
    createdAt: subDays(now, 60).toISOString(),
    lastUsed: subHours(now, 2).toISOString(),
    status: 'active',
  },
  {
    id: 'key_03',
    name: 'CI/CD Pipeline (deprecated)',
    key: 'cpk_ci_****7b4c',
    prefix: 'cpk_ci',
    createdAt: subDays(now, 120).toISOString(),
    lastUsed: subDays(now, 15).toISOString(),
    status: 'revoked',
  },
]

// ─── AI Investigations ──────────────────────────────────────────────────────

export const aiInvestigations: AIInvestigation[] = [
  {
    id: 'inv_01',
    incidentId: 'inc_01',
    messages: [
      {
        id: 'msg_01',
        role: 'assistant',
        content: `I've analyzed the **Orders Latency Spike** incident. Here's what I found:\n\n**Summary:** POST /api/orders/ P95 latency surged from 180ms to 2100ms starting ~3 hours ago. The spike correlates precisely with the deployment of **v2.4.1** to production.\n\n**Root Cause Analysis:**\n1. Deploy v2.4.1 introduced a new analytics materialized view refresh query\n2. The query performs an unindexed JOIN on \`orders_analytics\` table\n3. Each query holds a database connection for 8-12 seconds (vs normal 50-80ms)\n4. PostgreSQL connection pool (max: 20) is fully saturated\n5. New order requests are queuing, waiting for available connections\n\n**Impact:** ~1,842 requests affected with degraded response times. Error rate has climbed to 1.82% due to connection timeout (504) errors.`,
        timestamp: subHours(now, 2.8).toISOString(),
        evidenceRefs: ['ev_01', 'ev_02', 'ev_03'],
      },
      {
        id: 'msg_02',
        role: 'user',
        content: 'What specific query is causing the connection pool exhaustion?',
        timestamp: subHours(now, 2.7).toISOString(),
      },
      {
        id: 'msg_03',
        role: 'assistant',
        content: `The problematic query was introduced in commit \`a3f8c2d\` by Marcus Chen. It's a materialized view refresh:\n\n\`\`\`sql\nREFRESH MATERIALIZED VIEW orders_analytics AS\nSELECT o.id, o.created_at, o.total, p.name, p.category\nFROM orders o\nJOIN products p ON o.product_id = p.id\nJOIN inventory i ON p.id = i.product_id\nWHERE o.created_at > NOW() - INTERVAL '30 days'\nORDER BY o.created_at DESC;\n\`\`\`\n\nThe \`orders\` table has 2.4M rows and the JOIN with \`inventory\` is missing a composite index on \`(product_id, updated_at)\`. The query planner falls back to a sequential scan, taking 8-12 seconds per execution.\n\n**Recommended fix:**\n1. Add index: \`CREATE INDEX idx_inventory_product_date ON inventory(product_id, updated_at)\`\n2. Increase connection pool max from 20 to 50\n3. Move materialized view refresh to an async background job`,
        timestamp: subHours(now, 2.6).toISOString(),
        evidenceRefs: ['ev_04'],
      },
      {
        id: 'msg_04',
        role: 'user',
        content: 'Is this affecting any other endpoints?',
        timestamp: subHours(now, 2.5).toISOString(),
      },
      {
        id: 'msg_05',
        role: 'assistant',
        content: `Yes, the connection pool saturation is creating a **cascading effect** on other endpoints in the Nexus Commerce API:\n\n| Endpoint | Normal P95 | Current P95 | Status |\n|---|---|---|---|\n| POST /api/orders/ | 180ms | 2100ms | 🔴 Critical |\n| POST /api/payments/ | 340ms | 520ms | 🟡 Degraded |\n| GET /api/orders/{id}/ | 65ms | 125ms | 🟡 Elevated |\n| GET /api/products/ | 92ms | 92ms | 🟢 Normal |\n\nThe payments endpoint is affected because it performs a database lookup to validate the order before processing. Products endpoint uses a Redis cache layer, so it's unaffected.\n\nI recommend prioritizing the connection pool fix — it will resolve the cascading impact across all affected endpoints.`,
        timestamp: subHours(now, 2.4).toISOString(),
        evidenceRefs: ['ev_05'],
      },
    ],
    evidenceCards: [
      {
        id: 'ev_01',
        title: 'Latency Spike Timeline',
        type: 'metric',
        source: 'Telemetry timeseries (POST /api/orders/ P95)',
        verified: true,
        content: 'P95 latency for POST /api/orders/ increased from 180ms to 2100ms starting at the exact time of deploy v2.4.1 rollout.',
        data: {
          baseline_p95: 180,
          observed_p95: 2100,
          deviation: '11.7x',
          spike_start: subHours(now, 3).toISOString(),
        },
        severity: 'critical',
      },
      {
        id: 'ev_02',
        title: 'Database Connection Pool Saturation',
        type: 'metric',
        source: 'pg_stat_activity active connections',
        verified: true,
        content: 'PostgreSQL connection pool is fully saturated at 20/20 active connections. Average connection hold time: 9.4 seconds (baseline: 62ms).',
        data: {
          pool_max: 20,
          pool_active: 20,
          avg_hold_time_ms: 9400,
          baseline_hold_time_ms: 62,
        },
        severity: 'critical',
      },
      {
        id: 'ev_03',
        title: 'Deployment Event Correlation',
        type: 'deployment',
        source: 'GitHub deployment webhook (commit a3f8c2d by Marcus Chen)',
        verified: true,
        content: 'Deploy v2.4.1 occurred at T-4h. Latency spike began within 8 minutes of deployment completion. Changelog includes: "Added orders analytics materialized view refresh."',
        data: {
          version: '2.4.1',
          commit: 'a3f8c2d',
          deployed_by: 'Marcus Chen',
        },
        severity: 'warning',
      },
      {
        id: 'ev_04',
        title: 'Slow Query Execution Log',
        type: 'log',
        source: 'pg_stat_statements query performance catalog',
        verified: true,
        content: 'pg_stat_statements shows the materialized view refresh query averaging 9.4s execution time with 847 calls in the last 3 hours. Sequential scan on inventory table (2.4M rows) is the bottleneck.',
        data: {
          avg_exec_time: 9400,
          total_calls: 847,
          rows_scanned: 2400000,
        },
        severity: 'critical',
      },
      {
        id: 'ev_05',
        title: 'Cascading Dependency Impact',
        type: 'correlation',
        source: 'Cross-service dependency inference model',
        verified: false,
        content: 'Connection pool saturation is causing secondary latency increases across 3 of 6 endpoints in the Nexus Commerce API. Endpoints using Redis cache are unaffected.',
        data: {
          affected_endpoints: 3,
          total_endpoints: 6,
          cache_protected: 2,
        },
        severity: 'warning',
      },
    ],
    suggestedActions: [
      'Add composite index on inventory(product_id, updated_at) to eliminate sequential scan',
      'Increase PostgreSQL connection pool max from 20 to 50',
      'Move materialized view refresh to async background worker (pg_cron or application-level)',
      'Add connection pool monitoring alert at 80% utilization threshold',
      'Consider read replica for analytics queries to isolate from transactional workload',
    ],
    debugChecklist: [
      { id: 'dc_01', label: 'Verify connection pool saturation via pg_stat_activity', completed: true, priority: 'high' },
      { id: 'dc_02', label: 'Identify slow query via pg_stat_statements', completed: true, priority: 'high' },
      { id: 'dc_03', label: 'Correlate with recent deployment (v2.4.1)', completed: true, priority: 'high' },
      { id: 'dc_04', label: 'Add missing composite index on inventory table', completed: false, priority: 'high' },
      { id: 'dc_05', label: 'Increase connection pool max to 50', completed: false, priority: 'medium' },
      { id: 'dc_06', label: 'Move view refresh to background job', completed: false, priority: 'medium' },
      { id: 'dc_07', label: 'Add pool utilization monitoring alert', completed: false, priority: 'low' },
      { id: 'dc_08', label: 'Validate fix in staging before production deploy', completed: false, priority: 'high' },
    ],
    createdAt: subHours(now, 2.8).toISOString(),
  },
  {
    id: 'inv_02',
    incidentId: 'inc_02',
    messages: [
      {
        id: 'msg_02_01',
        role: 'assistant',
        content: `I have analyzed the **Contract Mismatch – Products** incident on \`GET /api/products/\`.

### 1. Observed Evidence (Verified Facts)
- **Schema Drift**: The response payload contains undeclared fields \`sku\` and \`warehouse_id\` not defined in OpenAPI spec \`v2.1.0\`.
- **Type Incompatibility**: Field \`stock_count\` is returned as String (\`"42"\`) instead of Integer (\`42\`).
- **Deployment Correlation**: Introduced in commit \`d8f1a2c\` ("Add warehouse inventory integration") merged 2 days ago by Sofia Petrov.
- **Impact**: 312 response contract violations recorded. Client deserialization warnings detected across mobile catalog consumers.

### 2. Hypothesized Contributing Factors (Unconfirmed)
- **Hypothesis 1 (Confidence: 94%)**: Serializer in \`products/serializers.py\` was extended with warehouse fields without updating \`openapi.yaml\`.
- **Hypothesis 2 (Confidence: 78%)**: Type coercion bug in Django REST serializer formatting \`stock_count\` via string representation.

### 3. Recommended Actions
1. Update \`openapi.yaml\` to declare \`sku\` and \`warehouse_id\` in \`ProductItem\` schema.
2. Fix \`products/serializers.py\` so \`stock_count\` serializes as \`IntegerField\`.
3. Add contract validation linting stage in CI pipeline.`,
        timestamp: subDays(now, 2).toISOString(),
        evidenceRefs: ['ev_02_01', 'ev_02_02', 'ev_02_03'],
      },
      {
        id: 'msg_02_02',
        role: 'user',
        content: 'Can you show the exact schema diff between the spec and response?',
        timestamp: subDays(now, 1.8).toISOString(),
      },
      {
        id: 'msg_02_03',
        role: 'assistant',
        content: `### Contract Schema Diff: GET /api/products/

| Field | OpenAPI Spec v2.1.0 | Actual API Response | Status |
|---|---|---|---|
| \`id\` | \`string (uuid)\` | \`string (uuid)\` | 🟢 Match |
| \`name\` | \`string\` | \`string\` | 🟢 Match |
| \`price\` | \`number (float)\` | \`number (float)\` | 🟢 Match |
| \`stock_count\` | \`integer\` | \`string ("42")\` | 🔴 Type Mismatch |
| \`sku\` | *Not defined* | \`string ("SKU-8821")\` | 🟡 Undeclared Field |
| \`warehouse_id\` | *Not defined* | \`string ("wh_us_east_1")\` | 🟡 Undeclared Field |

\`\`\`python
# products/serializers.py
class ProductSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_count = serializers.IntegerField()  # Fix: was formatted string
    sku = serializers.CharField(max_length=64)  # Declare in openapi.yaml
    warehouse_id = serializers.CharField(max_length=32)  # Declare in openapi.yaml
\`\`\`

**Source**: CrimsonPulse Contract Validator vs \`openapi.yaml\` (v2.1.0).
**Remediation**: Cast \`stock_count\` to \`IntegerField\` and sync \`openapi.yaml\` definitions.`,
        timestamp: subDays(now, 1.7).toISOString(),
        evidenceRefs: ['ev_02_02'],
      },
      {
        id: 'msg_02_04',
        role: 'user',
        content: 'Is this breaking external consumers?',
        timestamp: subDays(now, 1.5).toISOString(),
      },
      {
        id: 'msg_02_05',
        role: 'assistant',
        content: `Telemetry indicates **partial client degradation**:

- Web storefront: 🟢 Normal (tolerant JSON parser coerces string to number).
- Android Mobile app (v3.12.0): 🔴 Warning (strict type deserializer logs \`FormatException\` on \`stock_count\`).
- Third-party webhook aggregators: 🟡 Warning (ignoring unexpected fields \`sku\` and \`warehouse_id\`).

Applying the serializer type fix to output native integers will immediately resolve the mobile deserialization exceptions without requiring a mobile app store update.`,
        timestamp: subDays(now, 1.4).toISOString(),
        evidenceRefs: ['ev_02_04'],
      },
    ],
    evidenceCards: [
      {
        id: 'ev_02_01',
        title: 'Schema Drift - Undeclared Fields',
        type: 'pattern',
        source: 'OpenAPI spec v2.1.0 contract validator',
        verified: true,
        content: 'GET /api/products/ response payload includes fields "sku" and "warehouse_id", neither of which are defined in the OpenAPI schema for ProductItem.',
        data: {
          schema_version: 'v2.1.0',
          undeclared_fields: 'sku, warehouse_id',
          violations: 312,
        },
        severity: 'warning',
      },
      {
        id: 'ev_02_02',
        title: 'Type Incompatibility: stock_count',
        type: 'metric',
        source: 'JSON Schema validator (Draft 7)',
        verified: true,
        content: 'Field "stock_count" returned as String ("42") rather than expected Integer (42). Strict client deserializers throwing unhandled FormatException.',
        data: {
          expected_type: 'integer',
          observed_type: 'string',
          sample_value: '"42"',
        },
        severity: 'critical',
      },
      {
        id: 'ev_02_03',
        title: 'Commit Origin Correlation',
        type: 'deployment',
        source: 'GitHub commit d8f1a2c by Sofia Petrov',
        verified: true,
        content: 'Commit d8f1a2c ("Add warehouse inventory integration") modified ProductSerializer to expose warehouse attributes without synchronizing the OpenAPI spec.',
        data: {
          commit: 'd8f1a2c',
          author: 'Sofia Petrov',
          branch: 'main',
        },
        severity: 'warning',
      },
      {
        id: 'ev_02_04',
        title: 'Mobile Consumer Deserialization Errors',
        type: 'correlation',
        source: 'Client-side crash reporting inference',
        verified: false,
        content: 'Android catalog parser reports 4.8% deserialization failure rate on product lists due to strict integer casting on stock_count.',
        data: {
          affected_clients: 'Android app v3.12',
          failure_rate: '4.8%',
        },
        severity: 'critical',
      },
    ],
    suggestedActions: [
      'Update openapi.yaml schema to declare sku (string) and warehouse_id (string) in ProductItem definition',
      'Fix stock_count type in products/serializers.py to serializers.IntegerField()',
      'Add spectral / prism contract linting stage in CI pipeline',
      'Run regression contract tests against staging environment',
    ],
    debugChecklist: [
      { id: 'dc_02_1', label: 'Verify schema diff against openapi.yaml spec v2.1.0', completed: true, priority: 'high' },
      { id: 'dc_02_2', label: 'Inspect Django ProductSerializer field definitions', completed: true, priority: 'high' },
      { id: 'dc_02_3', label: 'Cast stock_count to serializers.IntegerField in serializer', completed: false, priority: 'high' },
      { id: 'dc_02_4', label: 'Add sku and warehouse_id to OpenAPI specification', completed: false, priority: 'high' },
      { id: 'dc_02_5', label: 'Deploy patch to staging and run contract validation suite', completed: false, priority: 'medium' },
    ],
    createdAt: subDays(now, 2).toISOString(),
  },
  {
    id: 'inv_03',
    incidentId: 'inc_03',
    messages: [
      {
        id: 'msg_03_01',
        role: 'assistant',
        content: `I've completed an investigation into the **Payment 5xx Increase** on \`POST /api/payments/\`.

### 1. Observed Evidence (Verified Facts)
- **Error Rate Surge**: 5xx error rate rose from 0.45% baseline to 2.14% starting 5 hours ago (423 occurrences).
- **Upstream Gateway Status**: Payment provider (Stripe) reported elevated 502 Bad Gateway responses during webhook delivery.
- **Worker Saturation**: Celery \`payments_high\` queue backlog reached 184 jobs due to unthrottled immediate retries.

### 2. Hypothesized Contributing Factors (Unconfirmed)
- **Hypothesis 1 (Confidence: 91%)**: Upstream payment gateway experiencing transient gateway timeouts during charge authorization.
- **Hypothesis 2 (Confidence: 68%)**: Missing exponential backoff causing webhook worker starvation.

### 3. Recommended Actions
1. Enable circuit breaker on upstream payment client with 15% trip threshold.
2. Implement exponential backoff with jitter on Celery retry tasks.
3. Route transient 502 responses to dead-letter queue for automated replay.`,
        timestamp: subHours(now, 4.8).toISOString(),
        evidenceRefs: ['ev_03_01', 'ev_03_02', 'ev_03_03'],
      },
      {
        id: 'msg_03_02',
        role: 'user',
        content: 'What retry policy should we configure?',
        timestamp: subHours(now, 4.5).toISOString(),
      },
      {
        id: 'msg_03_03',
        role: 'assistant',
        content: `Configure Celery task with exponential backoff and jitter:

\`\`\`python
# payments/tasks.py
@shared_task(bind=True, max_retries=5, default_retry_delay=2)
def process_payment_confirmation(self, transaction_id):
    try:
        return payment_gateway.confirm_charge(transaction_id)
    except GatewayTransientError as exc:
        countdown = min(120, (2 ** self.request.retries) + random.uniform(0.5, 1.5))
        raise self.retry(exc=exc, countdown=countdown)
\`\`\`

This prevents retry storms during upstream provider degradation and lets the \`payments_high\` worker pool process active requests normally.`,
        timestamp: subHours(now, 4.3).toISOString(),
        evidenceRefs: ['ev_03_03'],
      },
    ],
    evidenceCards: [
      {
        id: 'ev_03_01',
        title: 'Elevated 5xx Error Rate',
        type: 'metric',
        source: 'Telemetry timeseries (POST /api/payments/)',
        verified: true,
        content: 'Error rate jumped from 0.45% baseline to 2.14% over last 5 hours, generating 423 failed payment attempts.',
        data: {
          baseline_error_rate: 0.45,
          observed_error_rate: 2.14,
          total_failures: 423,
        },
        severity: 'critical',
      },
      {
        id: 'ev_03_02',
        title: 'Upstream Payment Gateway 502 Status',
        type: 'log',
        source: 'Stripe API status webhook log',
        verified: true,
        content: 'Upstream gateway returned HTTP 502 Bad Gateway on 389 authorization callbacks during European zone peak.',
        data: {
          gateway: 'Stripe API v2024-06',
          status_code: 502,
          gateway_latency_ms: 4800,
        },
        severity: 'critical',
      },
      {
        id: 'ev_03_03',
        title: 'Celery Webhook Queue Backlog',
        type: 'metric',
        source: 'Celery worker queue metrics (payments_high)',
        verified: true,
        content: 'Queue backlog reached 184 unacknowledged jobs due to synchronous retry loops without backoff delay.',
        data: {
          queue_depth: 184,
          active_workers: 8,
          retry_rate: '3.8x',
        },
        severity: 'warning',
      },
      {
        id: 'ev_03_04',
        title: 'Cross-Service Connection Contention',
        type: 'correlation',
        source: 'PostgreSQL connection pool contention model',
        verified: false,
        content: 'Database connection hold time on payments table elevated by 18% during lock acquisition.',
        data: {
          lock_wait_ms: 310,
          pool_share: '15%',
        },
        severity: 'warning',
      },
    ],
    suggestedActions: [
      'Enable circuit breaker on payment gateway integration (15% error rate trip)',
      'Add exponential backoff with jitter to Celery payment retry tasks',
      'Route transient 502 failures to dead-letter queue for safe replay',
      'Increase client timeout from 3,000ms to 8,000ms on charge verification calls',
    ],
    debugChecklist: [
      { id: 'dc_03_1', label: 'Verify upstream provider status page for active incident', completed: true, priority: 'high' },
      { id: 'dc_03_2', label: 'Confirm 502 error distribution in application logs', completed: true, priority: 'high' },
      { id: 'dc_03_3', label: 'Deploy exponential backoff retry policy in Celery task', completed: false, priority: 'high' },
      { id: 'dc_03_4', label: 'Configure circuit breaker threshold in payments client', completed: false, priority: 'medium' },
      { id: 'dc_03_5', label: 'Drain payments_high queue after gateway recovery', completed: false, priority: 'medium' },
    ],
    createdAt: subHours(now, 4.8).toISOString(),
  },
  {
    id: 'inv_04',
    incidentId: 'inc_04',
    messages: [
      {
        id: 'msg_04_01',
        role: 'assistant',
        content: `I've analyzed the **Auth Token Expiry Flood** incident on \`POST /api/auth/refresh\`.

### 1. Observed Evidence (Verified Facts)
- **Failure Surge**: 401 Unauthorized rate on \`/api/auth/refresh\` jumped from 0.3% to 1.24% following deploy of **v1.8.3** (9 hours ago).
- **JWKS Endpoint Mismatch**: The \`/.well-known/jwks.json\` endpoint is serving only the newly rotated key (\`kid: "key-2026-11"\`).
- **Old Key Removed**: Previous signing key (\`kid: "key-2026-08"\`) was immediately removed instead of retaining an expiration overlap window.
- **Impact**: ~2,105 refresh failures affecting ~1,480 active user sessions.

### 2. Hypothesized Contributing Factors (Unconfirmed)
- **Hypothesis 1 (Confidence: 95%)**: Single-key JWKS endpoint rejects valid tokens signed with previous rotation key.
- **Hypothesis 2 (Confidence: 76%)**: Auth middleware lacks backward-compatible multi-key verification fallback.

### 3. Recommended Actions
1. Re-add previous public key (\`kid: "key-2026-08"\`) to JWKS endpoint with 24h TTL.
2. Configure JWT auth middleware to support multi-key verification ring.
3. Update key rotation deployment checklist to mandate 48h key overlap period.`,
        timestamp: subHours(now, 7).toISOString(),
        evidenceRefs: ['ev_04_01', 'ev_04_02', 'ev_04_03'],
      },
      {
        id: 'msg_04_02',
        role: 'user',
        content: 'How many users are affected?',
        timestamp: subHours(now, 6.5).toISOString(),
      },
      {
        id: 'msg_04_03',
        role: 'assistant',
        content: `Based on auth audit telemetry:

- **Total failed refresh attempts:** ~2,105 requests
- **Unique user accounts affected:** ~1,480 unique IDs
- **Token TTL:** 1 hour — remaining pre-rotation tokens will naturally expire within 15 hours
- **Newly issued tokens:** Tokens issued post-v1.8.3 deployment are validating successfully

Adding the previous public key back into the JWKS set immediately restores refresh token verification for active sessions.`,
        timestamp: subHours(now, 6.4).toISOString(),
        evidenceRefs: ['ev_04_03'],
      },
    ],
    evidenceCards: [
      {
        id: 'ev_04_01',
        title: 'Token Refresh Failure Rate',
        type: 'metric',
        source: 'Telemetry timeseries (POST /api/auth/refresh)',
        verified: true,
        content: '401 error rate on /api/auth/refresh jumped from 0.3% to 1.24% immediately after deploy v1.8.3.',
        data: {
          baseline_error_rate: 0.3,
          observed_error_rate: 1.24,
          total_failures: 2105,
        },
        severity: 'critical',
      },
      {
        id: 'ev_04_02',
        title: 'JWKS Configuration',
        type: 'log',
        source: '/.well-known/jwks.json endpoint inspect',
        verified: true,
        content: 'The /.well-known/jwks.json endpoint is serving only 1 key (kid: "key-2026-11"). Previous key (kid: "key-2026-08") was removed prematurely.',
        data: {
          current_keys: 1,
          expected_keys: 2,
          missing_kid: 'key-2026-08',
        },
        severity: 'critical',
      },
      {
        id: 'ev_04_03',
        title: 'Affected User Sessions',
        type: 'pattern',
        source: 'Auth audit logs database',
        verified: true,
        content: 'Analysis of failed refresh attempts shows 1,480 unique user IDs. All failures are for tokens issued before the key rotation timestamp.',
        data: {
          unique_users: 1480,
          total_failures: 2105,
          retry_rate: '1.42x',
        },
        severity: 'warning',
      },
      {
        id: 'ev_04_04',
        title: 'Client Refresh Storm Correlation',
        type: 'correlation',
        source: 'Client retry storm inference model',
        verified: false,
        content: 'Client SDKs retrying refresh 3-5 times before redirecting to login, inflating request volume by 42%.',
        data: {
          retry_inflation: '+42%',
          client_reauth_rate: '68%',
        },
        severity: 'warning',
      },
    ],
    suggestedActions: [
      'Add old signing key back to JWKS endpoint with 24h TTL',
      'Enable multi-key verification in JWT middleware',
      'Implement graceful key rotation procedure with overlap period',
      'Add integration test for key rotation scenario',
    ],
    debugChecklist: [
      { id: 'dc_04_1', label: 'Verify JWKS endpoint configuration and active kid set', completed: true, priority: 'high' },
      { id: 'dc_04_2', label: 'Confirm old key removal as root cause of 401s', completed: true, priority: 'high' },
      { id: 'dc_04_3', label: 'Add old key back to JWKS with 24-hour TTL', completed: false, priority: 'high' },
      { id: 'dc_04_4', label: 'Update auth middleware for multi-key key-ring support', completed: false, priority: 'medium' },
      { id: 'dc_04_5', label: 'Document zero-downtime key rotation SOP in handbook', completed: false, priority: 'low' },
    ],
    createdAt: subHours(now, 7).toISOString(),
  },
  {
    id: 'inv_05',
    incidentId: 'inc_05',
    messages: [
      {
        id: 'msg_05_01',
        role: 'assistant',
        content: `I've analyzed the **Search Index Degradation** on \`GET /api/search\`.

### 1. Observed Evidence (Verified Facts)
- **Latency Doubled**: P95 response time for \`GET /api/search\` doubled from 320ms to 680ms (P99: 1,100ms) over last 12 hours.
- **Lucene Segment Merging**: Elasticsearch node stats show heavy segment merges following full schema index rebuild triggered by migration \`v4.12\`.
- **Thread Pool Queue**: Search worker thread pool queue utilization is at 88% with intermittent rejected executions.
- **Node CPU**: Cluster node CPU averages 86% across all 3 search data nodes.

### 2. Hypothesized Contributing Factors (Unconfirmed)
- **Hypothesis 1 (Confidence: 89%)**: Intensive segment merge disk I/O contention throttling query response times.
- **Hypothesis 2 (Confidence: 65%)**: Search thread pool queue saturated due to heavy wildcard aggregations.

### 3. Recommended Actions
1. Throttle Elasticsearch segment merge I/O via cluster settings (\`max_bytes_per_sec: 40mb\`).
2. Temporarily scale search replica nodes from 3 to 6 in Kubernetes cluster.
3. Defer background indexing jobs until segment merge backlog completes.`,
        timestamp: subHours(now, 11).toISOString(),
        evidenceRefs: ['ev_05_01', 'ev_05_02', 'ev_05_03'],
      },
      {
        id: 'msg_05_02',
        role: 'user',
        content: 'How do we throttle the merge operations?',
        timestamp: subHours(now, 10.5).toISOString(),
      },
      {
        id: 'msg_05_03',
        role: 'assistant',
        content: `Execute cluster settings update via Elasticsearch REST API:

\`\`\`bash
curl -X PUT "https://es-cluster.internal:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.store.throttle.max_bytes_per_sec": "40mb",
    "index.merge.scheduler.max_thread_count": "1"
  }
}
'
\`\`\`

This will immediately relieve disk I/O contention on the search nodes, restoring \`GET /api/search\` P95 latency to normal baseline (<350ms).`,
        timestamp: subHours(now, 10.2).toISOString(),
        evidenceRefs: ['ev_05_02'],
      },
    ],
    evidenceCards: [
      {
        id: 'ev_05_01',
        title: 'Search Latency Surge',
        type: 'metric',
        source: 'Telemetry timeseries (GET /api/search P95)',
        verified: true,
        content: 'P95 latency doubled from 320ms baseline to 680ms with P99 reaching 1,100ms during normal query traffic.',
        data: {
          baseline_p95: 320,
          observed_p95: 680,
          deviation: '2.1x',
        },
        severity: 'critical',
      },
      {
        id: 'ev_05_02',
        title: 'Elasticsearch Lucene Segment Merges',
        type: 'log',
        source: 'Elasticsearch _nodes/stats indices.segments',
        verified: true,
        content: 'Background segment merge I/O utilizing 82% of disk throughput following schema migration v4.12 index rebuild.',
        data: {
          active_merges: 14,
          merge_io_mb_s: 185,
          segments_total: 248,
        },
        severity: 'critical',
      },
      {
        id: 'ev_05_03',
        title: 'Search Thread Pool Queue Saturation',
        type: 'metric',
        source: 'Elasticsearch _cat/thread_pool',
        verified: true,
        content: 'Search thread pool queue depth peaked at 88% capacity with 156 tasks temporarily queued.',
        data: {
          queue_depth: 88,
          rejected_tasks: 23,
          active_threads: 32,
        },
        severity: 'warning',
      },
      {
        id: 'ev_05_04',
        title: 'Schema Migration Index Rebuild Event',
        type: 'deployment',
        source: 'Forge Analytics schema migration v4.12 job',
        verified: true,
        content: 'Migration v4.12 triggered full re-indexing of product_catalog index (12.4M documents).',
        data: {
          migration: 'v4.12-schema-rebuild',
          documents_reindexed: 12400000,
        },
        severity: 'warning',
      },
    ],
    suggestedActions: [
      'Throttle Elasticsearch segment merge I/O via cluster settings',
      'Scale search worker replica nodes in Kubernetes cluster',
      'Defer non-critical bulk indexing jobs until segment merges complete',
      'Add alerting on search thread pool rejected execution counts',
    ],
    debugChecklist: [
      { id: 'dc_05_1', label: 'Inspect Elasticsearch cluster segment merge statistics', completed: true, priority: 'high' },
      { id: 'dc_05_2', label: 'Verify search thread pool rejected task metrics', completed: true, priority: 'high' },
      { id: 'dc_05_3', label: 'Throttle segment merge max_bytes_per_sec to 40mb', completed: false, priority: 'high' },
      { id: 'dc_05_4', label: 'Scale Kubernetes search data pods from 3 to 6', completed: false, priority: 'medium' },
      { id: 'dc_05_5', label: 'Validate P95 search latency recovery below 350ms', completed: false, priority: 'high' },
    ],
    createdAt: subHours(now, 11).toISOString(),
  },
]
