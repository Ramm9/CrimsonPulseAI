import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { apiKeys } from '@/mock/data'
import type { ApiKey } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all API keys.
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  await simulateDelay()
  return [...apiKeys]
}

/**
 * Generate a new API key.
 * Returns the full key only on creation — subsequent reads show masked version.
 */
export async function generateApiKey(name: string): Promise<ApiKey & { fullKey: string }> {
  await simulateMutationDelay()

  const keyId = generateId()
  const fullKey = `cpk_live_${keyId}${generateId()}`
  const maskedKey = `cpk_live_****${keyId.slice(-4)}`

  const newKey: ApiKey = {
    id: `key_${generateId()}`,
    name,
    key: maskedKey,
    prefix: 'cpk_live',
    createdAt: new Date().toISOString(),
    status: 'active',
  }

  apiKeys.push(newKey)

  return { ...newKey, fullKey }
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(id: string): Promise<ApiKey> {
  await simulateMutationDelay()

  const index = apiKeys.findIndex((k) => k.id === id)
  if (index === -1) {
    throw new Error(`API key not found: ${id}`)
  }

  apiKeys[index] = {
    ...apiKeys[index],
    status: 'revoked',
  }

  return { ...apiKeys[index] }
}

interface IntegrationStatus {
  services: Array<{
    name: string
    status: 'connected' | 'disconnected' | 'error'
    lastSync?: string
    icon: string
  }>
  webhooks: {
    total: number
    active: number
    failed: number
  }
}

/**
 * Get the status of external integrations.
 */
export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  await simulateDelay()

  return {
    services: [
      {
        name: 'Slack',
        status: 'connected',
        lastSync: new Date().toISOString(),
        icon: 'MessageSquare',
      },
      {
        name: 'PagerDuty',
        status: 'connected',
        lastSync: new Date().toISOString(),
        icon: 'Bell',
      },
      {
        name: 'GitHub',
        status: 'connected',
        lastSync: new Date().toISOString(),
        icon: 'GitBranch',
      },
      {
        name: 'Datadog',
        status: 'disconnected',
        icon: 'BarChart3',
      },
      {
        name: 'Jira',
        status: 'error',
        lastSync: new Date(Date.now() - 3_600_000).toISOString(),
        icon: 'Ticket',
      },
    ],
    webhooks: {
      total: 12,
      active: 10,
      failed: 2,
    },
  }
}

export const integrationService = {
  getApiKeys,
  generateApiKey,
  revokeApiKey,
  getIntegrationStatus,
}

export default integrationService
