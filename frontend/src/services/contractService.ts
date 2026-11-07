import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { contractSpecs, contractViolations } from '@/mock/data'
import type { ContractSpec, ContractViolation } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all contract specifications.
 */
export async function getSpecs(): Promise<ContractSpec[]> {
  await simulateDelay()
  return [...contractSpecs]
}

/**
 * Get a single contract spec by ID.
 */
export async function getSpec(id: string): Promise<ContractSpec> {
  await simulateDelay()

  const spec = contractSpecs.find((s) => s.id === id)
  if (!spec) {
    throw new Error(`Contract spec not found: ${id}`)
  }

  return { ...spec }
}

/**
 * Get contract violations, optionally filtered by spec ID.
 */
export async function getViolations(specId?: string): Promise<ContractViolation[]> {
  await simulateDelay()

  let result = [...contractViolations]

  if (specId) {
    result = result.filter((v) => v.specId === specId)
  }

  // Sort by detection time (most recent first)
  result.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

  return result
}

/**
 * Upload a new contract specification.
 * In mock mode, simulates the upload and validation process.
 */
export async function uploadSpec(data: {
  projectId?: string
  name: string
  version: string
  file?: File
}): Promise<ContractSpec> {
  await simulateMutationDelay()
  // Simulate additional processing time for spec validation
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

  // Simulate async validation completing
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

export const contractService = {
  getSpecs,
  getSpec,
  getViolations,
  uploadSpec,
}

export default contractService
