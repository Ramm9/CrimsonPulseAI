import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay, notifyDemoMutation } from '@/services/api'
import { anomalies } from '@/mock/data'
import type { Anomaly, AnomalySeverity } from '@/types'

interface AnomalyFilters {
  severity?: AnomalySeverity
  status?: Anomaly['status']
  projectId?: string
  environment?: string
  timeRange?: string
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
 * In live mode, requests real anomalies from Django backend and returns [] if none exist.
 */
export async function getAnomalies(filters?: AnomalyFilters): Promise<Anomaly[]> {
  try {
    const res = await apiClient.get<Anomaly[]>('/anomalies/', { params: filters })
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

    result.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    return result
  }

  return []
}

/**
 * Get a single anomaly by ID.
 */
export async function getAnomaly(id: string): Promise<Anomaly> {
  try {
    const res = await apiClient.get<Anomaly>(`/anomalies/${id}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || `Anomaly not found: ${id}`)
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const normalized = id.toLowerCase().replace(/[-_]/g, '')
    const anomaly = anomalies.find(
      (a) =>
        a.id === id ||
        a.id.toLowerCase().replace(/[-_]/g, '') === normalized ||
        a.id.replace('anom_', 'anom-00') === id ||
        a.id.replace('anom_', 'anom-0') === id ||
        id.replace('anom-00', 'anom_') === a.id ||
        id.replace('anom-0', 'anom_') === a.id,
    )
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${id}`)
    }

    return { ...anomaly }
  }

  throw new Error(`Anomaly not found: ${id}`)
}

/**
 * Update the status of an anomaly.
 */
export async function updateAnomalyStatus(
  id: string,
  status: Anomaly['status'],
): Promise<Anomaly> {
  try {
    const res = await apiClient.patch<Anomaly>(`/anomalies/${id}/`, { status })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to update anomaly status.')
    }
    notifyDemoMutation('Update Anomaly', 'Updated anomaly status in demo session.')
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = anomalies.findIndex((a) => a.id === id)
    if (index === -1) {
      throw new Error(`Anomaly not found: ${id}`)
    }

    anomalies[index] = { ...anomalies[index], status }
    return { ...anomalies[index] }
  }

  throw new Error('Failed to update anomaly status.')
}

/**
 * Get aggregate anomaly statistics.
 */
export async function getAnomalyStats(projectId?: string): Promise<AnomalyStats> {
  try {
    const params: Record<string, string> = {}
    if (projectId) params.projectId = projectId
    const res = await apiClient.get<AnomalyStats>('/anomalies/stats/', { params })
    if (res.data && typeof res.data.total === 'number') {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return {
        total: 0,
        active: 0,
        acknowledged: 0,
        resolved: 0,
        falsPositive: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        avgScore: 0,
      }
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay(200, 400)

    const dataset = projectId
      ? anomalies.filter((a) => a.projectId === projectId || a.projectId.replace('proj_', 'proj-') === projectId)
      : anomalies

    const stats: AnomalyStats = {
      total: dataset.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      falsPositive: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      avgScore: 0,
    }

    let scoreSum = 0

    for (const anomaly of dataset) {
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

    stats.avgScore = parseFloat((scoreSum / (anomalies.length || 1)).toFixed(2))
    return stats
  }

  return {
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    falsPositive: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    avgScore: 0,
  }
}

export const anomalyService = {
  getAnomalies,
  getAnomaly,
  updateAnomalyStatus,
  getAnomalyStats,
}

export default anomalyService
