import axios from 'axios'
import { useAppStore } from '@/store/appStore'

/**
 * Base Axios instance for CrimsonPulse API.
 * In mock mode, requests are intercepted by service functions.
 * Replace baseURL with production API when ready.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Returns true only if explicitly configured for demo/mock mode.
 * Defaults to false (live backend mode).
 */
export function isDemoModeActive(): boolean {
  return import.meta.env.VITE_DATA_MODE === 'demo'
}

// Request interceptor — attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cp_auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — handle common errors & connection tracking
apiClient.interceptors.response.use(
  (response) => {
    // If backend replied with valid response, backend is connected
    useAppStore.getState().setBackendConnected(true)
    return response
  },
  (error) => {
    // Detect network / connection refusal
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      useAppStore.getState().setBackendConnected(false)
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('cp_auth_token')
      // Could dispatch a logout event here
    }
    return Promise.reject(error)
  },
)

/**
 * Actively probe backend health to maintain accurate connection status.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  try {
    const probe = axios.create({ baseURL, timeout: 2500 })
    const res = await probe.get('/health/')
    if (res.status === 200) {
      useAppStore.getState().setBackendConnected(true)
      return true
    }
  } catch {
    useAppStore.getState().setBackendConnected(false)
  }
  return false
}

/**
 * Inform user when a state mutation occurs while offline/in demo mode,
 * preventing silent illusion of PostgreSQL database persistence.
 */
export function notifyDemoMutation(operation: string, details?: string): void {
  const isOnline = useAppStore.getState().backendConnected
  if (!isOnline) {
    useAppStore.getState().addToast({
      type: 'warning',
      title: `[Demo Mode] ${operation} Simulated`,
      message: details || 'Backend is currently offline. This action was simulated in local memory and not committed to PostgreSQL.',
    })
  }
}

/**
 * Simulates network delay to mimic real API calls.
 * Returns a promise that resolves after 300-800ms.
 */
export function simulateDelay(minMs = 300, maxMs = 800): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs)
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Simulates a short delay for mutations (150-400ms).
 */
export function simulateMutationDelay(): Promise<void> {
  return simulateDelay(150, 400)
}
