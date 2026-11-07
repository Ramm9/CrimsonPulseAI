import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { anomalies } from '@/mock/data'
import type { Anomaly, AnomalySeverity } from '@/types'

interface AnomalyFilters {
  severity?: AnomalySeverity
  status?: Anomaly['status']
  projectId?: string
  endpointId?: string
  search?: string
}

interface AnomalyStats {
  total: number
  active: number
  acknowledged: number
  resolved: number
  falsPositive: number
  bySeverity: Record<AnomalySeverity, number>
  avgScore: number
}

/**
 * Get anomalies, optionally filtered.
 */
export async function getAnomalies(filters?: AnomalyFilters): Promise<Anomaly[]> {
  await simulateDelay()

  let result = [...anomalies]

  if (filters?.severity) {
    result = result.filter((a) => a.severity === filters.severity)
  }

  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status)
  }

  if (filters?.projectId) {
    result = result.filter((a) => a.projectId === filters.projectId)
  }

  if (filters?.endpointId) {
    result = result.filter((a) => a.endpointId === filters.endpointId)
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase()
    result = result.filter(
      (a) =>
        a.endpoint.toLowerCase().includes(search) ||
        a.description.toLowerCase().includes(search) ||
        a.metric.toLowerCase().includes(search),
    )
  }

  // Sort by detection time (most recent first)
  result.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  return result
}

/**
 * Get a single anomaly by ID.
 */
export async function getAnomaly(id: string): Promise<Anomaly> {
  await simulateDelay()

  const anomaly = anomalies.find((a) => a.id === id)
  if (!anomaly) {
    throw new Error(`Anomaly not found: ${id}`)
  }

  return { ...anomaly }
}

/**
 * Update the status of an anomaly.
 */
export async function updateAnomalyStatus(
  id: string,
  status: Anomaly['status'],
): Promise<Anomaly> {
  await simulateMutationDelay()

  const index = anomalies.findIndex((a) => a.id === id)
  if (index === -1) {
    throw new Error(`Anomaly not found: ${id}`)
  }

  anomalies[index] = { ...anomalies[index], status }
  return { ...anomalies[index] }
}

/**
 * Get aggregate anomaly statistics.
 */
export async function getAnomalyStats(): Promise<AnomalyStats> {
  await simulateDelay(200, 400)

  const stats: AnomalyStats = {
    total: anomalies.length,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    falsPositive: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    avgScore: 0,
  }

  let scoreSum = 0

  for (const anomaly of anomalies) {
    switch (anomaly.status) {
      case 'active':
        stats.active++
        break
      case 'acknowledged':
        stats.acknowledged++
        break
      case 'resolved':
        stats.resolved++
        break
      case 'false_positive':
        stats.falsPositive++
        break
    }

    stats.bySeverity[anomaly.severity]++
    scoreSum += anomaly.anomalyScore
  }

  stats.avgScore = parseFloat((scoreSum / anomalies.length).toFixed(2))

  return stats
}

export const anomalyService = {
  getAnomalies,
  getAnomaly,
  updateAnomalyStatus,
  getAnomalyStats,
}

export default anomalyService
