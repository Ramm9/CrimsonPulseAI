import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { incidents, teamMembers } from '@/mock/data'
import type { Incident, IncidentSeverity, IncidentStatus } from '@/types'
import { generateId } from '@/utils/helpers'

interface IncidentFilters {
  severity?: IncidentSeverity
  status?: IncidentStatus
  projectId?: string
  search?: string
}

/**
 * Get incidents, optionally filtered.
 */
export async function getIncidents(filters?: IncidentFilters): Promise<Incident[]> {
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

  // Sort by last occurrence (most recent first)
  result.sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime())

  return result
}

/**
 * Get a single incident by ID.
 */
export async function getIncident(id: string): Promise<Incident> {
  await simulateDelay()

  const incident = incidents.find((inc) => inc.id === id)
  if (!incident) {
    throw new Error(`Incident not found: ${id}`)
  }

  return { ...incident }
}

/**
 * Update the status of an incident.
 */
export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident> {
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

  // Add timeline event for status change
  incidents[index].timeline.push({
    id: `tl_${generateId()}`,
    type: 'status_change',
    description: `Status changed from ${prevStatus} to ${status}`,
    timestamp: new Date().toISOString(),
    metadata: { from: prevStatus, to: status },
  })

  return { ...incidents[index] }
}

/**
 * Add a comment to an incident.
 */
export async function addComment(
  incidentId: string,
  content: string,
  userId = 'usr_01',
): Promise<Incident> {
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

  // Add timeline event
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

/**
 * Assign an incident to a team member.
 */
export async function assignIncident(
  incidentId: string,
  userId: string,
): Promise<Incident> {
  await simulateMutationDelay()

  const index = incidents.findIndex((inc) => inc.id === incidentId)
  if (index === -1) {
    throw new Error(`Incident not found: ${incidentId}`)
  }

  const member = teamMembers.find((m) => m.id === userId)
  if (!member) {
    throw new Error(`Team member not found: ${userId}`)
  }

  incidents[index] = {
    ...incidents[index],
    assignee: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.joinedAt,
    },
  }

  // Add timeline event
  incidents[index].timeline.push({
    id: `tl_${generateId()}`,
    type: 'assignment',
    description: `Assigned to ${member.name}`,
    timestamp: new Date().toISOString(),
    userId: member.id,
    userName: member.name,
  })

  return { ...incidents[index] }
}

export const incidentService = {
  getIncidents,
  getIncident,
  updateIncidentStatus,
  addComment,
  assignIncident,
}

export default incidentService
