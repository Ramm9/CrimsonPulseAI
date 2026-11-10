export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type EnvironmentType = 'development' | 'staging' | 'production'

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'

export type IncidentStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved'

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string
  environment: EnvironmentType
  baseUrl: string
  endpointCount: number
  totalRequests: number
  errorRate: number
  health: HealthStatus
  apiKey: string
  createdAt: string
  updatedAt: string
}

export interface Endpoint {
  id: string
  projectId: string
  method: HttpMethod
  path: string
  requestCount: number
  avgLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  errorRate: number
  health: HealthStatus
  healthReason?: string
  lastActivity: string
  statusDistribution: StatusDistribution
}

export interface StatusDistribution {
  '2xx': number
  '3xx': number
  '4xx': number
  '5xx': number
}

export interface TelemetryEvent {
  id: string
  projectId: string
  endpoint: string
  method: HttpMethod
  statusCode: number
  responseTime: number
  timestamp: string
  environment: EnvironmentType
  appVersion: string
  error?: string
}

export interface MetricWindow {
  timestamp: string
  requests: number
  p95Latency: number
  p50Latency: number
  errorRate: number
  avgLatency: number
}

export interface Anomaly {
  id: string
  projectId: string
  endpointId: string
  endpoint: string
  method: HttpMethod
  severity: AnomalySeverity
  metric: string
  baselineValue: number
  observedValue: number
  anomalyScore: number
  modelVersion: string
  description: string
  detectedAt: string
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive'
  relatedIncidentId?: string
}

export interface Incident {
  id: string
  projectId: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  endpoint: string
  method: HttpMethod
  occurrenceCount: number
  firstDetected: string
  lastOccurred: string
  assignee?: User
  relatedAnomalyIds: string[]
  aiSummary?: string
  comments: IncidentComment[]
  timeline: IncidentTimelineEvent[]
  deploymentInfo?: DeploymentInfo
}

export interface IncidentComment {
  id: string
  userId: string
  userName: string
  content: string
  createdAt: string
}

export interface IncidentTimelineEvent {
  id: string
  type: 'created' | 'status_change' | 'comment' | 'assignment' | 'ai_analysis' | 'anomaly_detected' | 'resolved'
  description: string
  timestamp: string
  userId?: string
  userName?: string
  metadata?: Record<string, string>
}

export interface DeploymentInfo {
  version: string
  deployedAt: string
  deployedBy: string
  commitHash: string
  changelog: string
}

export interface ContractSpec {
  id: string
  projectId: string
  name: string
  version: string
  uploadedAt: string
  endpointCount: number
  status: 'valid' | 'violations_found' | 'pending'
}

export interface ContractViolation {
  id: string
  specId: string
  endpoint: string
  method: HttpMethod
  type: 'missing_field' | 'unexpected_field' | 'type_mismatch' | 'status_code_mismatch' | 'breaking_change'
  field: string
  expected: string
  observed: string
  severity: 'error' | 'warning'
  detectedAt: string
}

export interface AIInvestigation {
  id: string
  incidentId: string
  messages: AIMessage[]
  evidenceCards: EvidenceCard[]
  suggestedActions: string[]
  debugChecklist: DebugChecklistItem[]
  createdAt: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  evidenceRefs?: string[]
}

export interface EvidenceCard {
  id: string
  title: string
  type: 'metric' | 'log' | 'deployment' | 'pattern' | 'correlation'
  content: string
  source?: string
  verified?: boolean
  data?: Record<string, string | number>
  severity?: 'info' | 'warning' | 'critical'
}

export interface DebugChecklistItem {
  id: string
  label: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

export interface Notification {
  id: string
  type: 'incident' | 'anomaly' | 'deployment' | 'contract' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

export interface ApiKey {
  id: string
  name: string
  key: string
  prefix: string
  createdAt: string
  lastUsed?: string
  status: 'active' | 'revoked'
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  avatar?: string
  joinedAt: string
  lastActive: string
}

