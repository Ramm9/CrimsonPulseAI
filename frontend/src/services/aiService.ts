import { apiClient, isDemoModeActive, simulateDelay } from '@/services/api'
import { aiInvestigations } from '@/mock/data'
import type { AIInvestigation, AIMessage } from '@/types'
import { generateId } from '@/utils/helpers'

/**
 * Get the AI investigation for a specific incident.
 * Returns null if no investigation exists yet.
 */
export async function getInvestigation(incidentId: string): Promise<AIInvestigation | null> {
  try {
    const res = await apiClient.get<AIInvestigation>(`/ai/investigations/${incidentId}/`)
    if (res.data && res.data.id) {
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      return null
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay()
    const investigation = aiInvestigations.find((inv) => inv.incidentId === incidentId)
    return investigation ? { ...investigation } : null
  }

  return null
}

const aiResponses: Record<string, string[]> = {
  default: [
    `Based on the telemetry data I've analyzed, here are the key findings:\n\n1. **Correlation detected** between the current anomaly and recent deployment activity\n2. **Pattern match** with 3 similar incidents in the last 90 days — all involved resource pool exhaustion\n3. **No upstream dependency failures** detected in the last 24 hours\n\nWould you like me to drill deeper into any of these areas?`,
    `I've cross-referenced the error logs with the deployment timeline:\n\n- The error pattern started **within 10 minutes** of the last deployment\n- Error distribution is **not uniform** — it's concentrated on specific endpoint paths\n- Resource utilization metrics show a **gradual increase** rather than a sudden spike, suggesting a leak-type issue\n\nRecommended next steps:\n1. Check connection pool utilization metrics\n2. Review the deployment changelog for database-related changes\n3. Monitor memory allocation trends`,
    `Looking at the broader system context:\n\n| Metric | Before | After | Delta |\n|---|---|---|---|\n| Avg Response Time | 85ms | 340ms | +300% |\n| Error Rate | 0.3% | 1.8% | +500% |\n| Active Connections | 12/50 | 48/50 | +300% |\n| Memory Usage | 62% | 84% | +35% |\n\nThe connection pool saturation is the most likely bottleneck. The memory increase is secondary — likely caused by request queuing due to slow database responses.`,
    `I've identified a potential root cause:\n\n**Hypothesis:** A recent code change introduced a query that holds database connections longer than expected, causing pool exhaustion under load.\n\n**Evidence:**\n- Connection hold time increased from ~60ms to ~8,000ms\n- The change correlates with deploy timestamp\n- Similar pattern seen in incident #INC-847 (resolved 45 days ago)\n\n**Confidence level:** 87%\n\nShall I generate a detailed remediation plan?`,
  ],
}

/**
 * Send a message to the AI investigation and receive a response.
 */
export async function sendMessage(
  investigationId: string,
  message: string,
): Promise<AIMessage> {
  try {
    const res = await apiClient.post<AIMessage>(`/ai/investigations/${investigationId}/messages/`, {
      message,
    })
    if (res.data && res.data.content) {
      return res.data
    }
  } catch (err: any) {
    if (!isDemoModeActive()) {
      throw new Error(err.response?.data?.message || 'Failed to send message to AI Investigator.')
    }
  }

  if (isDemoModeActive()) {
    await simulateDelay(1000, 2000)

    const investigation = aiInvestigations.find((inv) => inv.id === investigationId)

    const userMessage: AIMessage = {
      id: `msg_${generateId()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    if (investigation) {
      investigation.messages.push(userMessage)
    }

    const responses = aiResponses.default
    const responseContent = responses[Math.floor(Math.random() * responses.length)]

    const aiMessage: AIMessage = {
      id: `msg_${generateId()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
    }

    if (investigation) {
      investigation.messages.push(aiMessage)
    }

    return aiMessage
  }

  throw new Error('Failed to send message to AI Investigator.')
}

/**
 * Get suggested follow-up questions for an AI investigation.
 */
export async function getSuggestedQuestions(): Promise<string[]> {
  try {
    const res = await apiClient.get<string[]>('/ai/suggested-questions/')
    if (Array.isArray(res.data)) {
      return res.data
    }
  } catch {
    // If endpoint doesn't exist, provide standard suggested questions
  }

  return [
    'What was the root cause of this incident?',
    'Which deployment triggered this issue?',
    'Are there any related anomalies across other endpoints?',
    'What is the estimated blast radius?',
    'Show me the connection pool metrics over time',
    'Were there similar incidents in the past 90 days?',
    'What remediation steps do you recommend?',
    'Is this affecting any downstream services?',
  ]
}

export const aiService = {
  getInvestigation,
  sendMessage,
  getSuggestedQuestions,
}

export default aiService
