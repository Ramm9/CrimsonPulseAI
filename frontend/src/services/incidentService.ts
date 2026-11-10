import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay } from '@/services/api'
import { incidents, teamMembers } from '@/mock/data'
import type { Incident, IncidentSeverity, IncidentStatus } from '@/types'
import { generateId } from '@/utils/helpers'

interface IncidentFilters {
  severity?: IncidentSeverity
  status?: IncidentStatus
  projectId?: string
  environment?: string
  search?: string
}

/**
 * Get incidents, optionally filtered.
 * In live mode, requests real incidents from Django backend and returns [] if none exist.
 */
export async function getIncidents(filters?: IncidentFilters): Promise<Incident[]> {
  try {
    const res = await apiClient.get<Incident[]>('/incidents/', { params: filters })
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

    let result = [...incidents]

    if (filters?.severity) {
      result = result.filter((inc) => inc.severity === filters.severity)
    }

    if (filters?.status) {
      result = result.filter((inc) => inc.status === filters.status)
    }

    if (filters?.projectId) {
      result = result.filter((inc) => inc.projectId === filters.projectId)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(
        (inc) =>
          inc.title.toLowerCase().includes(search) ||
          inc.description.toLowerCase().includes(search) ||
          inc.endpoint.toLowerCase().includes(search),
      )
    }

    result.sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime())
    return result
  }

  return []
}

/**
 * Get a single incident by ID.
 */
export async function getIncident(id: string): Promise<Incident> {
  try {
    const res = await apiClient.get<Incident>(`/incidents/${id}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || `Incident not found: ${id}`)
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const normalized = id.toLowerCase().replace(/[-_]/g, '')
    const incident = incidents.find(
      (inc) =>
        inc.id === id ||
        inc.id.toLowerCase().replace(/[-_]/g, '') === normalized ||
        inc.id.replace('inc_', 'inc-00') === id ||
        inc.id.replace('inc_', 'inc-0') === id ||
        id.replace('inc-00', 'inc_') === inc.id ||
        id.replace('inc-0', 'inc_') === inc.id,
    )
    if (!incident) {
      throw new Error(`Incident not found: ${id}`)
    }

    return { ...incident }
  }

  throw new Error(`Incident not found: ${id}`)
}

/**
 * Update the status of an incident.
 */
export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident> {
  try {
    const res = await apiClient.patch<Incident>(`/incidents/${id}/`, { status })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to update incident status.')
    }
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = incidents.findIndex((inc) => inc.id === id)
    if (index === -1) {
      throw new Error(`Incident not found: ${id}`)
    }

    const prevStatus = incidents[index].status

    incidents[index] = {
      ...incidents[index],
      status,
    }

    incidents[index].timeline.push({
      id: `tl_${generateId()}`,
      type: 'status_change',
      description: `Status changed from ${prevStatus} to ${status}`,
      timestamp: new Date().toISOString(),
      metadata: { from: prevStatus, to: status },
    })

    return { ...incidents[index] }
  }

  throw new Error('Failed to update incident status.')
}

/**
 * Add a comment to an incident.
 */
export async function addComment(
  incidentId: string,
  content: string,
  userId = 'usr_01',
): Promise<Incident> {
  try {
    const res = await apiClient.post<Incident>(`/incidents/${incidentId}/comments/`, {
      content,
      userId,
    })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to add comment.')
    }
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = incidents.findIndex((inc) => inc.id === incidentId)
    if (index === -1) {
      throw new Error(`Incident not found: ${incidentId}`)
    }

    const member = teamMembers.find((m) => m.id === userId)
    const userName = member?.name || 'Unknown User'

    const comment = {
      id: `cmt_${generateId()}`,
      userId,
      userName,
      content,
      createdAt: new Date().toISOString(),
    }

    incidents[index].comments.push(comment)
    incidents[index].timeline.push({
      id: `tl_${generateId()}`,
      type: 'comment',
      description: `${userName} added a comment`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
    })

    return { ...incidents[index] }
  }

  throw new Error('Failed to add comment.')
}

/**
 * Assign an incident to a team member.
 */
export async function assignIncident(
  incidentId: string,
  userId: string,
): Promise<Incident> {
  try {
    const res = await apiClient.post<Incident>(`/incidents/${incidentId}/assign/`, {
      userId,
    })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to assign incident.')
    }
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = incidents.findIndex((inc) => inc.id === incidentId)
    if (index === -1) {
      throw new Error(`Incident not found: ${incidentId}`)
    }

    const member = teamMembers.find((m) => m.id === userId)
    if (!member) {
      throw new Error(`Team member not found: ${userId}`)
    }

    incidents[index].assignee = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.joinedAt || new Date().toISOString(),
    }
    incidents[index].timeline.push({
      id: `tl_${generateId()}`,
      type: 'assignment',
      description: `Assigned to ${member.name}`,
      timestamp: new Date().toISOString(),
      userId,
      userName: member.name,
    })

    return { ...incidents[index] }
  }

  throw new Error('Failed to assign incident.')
}

export const incidentService = {
  getIncidents,
  getIncident,
  updateIncidentStatus,
  addComment,
  assignIncident,
}

export default incidentService
