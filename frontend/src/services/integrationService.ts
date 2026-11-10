import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay } from '@/services/api'
import { apiKeys } from '@/mock/data'
import type { ApiKey } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get all API keys.
 * In live mode, requests real keys from Django backend and returns [] if none exist.
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    const res = await apiClient.get<ApiKey[]>('/keys/')
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
    return [...apiKeys]
  }

  return []
}

/**
 * Generate a new API key.
 * Returns the full key only on creation — subsequent reads show masked version.
 */
export async function generateApiKey(name: string): Promise<ApiKey & { fullKey: string }> {
  try {
    const res = await apiClient.post<ApiKey & { fullKey: string }>('/keys/', { name })
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to generate API key.')
    }
  }

  if (isDemoModeActive()) {
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

  throw new Error('Failed to generate API key.')
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(id: string): Promise<ApiKey> {
  try {
    const res = await apiClient.post<ApiKey>(`/keys/${id}/revoke/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to revoke API key.')
    }
  }

  if (isDemoModeActive()) {
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

  throw new Error('Failed to revoke API key.')
}

/**
 * Rotate an active API key: revokes the old key and provisions a fresh replacement.
 * Returns the full plaintext secret once.
 */
export async function rotateApiKey(
  id: string,
  name?: string,
): Promise<ApiKey & { fullKey: string; revokedKeyId: string }> {
  try {
    const res = await apiClient.post<ApiKey & { fullKey: string; revokedKeyId: string }>(
      `/keys/${id}/rotate/`,
      name ? { name } : {},
    )
    if (res.data && res.data.id) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to rotate API key.')
    }
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()

    const oldIndex = apiKeys.findIndex((k) => k.id === id)
    if (oldIndex !== -1) {
      apiKeys[oldIndex].status = 'revoked'
    }

    const keyId = generateId()
    const fullKey = `cpk_live_${keyId}${generateId()}`
    const maskedKey = `cpk_live_****${keyId.slice(-4)}`

    const newKey: ApiKey = {
      id: `key_${generateId()}`,
      name: name || (oldIndex !== -1 ? `${apiKeys[oldIndex].name} (Rotated)` : 'Rotated Key'),
      key: maskedKey,
      prefix: 'cpk_live',
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    apiKeys.push(newKey)
    return { ...newKey, fullKey, revokedKeyId: id }
  }

  throw new Error('Failed to rotate API key.')
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
  if (isDemoModeActive()) {
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

  return {
    services: [
      { name: 'Slack', status: 'disconnected', icon: 'MessageSquare' },
      { name: 'PagerDuty', status: 'disconnected', icon: 'Bell' },
      { name: 'GitHub', status: 'disconnected', icon: 'GitBranch' },
      { name: 'Datadog', status: 'disconnected', icon: 'BarChart3' },
      { name: 'Jira', status: 'disconnected', icon: 'Ticket' },
    ],
    webhooks: {
      total: 0,
      active: 0,
      failed: 0,
    },
  }
}

export const integrationService = {
  getApiKeys,
  generateApiKey,
  revokeApiKey,
  rotateApiKey,
  getIntegrationStatus,
}

export default integrationService
