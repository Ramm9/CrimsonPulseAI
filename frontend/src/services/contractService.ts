import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay, notifyDemoMutation } from '@/services/api'
import { contractSpecs, contractViolations } from '@/mock/data'
import type { ContractSpec, ContractViolation } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all contract specifications.
 * In live mode, requests real specs from Django backend and returns [] if none exist.
 */
export async function getSpecs(projectId?: string): Promise<ContractSpec[]> {
  try {
    const params: Record<string, string> = {}
    if (projectId) params.projectId = projectId
    const res = await apiClient.get<ContractSpec[]>('/contracts/specs/', { params })
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
    let result = [...contractSpecs]
    if (projectId) {
      result = result.filter((s) => s.projectId === projectId || s.projectId.replace('proj_', 'proj-') === projectId)
    }
    return result
  }

  return []
}

/**
 * Get a single contract spec by ID.
 */
export async function getSpec(id: string): Promise<ContractSpec> {
  try {
    const res = await apiClient.get<ContractSpec>(`/contracts/specs/${id}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || `Contract spec not found: ${id}`)
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()

    const spec = contractSpecs.find((s) => s.id === id)
    if (!spec) {
      throw new Error(`Contract spec not found: ${id}`)
    }

    return { ...spec }
  }

  throw new Error(`Contract spec not found: ${id}`)
}

/**
 * Get contract violations, optionally filtered by spec ID.
 */
export async function getViolations(specId?: string): Promise<ContractViolation[]> {
  try {
    const res = await apiClient.get<ContractViolation[]>('/contracts/violations/', {
      params: specId ? { specId } : {},
    })
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

    let result = [...contractViolations]

    if (specId) {
      result = result.filter((v) => v.specId === specId)
    }

    result.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    return result
  }

  return []
}

/**
 * Upload a new contract specification.
 */
export async function uploadSpec(data: {
  projectId?: string
  name: string
  version: string
  file?: File
}): Promise<ContractSpec> {
  try {
    let payload: any = {
      projectId: data.projectId,
      name: data.name,
      version: data.version,
    }

    if (data.file) {
      const formData = new FormData()
      formData.append('projectId', data.projectId || '')
      formData.append('name', data.name)
      formData.append('version', data.version)
      formData.append('file', data.file)
      payload = formData
    }

    const res = await apiClient.post<ContractSpec>('/contracts/specs/', payload)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to upload contract specification.')
    }
    notifyDemoMutation('Upload OpenAPI Spec', 'Uploaded spec locally in demo mode.')
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()
    await simulateDelay(500, 1200)

    const newSpec: ContractSpec = {
      id: `spec_${generateId()}`,
      projectId: data.projectId || 'proj_nexus',
      name: data.name,
      version: data.version,
      uploadedAt: new Date().toISOString(),
      endpointCount: Math.floor(Math.random() * 8) + 2,
      status: 'pending',
    }

    contractSpecs.push(newSpec)

    setTimeout(() => {
      const index = contractSpecs.findIndex((s) => s.id === newSpec.id)
      if (index !== -1) {
        contractSpecs[index] = {
          ...contractSpecs[index],
          status: Math.random() > 0.5 ? 'valid' : 'violations_found',
        }
      }
    }, 3000)

    return { ...newSpec }
  }

  throw new Error('Failed to upload contract specification.')
}

export const contractService = {
  getSpecs,
  getSpec,
  getViolations,
  uploadSpec,
}

export default contractService
