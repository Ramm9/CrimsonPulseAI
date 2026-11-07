import axios from 'axios'

/**
 * Base Axios instance for CrimsonPulse API.
 * In mock mode, requests are intercepted by service functions.
 * Replace baseURL with production API when ready.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.crimsonpulse.io/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// Response interceptor — handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cp_auth_token')
      // Could dispatch a logout event here
    }
    return Promise.reject(error)
  },
)

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
