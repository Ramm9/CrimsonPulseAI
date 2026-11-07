import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { projects } from '@/mock/data'
import type { Project } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all projects.
 */
export async function getProjects(): Promise<Project[]> {
  await simulateDelay()
  return [...projects]
}

/**
 * Get a single project by ID.
 */
export async function getProject(id: string): Promise<Project> {
  await simulateDelay()

  const project = projects.find((p) => p.id === id)
  if (!project) {
    throw new Error(`Project not found: ${id}`)
  }

  return { ...project }
}

/**
 * Create a new project.
 */
export async function createProject(
  data: Pick<Project, 'name' | 'description' | 'environment' | 'baseUrl'>,
): Promise<Project> {
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

/**
 * Update an existing project.
 */
export async function updateProject(
  id: string,
  data: Partial<Pick<Project, 'name' | 'description' | 'environment' | 'baseUrl'>>,
): Promise<Project> {
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

/**
 * Delete a project by ID.
 */
export async function deleteProject(id: string): Promise<void> {
  await simulateMutationDelay()

  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) {
    throw new Error(`Project not found: ${id}`)
  }

  projects.splice(index, 1)
}

export const projectService = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
}

export default projectService
