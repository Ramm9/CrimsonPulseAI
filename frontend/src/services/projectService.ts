import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay, notifyDemoMutation } from '@/services/api'
import { projects } from '@/mock/data'
import type { Project } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all projects.
 * In live mode, requests real projects from Django backend and returns [] if none exist.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const res = await apiClient.get<Project[]>('/projects/')
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
    return [...projects]
  }

  return []
}

/**
 * Get a single project by ID or slug.
 */
export async function getProject(id: string): Promise<Project> {
  try {
    const res = await apiClient.get<Project>(`/projects/${id}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || `Project not found: ${id}`)
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const normalized = id.toLowerCase().replace(/[-_]/g, '')
    const project = projects.find(
      (p) =>
        p.id === id ||
        p.slug === id ||
        p.id.toLowerCase().replace(/[-_]/g, '') === normalized ||
        p.slug.toLowerCase().replace(/[-_]/g, '') === normalized,
    )
    if (!project) {
      throw new Error(`Project not found: ${id}`)
    }

    return { ...project }
  }

  throw new Error(`Project not found: ${id}`)
}

/**
 * Create a new project.
 */
export async function createProject(
  data: Pick<Project, 'name' | 'description' | 'environment' | 'baseUrl'>,
): Promise<Project> {
  try {
    const res = await apiClient.post<Project>('/projects/', {
      name: data.name,
      description: data.description,
      environment: data.environment,
      baseUrl: data.baseUrl,
    })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || err.response?.data?.detail || 'Failed to create project.')
    }
    // Fallback to mock creation
    notifyDemoMutation('Create Project', 'Simulated project locally. Connect Django backend to persist.')
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const newProject: Project = {
      id: `proj_${generateId()}`,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: data.description,
      environment: data.environment,
      baseUrl: data.baseUrl,
      endpointCount: 0,
      totalRequests: 0,
      errorRate: 0,
      health: 'unknown',
      apiKey: `cpk_${data.environment === 'production' ? 'live' : 'stg'}_****${generateId().slice(0, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    projects.push(newProject)
    return { ...newProject }
  }

  throw new Error('Failed to create project.')
}

/**
 * Update an existing project.
 */
export async function updateProject(
  id: string,
  data: Partial<Pick<Project, 'name' | 'description' | 'environment' | 'baseUrl'>>,
): Promise<Project> {
  try {
    const res = await apiClient.patch<Project>(`/projects/${id}/`, data)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || err.response?.data?.detail || 'Failed to update project.')
    }
    notifyDemoMutation('Update Project', 'Updated project in demo state.')
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = projects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project not found: ${id}`)
    }

    const updated: Project = {
      ...projects[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    if (data.name) {
      updated.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }

    projects[index] = updated
    return { ...updated }
  }

  throw new Error('Failed to update project.')
}

/**
 * Delete a project by ID.
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    await apiClient.delete(`/projects/${id}/`)
    return
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || err.response?.data?.detail || 'Failed to delete project.')
    }
    notifyDemoMutation('Delete Project', 'Project removed from demo state.')
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const index = projects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project not found: ${id}`)
    }

    projects.splice(index, 1)
  }
}

/**
 * Retrieve API keys for a specific project.
 */
export async function getProjectKeys(projectId: string): Promise<any[]> {
  try {
    const res = await apiClient.get<any[]>(`/projects/${projectId}/keys/`)
    if (Array.isArray(res.data)) {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return []
    }
  }

  return []
}

/**
 * Rotate an active API key for a project.
 * Returns the newly provisioned key with fullKey secret once.
 */
export async function rotateProjectKey(
  projectId: string,
  keyId: string,
): Promise<{ id: string; key: string; fullKey: string; status: string }> {
  try {
    const res = await apiClient.post<{ id: string; key: string; fullKey: string; status: string }>(
      `/projects/${projectId}/keys/${keyId}/rotate/`,
    )
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to rotate project key.')
    }
  }

  throw new Error('Failed to rotate project key.')
}

export const projectService = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectKeys,
  rotateProjectKey,
}

export default projectService
